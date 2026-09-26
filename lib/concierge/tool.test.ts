import { describe, expect, it, vi } from "vitest";
import type { SubmitResult } from "../inquiry/submit";
import { runSendInquiry, sendInquiryTool } from "./tool";

const sessionId = "0b7a7a4e-3c2f-4d1e-9a58-6f2b8c1d9e10";
const input = {
  name: "Mai",
  email: "mai@example.com",
  phone: null,
  preferred_contact: "email",
  check_in: "2026-10-03",
  check_out: "2026-10-05",
  guests: 1,
  bed_preference: null,
  message: "Is there a bed from the 3rd to the 5th?",
  conversation_summary: "Asks about a bed for two nights from 3 October.",
};

const submitting = (result: SubmitResult) => vi.fn(async (payload: unknown) => (void payload, result));

describe("send_inquiry tool definition", () => {
  it("mirrors the contract minus what the server sets", () => {
    const properties = Object.keys((sendInquiryTool.input_schema as { properties: object }).properties);
    expect(properties).toEqual([
      "name",
      "email",
      "phone",
      "preferred_contact",
      "check_in",
      "check_out",
      "guests",
      "bed_preference",
      "message",
      "conversation_summary",
    ]);
    expect(properties).not.toContain("client_ref");
    expect(properties).not.toContain("source");
    expect(properties).not.toContain("consent");
    expect(sendInquiryTool.eager_input_streaming).toBe(true);
  });
});

describe("send_inquiry gating", () => {
  it("sends nothing until the guest has ticked the privacy box", async () => {
    const submit = submitting({ ok: true, id: "b1", duplicate: false });
    const outcome = await runSendInquiry(input, { consent: false, sessionId, submit });
    expect(outcome).toMatchObject({ isError: true, event: "consent_required" });
    expect(outcome.content).toMatch(/^consent_required/);
    expect(submit).not.toHaveBeenCalled();
  });

  it("rejects invalid input before checking anything else", async () => {
    const submit = submitting({ ok: true, id: "b1", duplicate: false });
    const outcome = await runSendInquiry({ ...input, email: null, phone: null }, { consent: true, sessionId, submit });
    expect(outcome).toMatchObject({ isError: true, event: null });
    expect(outcome.content).toContain("invalid_input");
    expect(submit).not.toHaveBeenCalled();
  });

  it("ignores any attempt to set the reference, source or consent itself", async () => {
    const submit = submitting({ ok: true, id: "b1", duplicate: false });
    const outcome = await runSendInquiry({ ...input, consent: true, source: "website_form" }, { consent: false, sessionId, submit });
    expect(outcome.isError).toBe(true);
    expect(submit).not.toHaveBeenCalled();
  });

  it("with consent, sends the contract payload with the conversation as the reference", async () => {
    const submit = submitting({ ok: true, id: "b1", duplicate: false });
    const outcome = await runSendInquiry(input, { consent: true, sessionId, submit });
    expect(outcome).toMatchObject({ isError: false, event: "inquiry_sent" });
    expect(submit).toHaveBeenCalledWith({
      ...input,
      client_ref: sessionId,
      source: "website_concierge",
      consent: true,
    });
  });

  it("tells the model when the inquiry was already sent", async () => {
    const outcome = await runSendInquiry(input, {
      consent: true,
      sessionId,
      submit: submitting({ ok: true, id: "b1", duplicate: true }),
    });
    expect(outcome.content).toMatch(/^already_sent/);
  });

  it("reports failures so the guest gets the contact details instead", async () => {
    const outcome = await runSendInquiry(input, {
      consent: true,
      sessionId,
      submit: submitting({ ok: false, error: "unavailable" }),
    });
    expect(outcome).toMatchObject({ isError: true, event: "inquiry_failed" });
  });
});
