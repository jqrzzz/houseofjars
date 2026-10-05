import { describe, expect, it } from "vitest";
import { parseBookingRequest, readAvailability, readConfirmation } from "./contract";
import { cancelText, payNowText } from "./flow";
import { createBookingHandler, createBookingStatusHandler, paidReturnUrl } from "./handler";
import { createAvailabilityCache } from "./cache";
import { createBookingGate } from "./limits";

const query = { check_in: "2026-10-25", check_out: "2026-10-27", guests: 1 };
const room = {
  id: "66f56a6b-5b9b-4fc6-a61f-6a80a6c6993a",
  name: "Mixed Dorm",
  kind: "mixed_dorm",
  description: null,
  features: [],
  free_each_night: [{ date: "2026-10-25", free: 5 }],
  min_free: 5,
  bookable: true,
  price: { currency: "LAK", per_guest_per_night: [{ date: "2026-10-25", amount: 90000 }], total: 180000 },
  terms: { cancel_days: 2 },
  pay_now: 54000,
};
const answer = (test: boolean) => ({
  property: { name: "House of Jars", timezone: "Asia/Vientiane" },
  ...query,
  nights: 2,
  mode: "request",
  hold_hours: 6,
  limits: { max_guests: 6, min_nights: 1, max_nights: 30, window_days: 365 },
  room_types: [room],
  payment: { online: "optional", charge: "deposit", deposit_percent: 30, pay_minutes: 30, test },
});

describe("paying online, as Shadow offers it", () => {
  it("offers the bank's payments, and test payments only where allowed", () => {
    const real = readAvailability(answer(false), query, false)!;
    expect(real.payment).toMatchObject({ online: "optional", charge: "deposit", deposit_percent: 30 });
    expect(real.room_types[0]).toMatchObject({ terms: { cancel_days: 2 }, pay_now: 54000 });
    // Shadow's test bank on the live site would book stays nobody paid for: the guest pays at the house.
    const live = readAvailability(answer(true), query, false)!;
    expect(live.payment).toBeNull();
    expect(live.room_types[0]!.pay_now).toBeNull();
    expect(readAvailability(answer(true), query, true)!.payment?.test).toBe(true);
    // A Shadow from before payments: none offered, nothing breaks.
    const before: Record<string, unknown> = { ...answer(false) };
    delete before.payment;
    const old = readAvailability({ ...before, room_types: [{ ...room, terms: undefined, pay_now: undefined }] }, query, true)!;
    expect(old.payment).toBeNull();
    expect(old.room_types[0]).toMatchObject({ terms: null, pay_now: null });
  });

  it("words the deposit and the cancellation terms", () => {
    const offer = readAvailability(answer(false), query, false)!;
    expect(payNowText(offer.payment!, offer.room_types[0]!)).toBe("LAK 54,000 (30% deposit)");
    expect(cancelText({ cancel_days: 2 })).toBe("Free cancellation up to 2 days before you arrive; no refund after that.");
    expect(cancelText({ cancel_days: null })).toBe("No refund once paid.");
  });

  it("takes pay_online from the browser, never the page the bank returns to", () => {
    const body = {
      client_ref: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      room_type_id: room.id,
      ...query,
      name: "Mai",
      email: "mai@example.com",
      consent: true,
      quoted_total: 180000,
      quoted_currency: "LAK",
    };
    const now = Date.UTC(2026, 9, 5, 5);
    const parsed = parseBookingRequest({ ...body, pay_online: true }, now);
    expect(parsed.ok && parsed.request.pay_online).toBe(true);
    expect(parseBookingRequest({ ...body, pay_online: true, return_url: "https://evil.example" }, now).ok).toBe(false);
  });

  it("reads a booking's payment, with Shadow's id only then", () => {
    const receipt = { id: "8d493bc6-fc68-48c6-8072-2b762847b8c4", reference: "HOJ-U6E7NN", status: "pending", hold_expires_at: null, total: 180000, currency: "LAK" };
    expect(readConfirmation(receipt)).not.toHaveProperty("id");
    const paying = readConfirmation({
      ...receipt,
      payment: { id: "x", status: "open", amount: 54000, currency: "LAK", url: "https://shadow.example/pay/test/abc", expires_at: "2026-10-05T13:09:01.786Z", test: true },
    });
    expect(paying).toMatchObject({ id: receipt.id, payment: { status: "open", amount: 54000, url: "https://shadow.example/pay/test/abc", test: true } });
  });
});

describe("the website's payment routes", () => {
  const siteUrl = "https://www.houseofjars.la";
  const config = () => ({ apiUrl: "https://shadow.example", key: "sck_test" });

  it("sends Shadow the page the bank returns to when the guest pays now", async () => {
    const sent: unknown[] = [];
    const fetchStub: typeof fetch = async (_url, init) => {
      sent.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ id: "8d493bc6-fc68-48c6-8072-2b762847b8c4", reference: "HOJ-U6E7NN", status: "pending", hold_expires_at: null, total: 180000, currency: "LAK" }), { status: 201 });
    };
    const book = createBookingHandler({ config, cache: createAvailabilityCache(), gate: createBookingGate(), siteUrl, fetch: fetchStub, now: () => Date.UTC(2026, 9, 5, 5) });
    const request = new Request(`${siteUrl}/api/booking`, {
      method: "POST",
      headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" },
      body: JSON.stringify({
        client_ref: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        room_type_id: room.id,
        ...query,
        name: "Mai",
        email: "mai@example.com",
        consent: true,
        pay_online: true,
      }),
    });
    expect((await book(request)).status).toBe(201);
    expect(sent[0]).toMatchObject({ pay_online: true, return_url: paidReturnUrl(siteUrl) });
    expect(paidReturnUrl(siteUrl)).toBe("https://www.houseofjars.la/book?paid=1");
  });

  it("asks Shadow where a booking stands only for a booking's id", async () => {
    let asked = 0;
    const fetchStub: typeof fetch = async () => {
      asked += 1;
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    };
    const status = createBookingStatusHandler({ config, siteUrl, fetch: fetchStub, limiter: { take: () => ({ allowed: true, retryAfterSeconds: 0 }) } });
    expect((await status(new Request(`${siteUrl}/api/booking/x`), "../../admin")).status).toBe(404);
    expect(asked).toBe(0);
    expect((await status(new Request(`${siteUrl}/api/booking/x`), "8d493bc6-fc68-48c6-8072-2b762847b8c4")).status).toBe(404);
    expect(asked).toBe(1);
  });
});
