import { describe, expect, it } from "vitest";
import {
  guestText,
  parseBookingRequest,
  readAvailability,
  readConfirmation,
  readPriceChange,
  refusedIssues,
  refusedOnlyTheBody,
  withoutQuote,
} from "./contract";

const NOW = Date.UTC(2026, 8, 26, 5);
const query = { check_in: "2026-10-03", check_out: "2026-10-05", guests: 2 };

/** The contract's own example (BUILD_PROGRAM.md, "Booking API contract"), with a real UUID for "uuid". */
const example = {
  property: { name: "House of Jars", timezone: "Asia/Vientiane" },
  check_in: "2026-10-03",
  check_out: "2026-10-05",
  nights: 2,
  guests: 2,
  mode: "request",
  hold_hours: 24,
  limits: { max_guests: 6, min_nights: 1, max_nights: 30, window_days: 365 },
  room_types: [
    {
      id: "5b0c3a0e-2f7e-4c55-9a55-1f6f3c1d2a01",
      name: "Mixed dorm",
      kind: "mixed_dorm",
      description: "string or null",
      features: ["Curtained pod beds", "Reading light", "Locker"],
      free_each_night: [
        { date: "2026-10-03", free: 5 },
        { date: "2026-10-04", free: 4 },
      ],
      min_free: 4,
      bookable: true,
      price: null,
    },
  ],
};

describe("Shadow's availability", () => {
  it("reads the contract's example, keeping what the page needs", () => {
    const availability = readAvailability(example, query);
    expect(availability).not.toBeNull();
    expect(availability).not.toHaveProperty("property");
    expect(availability?.room_types[0]).toMatchObject({ kind: "mixed_dorm", min_free: 4, price: null });
  });

  it("reads a price as the contract writes it", () => {
    const price = {
      currency: "LAK",
      per_guest_per_night: [
        { date: "2026-10-03", amount: 90000 },
        { date: "2026-10-04", amount: 90000 },
      ],
      total: 360000,
    };
    const withPrice = { ...example, room_types: [{ ...example.room_types[0], price }] };
    expect(readAvailability(withPrice, query)?.room_types[0]?.price).toEqual(price);
    const euros = { ...example, room_types: [{ ...example.room_types[0], price: { ...price, currency: "EUR" } }] };
    expect(readAvailability(euros, query)).toBeNull();
  });

  it("tolerates what a newer Shadow might add, and promises less when unsure", () => {
    const newer = {
      ...example,
      mode: "waitlist",
      extra: true,
      room_types: [{ ...example.room_types[0], kind: "capsule", badge: "new", features: [" Locker ", ""] }],
    };
    const availability = readAvailability(newer, query);
    expect(availability?.mode).toBe("request");
    expect(availability?.room_types[0]).toMatchObject({ kind: null, features: ["Locker"] });
    expect(readAvailability({ ...example, mode: "instant" }, query)?.mode).toBe("instant");
    expect(readAvailability({ ...example, hold_hours: null }, query)?.hold_hours).toBeNull();
  });

  it("trusts no answer about other dates or guests than asked", () => {
    expect(readAvailability(example, { ...query, guests: 3 })).toBeNull();
    expect(readAvailability({ ...example, nights: 3 }, query)).toBeNull();
    expect(readAvailability({ ...example, room_types: [{ ...example.room_types[0], id: "uuid" }] }, query)).toBeNull();
    expect(readAvailability(null, query)).toBeNull();
  });
});

describe("the booking request body", () => {
  const body = {
    client_ref: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    room_type_id: "5b0c3a0e-2f7e-4c55-9a55-1f6f3c1d2a01",
    check_in: "2026-10-03",
    check_out: "2026-10-05",
    guests: 2,
    name: " Mai ",
    email: "",
    phone: " +856 20 1234 5678 ",
    preferred_contact: "whatsapp",
    arrival_time: "",
    message: "  ",
    consent: true,
  };

  it("trims strings and sends every key, empty ones as null, in the contract's order", () => {
    const parsed = parseBookingRequest(body, NOW);
    expect(parsed.ok && parsed.request).toEqual({
      ...body,
      name: "Mai",
      email: null,
      phone: "+856 20 1234 5678",
      arrival_time: null,
      message: null,
    });
    expect(parsed.ok && Object.keys(parsed.request)).toEqual(Object.keys(body));
    // Missing optional keys are sent as null too.
    const optionalKeys = ["email", "arrival_time", "message", "preferred_contact"];
    const required = Object.fromEntries(Object.entries(body).filter(([key]) => !optionalKeys.includes(key)));
    const minimal = parseBookingRequest(required, NOW);
    expect(minimal.ok && minimal.request).toMatchObject({ email: null, arrival_time: null, message: null, preferred_contact: null });
  });

  it("is strict: unknown keys and a price from the browser are refused", () => {
    const parsed = parseBookingRequest({ ...body, total: 1 }, NOW);
    expect(parsed.ok).toBe(false);
  });

  it("carries the total the guest saw after the contract's keys, and only when the page sent one (F1W-03)", () => {
    const quoted = parseBookingRequest({ ...body, quoted_total: 360_000, quoted_currency: "LAK" }, NOW);
    expect(quoted.ok && Object.keys(quoted.request).slice(-3)).toEqual(["consent", "quoted_total", "quoted_currency"]);
    const unpriced = parseBookingRequest({ ...body, quoted_total: null, quoted_currency: null }, NOW);
    expect(unpriced.ok && unpriced.request).toMatchObject({ quoted_total: null, quoted_currency: null });
    const older = parseBookingRequest(body, NOW);
    expect(older.ok && older.request).not.toHaveProperty("quoted_total");
    expect(quoted.ok && Object.keys(withoutQuote(quoted.request))).toEqual(Object.keys(body));
  });

  it("needs an email or a phone number, a real time, and consent", () => {
    const issues = (change: Record<string, unknown>) => {
      const parsed = parseBookingRequest({ ...body, ...change }, NOW);
      return parsed.ok ? [] : parsed.issues.map((issue) => issue.field);
    };
    expect(issues({ phone: null })).toEqual(["email"]);
    expect(issues({ arrival_time: "24:00" })).toEqual(["arrival_time"]);
    expect(issues({ arrival_time: "9:30" })).toEqual(["arrival_time"]);
    expect(issues({ consent: "yes" })).toEqual(["consent"]);
    expect(issues({ message: "x".repeat(2001) })).toEqual(["message"]);
    expect(issues({ name: "x".repeat(121) })).toEqual(["name"]);
    expect(issues({ guests: 1.5 })).toEqual(["guests"]);
  });

  it("checks the dates against today in Vientiane", () => {
    // 23:30 in Vientiane on the 26th is still 16:30 UTC on the 26th; at 00:30 on the 27th, the 26th has passed.
    const lateEvening = Date.UTC(2026, 8, 26, 16, 30);
    const afterMidnight = Date.UTC(2026, 8, 26, 17, 30);
    const tonight = { ...body, check_in: "2026-09-26", check_out: "2026-09-27" };
    expect(parseBookingRequest(tonight, lateEvening).ok).toBe(true);
    const past = parseBookingRequest(tonight, afterMidnight);
    expect(past.ok ? [] : past.issues).toEqual([{ field: "check_in", message: guestText.fromToday }]);
  });
});

describe("Shadow's answer to a booking request", () => {
  const created = {
    id: "0e5c8b7a-1d2f-4a3b-9c8d-7e6f5a4b3c2d",
    reference: "HOJ-7K3M9Q",
    status: "pending",
    hold_expires_at: "2026-09-27T05:00:00.000Z",
    total: 360000,
    currency: "LAK",
  };

  it("keeps what the guest needs, not Shadow's own id", () => {
    expect(readConfirmation(created)).toEqual({
      reference: "HOJ-7K3M9Q",
      status: "pending",
      hold_expires_at: "2026-09-27T05:00:00.000Z",
      total: 360000,
      currency: "LAK",
    });
    expect(readConfirmation({ ...created, status: "confirmed", hold_expires_at: null, total: null, currency: null })).toMatchObject({
      status: "confirmed",
      total: null,
    });
  });

  it("refuses anything that doesn't fit the contract", () => {
    expect(readConfirmation({ ...created, reference: "7K3M9Q" })).toBeNull();
    expect(readConfirmation({ ...created, status: "maybe" })).toBeNull();
    expect(readConfirmation({ ...created, hold_expires_at: "tomorrow" })).toBeNull();
    expect(readConfirmation({ ...created, currency: "THB" })).toBeNull();
  });
});

describe("Shadow's 400, in the guest's words", () => {
  it("names each field once, with the website's own wording", () => {
    expect(
      refusedIssues({
        error: "invalid_request",
        issues: [
          { field: "check_out", message: "check_out must be within 365 days" },
          { field: "check_out", message: "nights > max_nights" },
          { field: "guests", message: "guests > max_guests" },
        ],
      }),
    ).toEqual([
      { field: "check_out", message: guestText.datesRefused },
      { field: "guests", message: guestText.guestsRefused },
    ]);
  });

  it("falls back to a general line when nothing can be placed", () => {
    expect(refusedIssues({ issues: [{ field: "body", message: "?" }] })).toEqual([{ field: "form", message: guestText.checkForm }]);
    expect(refusedIssues("not json")).toEqual([{ field: "form", message: guestText.checkForm }]);
  });

  it("tells a refusal of the body as a whole (keys an older Shadow doesn't know) from one about the booking", () => {
    // How Shadow Check-in's strict schema reports unknown keys (lib/inquiries/contract.ts toIssues: a path of [] is "body").
    const unknownKeys = { error: "invalid_request", issues: [{ field: "body", message: 'Unrecognized keys: "quoted_total", "quoted_currency"' }] };
    expect(refusedOnlyTheBody(unknownKeys)).toBe(true);
    expect(refusedOnlyTheBody({ issues: [{ field: "", message: "Unrecognized key" }] })).toBe(true);
    expect(refusedOnlyTheBody({ issues: [{ field: "body", message: "?" }, { field: "guests", message: "too many" }] })).toBe(false);
    expect(refusedOnlyTheBody({ issues: [{ field: "client_ref", message: "Must be a UUID." }] })).toBe(false);
    // Nothing to go on is not a refusal of the body.
    expect(refusedOnlyTheBody({ issues: [] })).toBe(false);
    expect(refusedOnlyTheBody("not json")).toBe(false);
  });

  it("never takes Shadow's issue on the quote itself for a refusal of the body", () => {
    // Shadow Check-in with the price protection reports a bad quote on its own field.
    expect(refusedOnlyTheBody({ issues: [{ field: "quoted_total", message: "Must be 0 or more." }] })).toBe(false);
    expect(refusedOnlyTheBody({ issues: [{ field: "quoted_currency", message: "Invalid option." }] })).toBe(false);
    expect(refusedOnlyTheBody({ issues: [{ field: "body", message: "?" }, { field: "quoted_total", message: "?" }] })).toBe(false);
    // The guest reads the general line: nothing in their booking to point at.
    expect(refusedIssues({ issues: [{ field: "quoted_currency", message: "Invalid option." }] })).toEqual([
      { field: "form", message: guestText.checkForm },
    ]);
  });
});

describe("Shadow's 409", () => {
  it("reads a price change with the total Shadow would book at now (F1W-03)", () => {
    expect(readPriceChange({ error: "price_changed", total: 600_000, currency: "LAK" })).toEqual({
      changed: true,
      quote: { total: 600_000, currency: "LAK" },
    });
    expect(readPriceChange({ error: "price_changed", total: null, currency: null })).toEqual({
      changed: true,
      quote: { total: null, currency: null },
    });
  });

  it("takes anything else as the beds being gone", () => {
    for (const body of [{ error: "unavailable" }, { error: "price_changed", total: 1, currency: null }, { error: "price_changed", total: "1", currency: "LAK" }, null]) {
      expect(readPriceChange(body), JSON.stringify(body)).toEqual({ changed: false });
    }
  });
});
