import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FAKE_ROOMS, startFakeShadow, type FakeShadow } from "@/test/fake-shadow";
import { addDays } from "../dates";
import { hourlyCeiling } from "../gate";
import { createAvailabilityCache } from "./cache";
import { guestText } from "./contract";
import { createAvailabilityHandler, createBookingHandler } from "./handler";
import {
  BOOKING_LIMITS,
  LOOKUP_LIMITS,
  SHADOW_BOOKING_HOURLY_LIMIT,
  createBookingGate,
  createLookupLimiters,
} from "./limits";

// Saturday 26 September 2026, midday in Vientiane.
const START = Date.UTC(2026, 8, 26, 5);
const TODAY = "2026-09-26";
const [mixed, female] = [FAKE_ROOMS[0]!, FAKE_ROOMS[1]!];
const siteUrl = "https://thehouseofjars.com";

let fake: FakeShadow;
let time = START;
const clock = () => time;

beforeAll(async () => {
  fake = await startFakeShadow({ now: clock });
});
afterAll(async () => {
  await fake.close();
});
beforeEach(() => {
  fake.reset();
  time = START;
});

/** Both routes, sharing a cache, as app/api/* wires them. */
function site(overrides: { key?: string; apiUrl?: string; configured?: boolean; timeoutMs?: number } = {}) {
  const logs: string[] = [];
  const config = () =>
    overrides.configured === false ? null : { apiUrl: overrides.apiUrl ?? fake.url, key: overrides.key ?? fake.key };
  const shared = { config, cache: createAvailabilityCache(clock), siteUrl, now: clock, log: (m: string) => logs.push(m) };
  return {
    logs,
    lookup: createAvailabilityHandler({ ...shared, limiters: createLookupLimiters(clock), timeoutMs: overrides.timeoutMs }),
    book: createBookingHandler({ ...shared, gate: createBookingGate(clock), timeoutMs: overrides.timeoutMs }),
  };
}

const stay = { check_in: "2026-10-03", check_out: "2026-10-05", guests: 2 };

function get(query: Record<string, string | number> = stay, headers: HeadersInit = {}) {
  const search = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]));
  return new Request(`http://localhost/api/availability?${search}`, {
    headers: { "x-forwarded-for": "203.0.113.9", "sec-fetch-site": "same-origin", ...headers },
  });
}

const booking = {
  client_ref: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  room_type_id: mixed.id,
  ...stay,
  name: "  Mai  ",
  email: "mai@example.com",
  phone: "",
  preferred_contact: "email",
  arrival_time: "15:30",
  message: "Arriving on the evening bus.",
  consent: true,
};

function post(body: unknown, headers: HeadersInit = {}) {
  return new Request("http://localhost/api/booking", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const shadowCalls = (path: string) => fake.calls.filter((call) => call.path.startsWith(path)).length;

describe("GET /api/availability", () => {
  it("answers 503 not_configured when SHADOW_API_URL or SHADOW_INQUIRY_KEY is not set", async () => {
    const response = await site({ configured: false }).lookup(get());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "not_configured" });
    expect(fake.calls).toHaveLength(0);
  });

  it("returns the free beds each night, and prices only where the house has set a rate", async () => {
    const response = await site().lookup(get());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({
      ...stay,
      nights: 2,
      mode: "request",
      hold_hours: 24,
      limits: { max_guests: 6, min_nights: 1, max_nights: 30, window_days: 365 },
    });
    expect(body).not.toHaveProperty("property");
    const [dorm, womens] = body.room_types;
    expect(dorm).toMatchObject({
      id: mixed.id,
      kind: "mixed_dorm",
      features: ["Curtained pod beds", "Reading light", "Locker"],
      free_each_night: [
        { date: "2026-10-03", free: 14 },
        { date: "2026-10-04", free: 14 },
      ],
      min_free: 14,
      bookable: true,
      // Saturday night at the weekend rate, Sunday at the usual one, for two guests.
      price: {
        currency: "LAK",
        per_guest_per_night: [
          { date: "2026-10-03", amount: 100_000 },
          { date: "2026-10-04", amount: 90_000 },
        ],
        total: 380_000,
      },
    });
    expect(womens).toMatchObject({ id: female.id, kind: "female_dorm", description: null, price: null });
    expect(shadowCalls("/api/public/availability?check_in=2026-10-03&check_out=2026-10-05&guests=2")).toBe(1);
  });

  it("checks the query before anything reaches Shadow", async () => {
    const { lookup } = site();
    const cases: [Record<string, string | number>, string, string][] = [
      [{ ...stay, check_in: "2026-02-30" }, "check_in", guestText.realDates],
      [{ ...stay, check_in: "2026-09-25", check_out: "2026-09-27" }, "check_in", guestText.fromToday],
      [{ ...stay, check_out: "2026-10-03" }, "check_out", guestText.order],
      [{ ...stay, check_in: "2028-09-20", check_out: "2028-09-30" }, "check_out", guestText.tooFar],
      [{ ...stay, check_out: "2027-10-10" }, "check_out", guestText.tooLong],
      [{ ...stay, guests: 0 }, "guests", guestText.guests],
      [{ ...stay, guests: 21 }, "guests", guestText.guests],
      [{ ...stay, guests: "2.5" }, "guests", guestText.guests],
      [{ check_in: stay.check_in }, "check_out", guestText.realDates],
    ];
    for (const [query, field, message] of cases) {
      const response = await lookup(get(query));
      expect(response.status, JSON.stringify(query)).toBe(400);
      expect((await response.json()).issues).toContainEqual({ field, message });
    }
    expect(fake.calls).toHaveLength(0);
  });

  it("puts Shadow's 400 into the guest's words: the house's own limits", async () => {
    const { lookup } = site();
    const tooLong = await lookup(get({ ...stay, check_out: addDays(stay.check_in, 31) }));
    expect(tooLong.status).toBe(400);
    expect(await tooLong.json()).toEqual({
      error: "invalid_request",
      issues: [{ field: "check_out", message: guestText.datesRefused }],
    });
    const group = await lookup(get({ ...stay, guests: 7 }));
    expect((await group.json()).issues).toEqual([{ field: "guests", message: guestText.guestsRefused }]);
  });

  it("maps Shadow's other answers to calm, specific problems", async () => {
    const cases: [Partial<FakeShadow["state"]>, number, string][] = [
      [{ mode: "not_configured" }, 503, "not_configured"],
      [{ mode: "rate_limited" }, 503, "busy"],
      [{ mode: "server_error" }, 502, "unavailable"],
      [{ mode: "malformed" }, 502, "unavailable"],
    ];
    for (const [state, status, error] of cases) {
      fake.reset();
      Object.assign(fake.state, state);
      const response = await site().lookup(get());
      expect(response.status, state.mode).toBe(status);
      expect(await response.json()).toEqual({ error });
    }
  });

  it("logs a refused key (401) for the owner, and tells the guest only that it didn't work", async () => {
    const { lookup, logs } = site({ key: "sck_wrong" });
    const response = await lookup(get());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "unavailable" });
    expect(logs.join("\n")).toContain("check SHADOW_INQUIRY_KEY");
  });

  it("answers unavailable when Shadow can't be reached or is too slow", async () => {
    const closed = await startFakeShadow();
    const url = closed.url;
    await closed.close();
    expect((await site({ apiUrl: url }).lookup(get())).status).toBe(502);

    fake.state.delayMs = 300;
    const slow = await site({ timeoutMs: 50 }).lookup(get());
    expect(slow.status).toBe(502);
  });

  it("keeps each answer for 60 seconds, per query", async () => {
    const { lookup } = site();
    await lookup(get());
    await lookup(get());
    await lookup(get({ ...stay, guests: 1 }));
    expect(fake.calls).toHaveLength(2);
    time += 59_000;
    await lookup(get());
    expect(fake.calls).toHaveLength(2);
    time += 1_000;
    await lookup(get());
    expect(fake.calls).toHaveLength(3);
  });

  it("shares one call to Shadow between identical lookups under way, and never keeps a failure", async () => {
    const { lookup } = site();
    const answers = await Promise.all([lookup(get()), lookup(get()), lookup(get())]);
    expect(answers.map((response) => response.status)).toEqual([200, 200, 200]);
    expect(fake.calls).toHaveLength(1);

    fake.reset();
    const other = { ...stay, guests: 3 };
    fake.state.mode = "server_error";
    expect((await lookup(get(other))).status).toBe(502);
    fake.state.mode = "open";
    expect((await lookup(get(other))).status).toBe(200);
    expect(fake.calls).toHaveLength(2);
  });

  it("limits each client, cache hits included, and asks Shadow at most 200 times an hour per instance", async () => {
    expect(hourlyCeiling(LOOKUP_LIMITS.perInstance)).toBe(200);
    const { lookup } = site();
    for (let i = 0; i < LOOKUP_LIMITS.perClient.capacity; i++) expect((await lookup(get())).status).toBe(200);
    const limited = await lookup(get());
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "rate_limited" });
    expect(limited.headers.get("retry-after")).toBe("6");

    // Everyone together: distinct queries from distinct addresses, until the instance's allowance is spent.
    const everyone = site();
    const nightsFrom = (i: number) => ({ ...stay, check_in: addDays(TODAY, 1 + i), check_out: addDays(TODAY, 3 + i) });
    for (let i = 0; i < LOOKUP_LIMITS.perInstance.capacity; i++) {
      expect((await everyone.lookup(get(nightsFrom(i), { "x-forwarded-for": `198.51.100.${i}` }))).status).toBe(200);
    }
    const busy = await everyone.lookup(get(nightsFrom(99), { "x-forwarded-for": "192.0.2.1" }));
    expect(busy.status).toBe(503);
    expect(await busy.json()).toEqual({ error: "busy" });
    // What is already known is still answered.
    expect((await everyone.lookup(get(nightsFrom(0), { "x-forwarded-for": "192.0.2.1" }))).status).toBe(200);
  });

  it("refuses requests another website makes from a visitor's browser", async () => {
    const { lookup } = site();
    expect((await lookup(get(stay, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await lookup(get(stay, { origin: "https://evil.example" }))).status).toBe(403);
    expect((await lookup(get(stay, { "sec-fetch-site": "none" }))).status).toBe(200);
    expect(shadowCalls("/api/public/availability")).toBe(1);
  });
});

describe("POST /api/booking", () => {
  it("answers 503 not_configured when SHADOW_API_URL or SHADOW_INQUIRY_KEY is not set", async () => {
    const response = await site({ configured: false }).book(post(booking));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "not_configured" });
    expect(fake.calls).toHaveLength(0);
  });

  it("sends Shadow exactly the contract's body, and gives the guest the reference and the hold", async () => {
    const response = await site().book(post(booking));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      reference: expect.stringMatching(/^HOJ-[2-9A-HJ-NP-Z]{6}$/),
      status: "pending",
      hold_expires_at: new Date(START + 24 * 3_600_000).toISOString(),
      total: 380_000,
      currency: "LAK",
    });
    const sent = fake.bookings.get(booking.client_ref)!.request;
    expect(Object.keys(sent)).toEqual([
      "client_ref",
      "room_type_id",
      "check_in",
      "check_out",
      "guests",
      "name",
      "email",
      "phone",
      "preferred_contact",
      "arrival_time",
      "message",
      "consent",
    ]);
    expect(sent).toMatchObject({ name: "Mai", phone: null, email: "mai@example.com", consent: true });
    expect(sent).not.toHaveProperty("total");
  });

  it("is idempotent: the same client_ref gets the same booking back (200), never a second one", async () => {
    const { book } = site();
    const first = await (await book(post(booking))).json();
    const again = await book(post(booking));
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual(first);
    expect(fake.bookings.size).toBe(1);
  });

  it("lets a guest whose request timed out try again safely: Shadow already has it", async () => {
    fake.state.delayMs = 300;
    const timedOut = await site({ timeoutMs: 50 }).book(post(booking));
    expect(timedOut.status).toBe(502);
    expect(await timedOut.json()).toEqual({ error: "unavailable" });
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(fake.bookings.size).toBe(1);

    fake.state.delayMs = 0;
    const retry = await site().book(post(booking));
    expect(retry.status).toBe(200);
    expect((await retry.json()).reference).toBe(fake.bookings.get(booking.client_ref)!.response.reference);
  });

  it("answers 409 when the beds went, and the next lookup hears it from Shadow, not the cache", async () => {
    const { lookup, book } = site();
    const before = await (await lookup(get())).json();
    expect(before.room_types[0].bookable).toBe(true);

    fake.occupy(mixed.id, "2026-10-04", "2026-10-05", 13);
    const taken = await book(post(booking));
    expect(taken.status).toBe(409);
    expect(await taken.json()).toEqual({ error: "taken" });

    const after = await (await lookup(get())).json();
    expect(shadowCalls("/api/public/availability")).toBe(2);
    expect(after.room_types[0]).toMatchObject({ min_free: 1, bookable: false });

    // The guest chooses again: the female dorm has no rate yet, so the team confirms the price.
    const chosen = await book(post({ ...booking, client_ref: "1b4e28ba-2fa1-41d2-883f-0016d3cca427", room_type_id: female.id }));
    expect(chosen.status).toBe(201);
    expect(await chosen.json()).toMatchObject({ status: "pending", total: null, currency: null });
  });

  it("forgets cached availability for the booked nights only", async () => {
    const { lookup, book } = site();
    const later = { check_in: "2026-10-05", check_out: "2026-10-07", guests: 2 };
    await lookup(get());
    await lookup(get(later));
    expect((await book(post(booking))).status).toBe(201);
    await lookup(get(later));
    expect(shadowCalls("/api/public/availability")).toBe(2);
    const fresh = await (await lookup(get())).json();
    expect(shadowCalls("/api/public/availability")).toBe(3);
    expect(fresh.room_types[0].min_free).toBe(12);
  });

  it("returns field issues without contacting Shadow", async () => {
    const { book } = site();
    const cases: [Record<string, unknown>, string][] = [
      [{ name: " " }, "name"],
      [{ email: null, phone: null }, "email"],
      [{ email: "mai@" }, "email"],
      [{ phone: "123" }, "phone"],
      [{ preferred_contact: "pigeon" }, "preferred_contact"],
      [{ arrival_time: "3pm" }, "arrival_time"],
      [{ message: "x".repeat(2001) }, "message"],
      [{ consent: false }, "consent"],
      [{ guests: 0 }, "guests"],
      [{ room_type_id: "dorm" }, "room_type_id"],
      [{ check_in: "2026-09-25" }, "check_in"],
      [{ check_out: "2026-10-03" }, "check_out"],
      [{ total: 1 }, "form"],
    ];
    for (const [change, field] of cases) {
      const response = await book(post({ ...booking, ...change }));
      expect(response.status, JSON.stringify(change)).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("invalid_request");
      expect(body.issues.map((issue: { field: string }) => issue.field), JSON.stringify(change)).toContain(field);
    }
    expect(fake.calls).toHaveLength(0);
  });

  it("rejects bodies that are not JSON or too large", async () => {
    const { book } = site();
    expect((await book(post("{not json"))).status).toBe(400);
    expect((await book(post({ ...booking, message: "x".repeat(17_000) }))).status).toBe(413);
  });

  it("maps every answer the contract allows", async () => {
    const cases: [Partial<FakeShadow["state"]>, Record<string, unknown>, number, unknown][] = [
      // The website doesn't know the house's limits; Shadow does.
      [{}, { guests: 7 }, 400, { error: "invalid_request", issues: [{ field: "guests", message: guestText.guestsRefused }] }],
      [{ mode: "too_large" }, {}, 400, { error: "invalid_request", issues: [{ field: "form", message: guestText.checkForm }] }],
      [{ mode: "rate_limited" }, {}, 503, { error: "busy" }],
      [{ mode: "not_configured" }, {}, 503, { error: "not_configured" }],
      [{ mode: "server_error" }, {}, 502, { error: "unavailable" }],
      [{ mode: "malformed" }, {}, 502, { error: "unavailable" }],
    ];
    for (const [state, change, status, body] of cases) {
      fake.reset();
      Object.assign(fake.state, state);
      const response = await site().book(post({ ...booking, ...change }));
      expect(response.status, JSON.stringify(state)).toBe(status);
      expect(await response.json()).toEqual(body);
    }
    const refused = site({ key: "sck_wrong" });
    expect((await refused.book(post(booking))).status).toBe(502);
    expect(refused.logs.join("\n")).toContain("check SHADOW_INQUIRY_KEY");
  });

  it("books straight away when the house takes instant bookings", async () => {
    fake.state.bookingMode = "instant";
    const response = await site().book(post(booking));
    expect(await response.json()).toMatchObject({ status: "confirmed", hold_expires_at: null });
  });

  it("stays strictly inside Shadow's hourly limit for booking requests", async () => {
    expect(hourlyCeiling(BOOKING_LIMITS.perClient)).toBe(6);
    expect(hourlyCeiling(BOOKING_LIMITS.perInstance)).toBe(20);
    expect(hourlyCeiling(BOOKING_LIMITS.perInstance)).toBeLessThan(SHADOW_BOOKING_HOURLY_LIMIT);

    const { book } = site();
    const refs = ["9b2d5c1e-3f4a-4b6c-8d7e-0f1a2b3c4d01", "9b2d5c1e-3f4a-4b6c-8d7e-0f1a2b3c4d02"];
    // One guest each, so the dorm's 14 beds never run out before the limits do.
    const fresh = (i: number) => ({
      ...booking,
      guests: 1,
      client_ref: `9b2d5c1e-3f4a-4b6c-8d7e-0f1a2b3c4e${String(i).padStart(2, "0")}`,
    });
    for (let i = 0; i < 5; i++) expect((await book(post({ ...booking, name: "" }))).status).toBe(400);
    for (let i = 0; i < BOOKING_LIMITS.perClient.capacity; i++) expect((await book(post(fresh(i)))).status).toBe(201);
    const limited = await book(post({ ...booking, client_ref: refs[0] }));
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "rate_limited" });

    for (let i = 3; i < BOOKING_LIMITS.perInstance.capacity; i++) {
      expect((await book(post(fresh(i), { "x-forwarded-for": `198.51.100.${i}` }))).status).toBe(201);
    }
    const busy = await book(post({ ...booking, client_ref: refs[1] }, { "x-forwarded-for": "192.0.2.9" }));
    expect(busy.status).toBe(503);
    expect(await busy.json()).toEqual({ error: "busy" });
  });

  it("accepts only same-origin JSON", async () => {
    const { book } = site();
    expect((await book(post(booking, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await book(post(booking, { origin: "https://evil.example" }))).status).toBe(403);
    expect((await book(post(booking, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect(fake.calls).toHaveLength(0);
  });
});
