import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_DETAILS,
  bookingBody,
  checkDetails,
  clientRefFor,
  fetchAvailability,
  formatMoney,
  freeBedsText,
  houseTodayNow,
  kindLabel,
  postBooking,
  priceLines,
  quoteOf,
  quoteText,
  stepForIssues,
  unavailableText,
  waitText,
} from "./flow";
import type { RoomType } from "./types";

const stay = { check_in: "2026-10-03", check_out: "2026-10-05", guests: 2 };
const room: RoomType = {
  id: "5b0c3a0e-2f7e-4c55-9a55-1f6f3c1d2a01",
  name: "Pod dorm",
  kind: "mixed_dorm",
  description: null,
  features: [],
  free_each_night: [
    { date: "2026-10-03", free: 5 },
    { date: "2026-10-04", free: 4 },
  ],
  min_free: 4,
  bookable: true,
  price: null,
  terms: null,
  pay_now: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

const NO_QUOTE = { total: null, currency: null } as const;

function answer(status: number, body: unknown, headers: HeadersInit = {}) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status, headers }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("talking to the website's booking routes", () => {
  it("asks for the stay's dates and guests", async () => {
    const fetch = answer(200, { room_types: [] });
    expect(await fetchAvailability(stay)).toMatchObject({ ok: true });
    expect(fetch).toHaveBeenCalledWith("/api/availability?check_in=2026-10-03&check_out=2026-10-05&guests=2", {
      signal: undefined,
    });
  });

  it("turns every answer into one problem the page knows how to explain", async () => {
    const cases: [number, unknown, string][] = [
      [400, { error: "invalid_request", issues: [{ field: "guests", message: "x" }] }, "invalid"],
      [409, { error: "taken" }, "taken"],
      [429, { error: "rate_limited" }, "rate_limited"],
      [503, { error: "busy" }, "busy"],
      [503, { error: "not_configured" }, "not_configured"],
      [502, { error: "unavailable" }, "unavailable"],
      [500, "oops", "unavailable"],
    ];
    for (const [status, body, problem] of cases) {
      answer(status, body);
      expect(await postBooking(bookingBody("r", stay, room.id, { ...EMPTY_DETAILS, name: "Mai" }, NO_QUOTE)), String(status)).toMatchObject({
        ok: false,
        problem,
      });
    }
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    expect(await fetchAvailability(stay)).toMatchObject({ ok: false, problem: "unavailable", issues: [] });
  });

  it("brings back the new total when the price changed, and nothing was booked (F1W-03)", async () => {
    answer(409, { error: "price_changed", total: 600_000, currency: "LAK" });
    const body = bookingBody("r", stay, room.id, { ...EMPTY_DETAILS, name: "Mai" }, { total: 360_000, currency: "LAK" });
    expect(await postBooking(body)).toMatchObject({ ok: false, problem: "price_changed", quote: { total: 600_000, currency: "LAK" } });
    answer(409, { error: "price_changed", total: 600_000, currency: null });
    expect(await postBooking(body)).toMatchObject({ problem: "taken", quote: null });
  });

  it("says how long to wait, from the website's Retry-After (F1W-11)", async () => {
    answer(429, { error: "rate_limited" }, { "retry-after": "1200" });
    const outcome = await postBooking(bookingBody("r", stay, room.id, { ...EMPTY_DETAILS, name: "Mai" }, NO_QUOTE));
    expect(outcome).toMatchObject({ problem: "rate_limited", retryAfterSeconds: 1200 });
    expect(waitText(1200)).toBe("in about 20 minutes");
    expect(waitText(45)).toBe("in a minute or two");
    expect(waitText(null)).toBe("in a minute or two");
    expect(waitText(3 * 3600 + 60)).toBe("in about 3 hours");
    expect(waitText(3600)).toBe("in about an hour");
    expect(waitText(23.9 * 3600)).toBe("tomorrow");
  });

  it("takes today at the house from the website's clock, not this device's (F1W-09)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      // The device thinks it is 23:58 on 26 September in Vientiane; the website says 00:05 on the 27th.
      vi.setSystemTime(Date.UTC(2026, 8, 26, 16, 58));
      expect(houseTodayNow()).toBe("2026-09-26");
      answer(200, { room_types: [] }, { date: new Date(Date.UTC(2026, 8, 26, 17, 5)).toUTCString() });
      await fetchAvailability(stay);
      expect(houseTodayNow()).toBe("2026-09-27");
      // And it keeps counting from there.
      vi.setSystemTime(Date.UTC(2026, 8, 27, 16, 58));
      expect(houseTodayNow()).toBe("2026-09-28");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("rooms and prices", () => {
  it("names the kind of room only when the name doesn't already say it", () => {
    expect(kindLabel(room)).toBe("Mixed dorm");
    expect(kindLabel({ ...room, name: "Mixed dorm" })).toBeNull();
    expect(kindLabel({ ...room, kind: null })).toBeNull();
  });

  it("writes kip and dollars as receipts do", () => {
    expect(formatMoney(360_000, "LAK")).toBe("LAK 360,000");
    expect(formatMoney(18, "USD")).toBe("USD 18");
    expect(formatMoney(18.5, "USD")).toBe("USD 18.50");
  });

  it("gives the price per guest per night, a range when nights differ, and the total", () => {
    const price = {
      currency: "LAK" as const,
      per_guest_per_night: [
        { date: "2026-10-03", amount: 100_000 },
        { date: "2026-10-04", amount: 90_000 },
      ],
      total: 380_000,
    };
    expect(priceLines(price, stay)).toEqual({
      perNight: "LAK 90,000 to 100,000",
      per: "per guest per night",
      total: "LAK 380,000",
      totalFor: "2 guests, 2 nights",
    });
    const dollars = {
      currency: "USD" as const,
      per_guest_per_night: [
        { date: "2026-10-03", amount: 18.5 },
        { date: "2026-10-04", amount: 20 },
      ],
      total: 77,
    };
    expect(priceLines(dollars, stay).perNight).toBe("USD\u00a018.50 to 20.00");
    const flat = { ...price, per_guest_per_night: price.per_guest_per_night.map((n) => ({ ...n, amount: 90_000 })) };
    expect(priceLines(flat, { ...stay, guests: 1 }).perNight).toBe("LAK 90,000");
  });

  it("gives a private room priced as a whole per room per night, whatever the guests", () => {
    const room = {
      currency: "USD" as const,
      per_guest_per_night: [
        { date: "2026-10-03", amount: 11.67 },
        { date: "2026-10-04", amount: 13.33 },
      ],
      per_room_per_night: [
        { date: "2026-10-03", amount: 35 },
        { date: "2026-10-04", amount: 40 },
      ],
      total: 75,
    };
    expect(priceLines(room, { ...stay, guests: 3 })).toEqual({
      perNight: "USD\u00a035 to 40",
      per: "per room per night",
      total: "USD\u00a075",
      totalFor: "3 guests, 2 nights",
    });
    // Without the room's own prices, the price per guest as before.
    expect(priceLines({ ...room, per_room_per_night: [] }, stay)).toMatchObject({
      perNight: "USD\u00a011.67 to 13.33",
      per: "per guest per night",
    });
  });

  it("says how many beds are free, and why a room can't be booked", () => {
    expect(freeBedsText(room, 2)).toBe("4 beds free every night");
    expect(freeBedsText({ ...room, min_free: 1 }, 1)).toBe("1 bed free that night");
    const full = {
      ...room,
      bookable: false,
      free_each_night: [
        { date: "2026-10-03", free: 0 },
        { date: "2026-10-04", free: 1 },
      ],
    };
    expect(unavailableText(full, 2)).toBe("Full on Sat 3 Oct, and on 1 more night.");
    expect(unavailableText({ ...full, free_each_night: [{ date: "2026-10-04", free: 1 }] }, 2)).toBe("Only 1 bed free on Sun 4 Oct.");
    expect(unavailableText({ ...room, bookable: false }, 2)).toBe("Not open for online booking on these dates.");
    expect(unavailableText(room, 2)).toBeNull();
  });
});

describe("the guest's details", () => {
  const valid = { ...EMPTY_DETAILS, name: "Mai", email: "mai@example.com", consent: true };

  it("needs a name, a way to reply and consent, in the server's words", () => {
    expect(checkDetails(valid)).toEqual({});
    expect(Object.keys(checkDetails(EMPTY_DETAILS)).sort()).toEqual(["consent", "email", "name"]);
    expect(checkDetails({ ...valid, email: "mai@" }).email).toBe("Please check your email address.");
    expect(checkDetails({ ...valid, email: "", phone: "+856" }).phone).toBe("Please check your WhatsApp or phone number.");
    expect(checkDetails({ ...valid, arrival_time: "7pm" }).arrival_time).toBe("Please give a time like 15:30.");
    expect(checkDetails({ ...valid, message: "x".repeat(2001) }).message).toBeDefined();
  });

  it("asks for the address or number the guest wants the reply on", () => {
    expect(checkDetails({ ...valid, preferred_contact: "whatsapp" }).preferred_contact).toBe(
      "Please give the number the team should use.",
    );
    expect(checkDetails({ ...valid, email: "", phone: "+856 20 1234 5678", preferred_contact: "email" }).preferred_contact).toBe(
      "You chose email: please give an email address.",
    );
  });

  it("builds the contract's body: trimmed, blanks as null, and the total the guest saw last", () => {
    const body = bookingBody("ref", stay, room.id, { ...valid, name: " Mai ", message: "  " }, { total: 360_000, currency: "LAK" });
    expect(body).toEqual({
      client_ref: "ref",
      room_type_id: room.id,
      ...stay,
      name: "Mai",
      email: "mai@example.com",
      phone: null,
      preferred_contact: null,
      arrival_time: null,
      message: null,
      consent: true,
      quoted_total: 360_000,
      quoted_currency: "LAK",
    });
    // No rate set: the guest was told the team confirms the price, and that is what they agree to.
    expect(bookingBody("ref", stay, room.id, valid, quoteOf(null))).toMatchObject({ quoted_total: null, quoted_currency: null });
  });

  it("writes a quote as the page shows it", () => {
    expect(quoteText({ total: 360_000, currency: "LAK" })).toBe("LAK\u00a0360,000");
    expect(quoteText(NO_QUOTE)).toBeNull();
    expect(quoteOf({ currency: "USD", per_guest_per_night: [], total: 36 })).toEqual({ total: 36, currency: "USD" });
  });
});

describe("resending", () => {
  it("reuses the client_ref for exactly the same request, and only then", () => {
    let n = 0;
    const next = () => `ref-${++n}`;
    const request = bookingBody("", stay, room.id, { ...EMPTY_DETAILS, name: "Mai", consent: true }, NO_QUOTE);
    const first = clientRefFor(null, request, next);
    expect(clientRefFor(first, request, next).ref).toBe("ref-1");
    expect(clientRefFor(first, { ...request, room_type_id: "other" }, next).ref).toBe("ref-2");
    // Agreeing to a new price is a new request: Shadow must not answer with the one it refused (F1W-03).
    expect(clientRefFor(first, { ...request, quoted_total: 600_000, quoted_currency: "LAK" }, next).ref).toBe("ref-3");
  });

  it("sends the guest back to the step that can fix a problem", () => {
    expect(stepForIssues([{ field: "email", message: "" }, { field: "check_out", message: "" }])).toBe("dates");
    expect(stepForIssues([{ field: "room_type_id", message: "" }])).toBe("rooms");
    expect(stepForIssues([{ field: "arrival_time", message: "" }])).toBe("details");
    expect(stepForIssues([{ field: "form", message: "" }])).toBe("review");
  });

  it("stays free of zod, which would add some 90 kB to the booking form's JavaScript", () => {
    const source = readFileSync(join(process.cwd(), "lib/booking/flow.ts"), "utf8");
    expect(source).not.toMatch(/from "(zod[^"]*|\.\/contract|\.\/shadow|\.\/handler)"/);
  });
});
