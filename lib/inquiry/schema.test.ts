import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  buildPayload,
  dateWindow,
  inquiryFormSchema,
  inquiryPayloadSchema,
  prepareInquiryInputSchema,
  toFieldIssues,
} from "./schema";

const ref = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const form = {
  client_ref: ref,
  name: "  Mai  ",
  email: "mai@example.com",
  message: "Do you have a bed on the 3rd?",
  consent: true,
};

function issues(input: unknown) {
  const result = inquiryFormSchema.safeParse(input);
  return result.success ? [] : toFieldIssues(result.error);
}

// The date window moves with the clock: pin it.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-26T03:00:00Z") });
});
afterAll(() => {
  vi.useRealTimers();
});

describe("inquiry form validation", () => {
  it("accepts a minimal inquiry, trims text and fills optional fields with null", () => {
    const result = inquiryFormSchema.parse(form);
    expect(result).toEqual({
      ...form,
      name: "Mai",
      phone: null,
      preferred_contact: null,
      check_in: null,
      check_out: null,
      guests: null,
      bed_preference: null,
    });
  });

  it("accepts a WhatsApp number instead of an email", () => {
    expect(issues({ ...form, email: "", phone: "+856 20 1234 5678" })).toEqual([]);
  });

  it("needs an email or a phone number", () => {
    expect(issues({ ...form, email: "  ", phone: null })).toEqual([
      { field: "email", message: "Please give us an email address or a WhatsApp or phone number." },
    ]);
  });

  it("checks the email address and phone length", () => {
    expect(issues({ ...form, email: "mai@" })).toEqual([{ field: "email", message: "Please check your email address." }]);
    expect(issues({ ...form, phone: "123" })).toEqual([{ field: "phone", message: "Please check your phone number." }]);
  });

  it("needs check-out after check-in", () => {
    expect(issues({ ...form, check_in: "2026-10-05", check_out: "2026-10-05" })).toEqual([
      { field: "check_out", message: "Check-out must be after check-in." },
    ]);
    expect(issues({ ...form, check_in: "2026-10-05", check_out: "2026-10-07" })).toEqual([]);
  });

  it("rejects dates that do not exist", () => {
    expect(issues({ ...form, check_in: "2026-02-30" })).toEqual([{ field: "check_in", message: "Please use a real date." }]);
  });

  it("keeps guests to a whole number from 1 to 20", () => {
    expect(issues({ ...form, guests: 0 })).toEqual([{ field: "guests", message: "At least one guest." }]);
    expect(issues({ ...form, guests: 21 })).toEqual([{ field: "guests", message: "For more than 20 guests, write to us." }]);
    expect(issues({ ...form, guests: 2.5 })).toEqual([{ field: "guests", message: "Please enter a whole number of guests." }]);
    expect(issues({ ...form, guests: 3 })).toEqual([]);
  });

  it("requires the privacy consent", () => {
    expect(issues({ ...form, consent: false })).toEqual([
      { field: "consent", message: "Please agree to the privacy notice so we can reply." },
    ]);
  });

  it("rejects unknown keys and a missing reference", () => {
    expect(inquiryFormSchema.safeParse({ ...form, source: "website_form" }).success).toBe(false);
    expect(inquiryFormSchema.safeParse({ ...form, client_ref: "not-a-uuid" }).success).toBe(false);
  });
});

describe("the contract payload", () => {
  it("builds every key, in contract form", () => {
    const payload = buildPayload(inquiryFormSchema.parse(form), { client_ref: ref, source: "website_form" });
    expect(Object.keys(payload).sort()).toEqual(
      [
        "bed_preference",
        "check_in",
        "check_out",
        "client_ref",
        "consent",
        "conversation_summary",
        "email",
        "guests",
        "message",
        "name",
        "phone",
        "preferred_contact",
        "source",
      ].sort(),
    );
    expect(payload.consent).toBe(true);
    expect(payload.conversation_summary).toBeNull();
    expect(inquiryPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("only allows the two website sources and literal consent", () => {
    const payload = buildPayload(inquiryFormSchema.parse(form), { client_ref: ref, source: "website_form" });
    expect(inquiryPayloadSchema.safeParse({ ...payload, source: "email" }).success).toBe(false);
    expect(inquiryPayloadSchema.safeParse({ ...payload, consent: "yes" }).success).toBe(false);
  });

  it("does not let the concierge tool set the reference, source or consent", () => {
    const input = { name: "Mai", email: "mai@example.com", message: "Airport pickup?" };
    expect(prepareInquiryInputSchema.safeParse(input).success).toBe(true);
    for (const extra of [{ client_ref: ref }, { source: "website_form" }, { consent: true }]) {
      expect(prepareInquiryInputSchema.safeParse({ ...input, ...extra }).success).toBe(false);
    }
  });
});

describe("inquiry dates (R4-16)", () => {
  const form = {
    client_ref: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    name: "Mai",
    email: "mai@example.com",
    message: "A bed?",
    consent: true,
  };
  const problems = (dates: object) =>
    toFieldIssues(inquiryFormSchema.safeParse({ ...form, ...dates }).error ?? new z.ZodError([]));

  it("accepts yesterday in Vientiane (for guests a day behind) up to two years ahead", () => {
    expect(dateWindow()).toEqual({ earliest: "2026-09-25", latest: "2028-09-25" });
    expect(problems({ check_in: "2026-09-25", check_out: "2028-09-25" })).toEqual([]);
  });

  it("refuses dates in the past or far in the future, from the form, Shadow's tool and the payload", () => {
    expect(problems({ check_in: "2001-01-01", check_out: "2001-01-02" })).toEqual([
      { field: "check_in", message: "Please choose a date from today onwards." },
      { field: "check_out", message: "Please choose a date from today onwards." },
    ]);
    expect(problems({ check_in: "9999-12-30" })).toEqual([
      { field: "check_in", message: "Please choose a date within the next two years." },
    ]);
    const input = { name: "Mai", email: "mai@example.com", message: "A bed?" };
    expect(prepareInquiryInputSchema.safeParse({ ...input, check_in: "2025-10-03" }).success).toBe(false);
    const payload = buildPayload(inquiryFormSchema.parse(form), { client_ref: form.client_ref, source: "website_form" });
    expect(inquiryPayloadSchema.safeParse({ ...payload, check_out: "2030-01-01" }).success).toBe(false);
  });
});
