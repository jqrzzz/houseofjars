import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FAKE_ROOMS, startFakeShadow, type FakeShadow } from "@/test/fake-shadow";
import { createAvailabilityCache } from "../booking/cache";
import { createAvailabilityHandler, type AvailabilityDeps } from "../booking/handler";
import { createLookupLimiters, LOOKUP_LIMITS } from "../booking/limits";
import type { Availability, RoomType } from "../booking/types";
import { addDays } from "../dates";
import {
  availabilityCard,
  availabilityChecker,
  checkAvailabilityInputSchema,
  checkAvailabilityTool,
  shapeAvailability,
} from "./availability";
import { mentionsMoney } from "./guard";

// Saturday 26 September 2026, midday in Vientiane.
const START = Date.UTC(2026, 8, 26, 5);
const TODAY = "2026-09-26";
const [mixed, female, privateRoom] = [FAKE_ROOMS[0]!, FAKE_ROOMS[1]!, FAKE_ROOMS[2]!];
const stay = { check_in: "2026-10-03", check_out: "2026-10-05", guests: 2 };
const guest = "203.0.113.9";

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

/** The booking path as the site wires it: one cache and one set of lookup limits per server process. */
function bookingPath(configured = true): AvailabilityDeps {
  return {
    config: () => (configured ? { apiUrl: fake.url, key: fake.key } : null),
    cache: createAvailabilityCache(clock),
    limiters: createLookupLimiters(clock),
    now: clock,
    log: () => {},
  };
}

const read = (content: string) => JSON.parse(content) as Record<string, unknown>;
const lookups = () => fake.calls.filter((call) => call.path.startsWith("/api/public/availability")).length;

function room(overrides: Partial<RoomType> & Pick<RoomType, "name" | "min_free" | "bookable">): RoomType {
  return {
    id: "5b0c3a0e-2f7e-4c55-9a55-1f6f3c1d2a01",
    kind: "mixed_dorm",
    description: "Pod beds with curtains.",
    features: ["Locker"],
    free_each_night: [
      { date: "2026-10-03", free: overrides.min_free },
      { date: "2026-10-04", free: overrides.min_free + 1 },
    ],
    price: null,
    ...overrides,
  };
}

function answerWith(rooms: RoomType[], overrides: Partial<Availability> = {}): Availability {
  return {
    ...stay,
    nights: 2,
    mode: "request",
    hold_hours: 6,
    limits: { max_guests: 6, min_nights: 1, max_nights: 30, window_days: 365 },
    room_types: rooms,
    ...overrides,
  };
}

const priced = {
  currency: "LAK" as const,
  per_guest_per_night: [
    { date: "2026-10-03", amount: 100_000 },
    { date: "2026-10-04", amount: 90_000 },
  ],
  total: 380_000,
};

describe("check_availability tool definition", () => {
  it("asks for the stay and nothing else, and says it only reads", () => {
    const schema = checkAvailabilityTool.input_schema;
    expect(Object.keys(schema.properties as object)).toEqual(["check_in", "check_out", "guests"]);
    expect(schema.required).toEqual(["check_in", "check_out", "guests"]);
    expect(schema.additionalProperties).toBe(false);
    expect(checkAvailabilityTool.eager_input_streaming).toBe(true);
    expect(checkAvailabilityTool.description).toContain("It only reads: it books nothing, holds nothing and never shows prices.");
    expect(checkAvailabilityTool.description).toContain("ask the guest first instead of guessing");
    expect(mentionsMoney(checkAvailabilityTool.description ?? "")).toBe(false);
  });
});

describe("check_availability input", () => {
  it("takes real dates and a whole number of guests", () => {
    expect(checkAvailabilityInputSchema.safeParse(stay)).toEqual({ success: true, data: stay });
    for (const bad of [
      { ...stay, check_in: "2026-02-30" },
      { ...stay, check_out: "5 October" },
      { ...stay, check_in: "2026-10-3" },
      { ...stay, guests: 2.5 },
      { ...stay, guests: "2" },
      { ...stay, guests: 0 },
      { ...stay, guests: 21 },
      { check_in: stay.check_in, check_out: stay.check_out },
      { ...stay, room_type_id: mixed.id },
      { ...stay, price: 0 },
      null,
    ]) {
      expect(checkAvailabilityInputSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });

  it("answers invalid input with a tool error, and nothing reaches Shadow Check-in or the guest's limits", async () => {
    const path = bookingPath();
    const check = availabilityChecker(path, guest);
    const outcome = await check({ ...stay, guests: "two" });
    expect(outcome).toMatchObject({ isError: true, card: null });
    expect(read(outcome.content)).toMatchObject({ error: "invalid_input", detail: expect.stringContaining("guests") });
    expect(fake.calls).toHaveLength(0);
    expect(path.limiters.perClient.size).toBe(0);
  });

  it("keeps to the booking form's own bounds before asking: past, out of order, too long, too far ahead", async () => {
    const check = availabilityChecker(bookingPath(), guest);
    const cases: [object, string, string][] = [
      [{ ...stay, check_in: addDays(TODAY, -1), check_out: addDays(TODAY, 1) }, "past", `Check-in is before today in Vientiane (${TODAY}).`],
      [{ ...stay, check_out: stay.check_in }, "check_out_not_after_check_in", "Check-out must be after check-in."],
      [{ ...stay, check_out: addDays(stay.check_in, 366) }, "too_long", "Online booking takes stays of at most 365 nights."],
      [{ check_in: "2028-09-20", check_out: "2028-09-30", guests: 1 }, "outside_window", "Online booking takes stays that end by 2028-09-25."],
    ];
    for (const [input, reason, detail] of cases) {
      const outcome = await check(input);
      expect(outcome.isError, reason).toBe(false);
      expect(read(outcome.content), reason).toMatchObject({ bookable: false, reason, reason_detail: detail, booking_card_shown: false });
    }
    expect(fake.calls).toHaveLength(0);
  });
});

describe("what Claude reads (result shaping)", () => {
  it("gives each room type's name, kind, fewest free beds and whether it can be booked, and never a price", () => {
    const answer = answerWith([
      room({ name: "Mixed dorm", min_free: 14, bookable: true, price: priced }),
      room({
        name: "Private room",
        kind: "private",
        min_free: 1,
        bookable: false,
        // Priced as a whole room (Shadow Check-in's per_room_per_night): none of it reaches Claude either.
        price: {
          currency: "USD",
          per_guest_per_night: [
            { date: "2026-10-03", amount: 18 },
            { date: "2026-10-04", amount: 18 },
          ],
          per_room_per_night: [
            { date: "2026-10-03", amount: 36 },
            { date: "2026-10-04", amount: 36 },
          ],
          total: 72,
        },
      }),
    ]);
    const outcome = shapeAvailability(stay, { ok: true, availability: answer }, TODAY);
    const result = read(outcome.content);
    expect(result).toEqual({
      ...stay,
      nights: 2,
      bookable: true,
      room_types: [
        { name: "Mixed dorm", kind: "mixed_dorm", fewest_free_beds: 14, bookable: true },
        { name: "Private room", kind: "private", fewest_free_beds: 1, bookable: false },
      ],
      booking_card_shown: true,
    });
    expect(outcome.content).not.toMatch(/price|total|amount|currency|per_guest|per_room|LAK|USD|380|100000|90000|72|36/i);
    expect(JSON.stringify(outcome.card)).not.toMatch(/price|total|amount|currency/i);
    expect(outcome.isError).toBe(false);
  });

  it("says why nothing can be booked, from Shadow Check-in's own counts and limits", () => {
    const full = [room({ name: "Mixed dorm", min_free: 1, bookable: false }), room({ name: "Female dorm", min_free: 0, bookable: false })];
    const cases: [Availability, string, string][] = [
      [answerWith(full), "fully_booked", "No room type has 2 beds free on every night of the stay."],
      [answerWith(full, { guests: 7 }), "too_many_guests", "Online booking takes up to 6 guests at a time."],
      [answerWith(full, { check_out: "2026-11-03", nights: 31 }), "too_long", "Online booking takes stays of 1 to 30 nights."],
      [
        answerWith(full, { limits: { max_guests: 6, min_nights: 3, max_nights: 30, window_days: 365 } }),
        "too_short",
        "Online booking takes stays of 3 to 30 nights.",
      ],
      [
        answerWith(full, { limits: { max_guests: 6, min_nights: 1, max_nights: 30, window_days: 5 } }),
        "outside_window",
        "Online booking takes stays that end by 2026-10-01.",
      ],
      [answerWith([room({ name: "Mixed dorm", min_free: 9, bookable: false })]), "not_taken_online", "The house's booking system doesn't take this stay online."],
      [answerWith([]), "not_taken_online", "The house's booking system doesn't take this stay online."],
    ];
    for (const [answer, reason, detail] of cases) {
      const outcome = shapeAvailability(stay, { ok: true, availability: answer }, TODAY);
      expect(outcome.card, reason).toBeNull();
      expect(read(outcome.content), reason).toMatchObject({ bookable: false, reason, reason_detail: detail, booking_card_shown: false });
    }
  });

  it("turns limits and failures into results Claude can relay, never an exception", () => {
    const relay = (found: Parameters<typeof shapeAvailability>[1]) => shapeAvailability(stay, found, TODAY);
    expect(read(relay({ ok: false, error: "not_configured" }).content)).toMatchObject({
      bookable: false,
      reason: "booking_closed",
      reason_detail: "Online booking isn't open just now.",
    });
    expect(relay({ ok: false, error: "rate_limited", retryAfterSeconds: 290 })).toMatchObject({ isError: true, card: null });
    expect(read(relay({ ok: false, error: "rate_limited", retryAfterSeconds: 290 }).content)).toEqual({
      error: "rate_limited",
      detail: "This guest's connection has looked up many stays in the last few minutes.",
      retry_after_minutes: 5,
    });
    expect(read(relay({ ok: false, error: "busy", retryAfterSeconds: 20 }).content)).toMatchObject({ error: "busy" });
    expect(read(relay({ ok: false, error: "busy" }).content)).toMatchObject({ error: "busy" });
    expect(read(relay({ ok: false, error: "unavailable" }).content)).toMatchObject({ error: "unavailable" });
  });
});

describe("the card (built on the server)", () => {
  it("shows the stay Shadow Check-in answered for, and only the room types that can be booked", () => {
    const answer = answerWith([
      room({ name: "Mixed dorm", min_free: 14, bookable: true, price: priced }),
      room({ name: "Female dorm", kind: "female_dorm", min_free: 1, bookable: false }),
      room({ name: "Sunset room", kind: null, min_free: 2, bookable: true }),
    ]);
    expect(availabilityCard(answer)).toEqual({
      ...stay,
      nights: 2,
      rooms: [
        { name: "Mixed dorm", kind: "mixed_dorm", free: 14 },
        { name: "Sunset room", kind: null, free: 2 },
      ],
    });
    expect(availabilityCard(answerWith([room({ name: "Mixed dorm", min_free: 1, bookable: false })]))).toBeNull();
  });
});

describe("the booking form's own path", () => {
  const site = (path: AvailabilityDeps) => createAvailabilityHandler({ ...path, siteUrl: "https://thehouseofjars.com" });
  const get = (query: Record<string, string | number>, from = guest) =>
    new Request(`http://localhost/api/availability?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))}`, {
      headers: { "x-forwarded-for": from, "sec-fetch-site": "same-origin" },
    });

  it("looks up the stay at Shadow Check-in, with no prices for Claude though Shadow sends them", async () => {
    const outcome = await availabilityChecker(bookingPath(), guest)(stay);
    const result = read(outcome.content);
    expect(result).toMatchObject({ ...stay, nights: 2, bookable: true, booking_card_shown: true });
    expect(result.room_types).toEqual([
      { name: mixed.name, kind: "mixed_dorm", fewest_free_beds: 14, bookable: true },
      { name: female.name, kind: "female_dorm", fewest_free_beds: 6, bookable: true },
      { name: privateRoom.name, kind: "private", fewest_free_beds: 2, bookable: true },
    ]);
    expect(outcome.content).not.toMatch(/price|total|amount|currency|LAK|USD/i);
    expect(outcome.card?.rooms.map((shown) => shown.name)).toEqual([mixed.name, female.name, privateRoom.name]);
    expect(lookups()).toBe(1);
  });

  it("shares the booking form's cache: a stay the form just looked up doesn't reach Shadow Check-in again", async () => {
    const path = bookingPath();
    expect((await site(path)(get(stay))).status).toBe(200);
    expect(read((await availabilityChecker(path, "198.51.100.7")(stay)).content)).toMatchObject({ bookable: true });
    expect(lookups()).toBe(1);
  });

  it("counts against the guest's own address, inside the same per-client limits", async () => {
    const path = bookingPath();
    for (let i = 0; i < LOOKUP_LIMITS.perClient.limit; i++) expect((await site(path)(get(stay))).status).toBe(200);
    const limited = await availabilityChecker(path, guest)(stay);
    expect(limited.isError).toBe(true);
    expect(read(limited.content)).toMatchObject({ error: "rate_limited", retry_after_minutes: 10 });
    // Another guest is not held back.
    expect(read((await availabilityChecker(path, "198.51.100.7")(stay)).content)).toMatchObject({ bookable: true });
  });

  it("spends the same allowance at Shadow Check-in as the booking form", async () => {
    const path = bookingPath();
    const from = (i: number) => ({ ...stay, check_in: addDays(TODAY, 1 + i), check_out: addDays(TODAY, 3 + i) });
    for (let i = 0; i < LOOKUP_LIMITS.perInstance.capacity; i++) {
      expect((await site(path)(get(from(i), `198.51.100.${i}`))).status).toBe(200);
    }
    const busy = await availabilityChecker(path, "192.0.2.1")(from(99));
    expect(busy.isError).toBe(true);
    expect(read(busy.content)).toMatchObject({ error: "busy" });
    expect(lookups()).toBe(LOOKUP_LIMITS.perInstance.capacity);
  });

  it("relays Shadow Check-in's refusals, a closed booking line and failures", async () => {
    const check = availabilityChecker(bookingPath(), guest);
    // The fake takes stays of 1 to 30 nights, for up to 6 guests.
    expect(read((await check({ ...stay, check_out: addDays(stay.check_in, 31) })).content)).toMatchObject({
      bookable: false,
      reason: "not_taken_online",
    });
    expect(read((await check({ ...stay, guests: 7 })).content)).toMatchObject({ bookable: false, reason: "too_many_guests" });

    const cases: [FakeShadow["state"]["mode"], boolean, Record<string, unknown>][] = [
      ["not_configured", false, { reason: "booking_closed" }],
      ["rate_limited", true, { error: "busy" }],
      ["server_error", true, { error: "unavailable" }],
    ];
    for (const [mode, isError, expected] of cases) {
      fake.reset();
      fake.state.mode = mode;
      const outcome = await availabilityChecker(bookingPath(), guest)(stay);
      expect(outcome.isError, mode).toBe(isError);
      expect(read(outcome.content), mode).toMatchObject(expected);
      expect(outcome.card).toBeNull();
    }
    expect(read((await availabilityChecker(bookingPath(false), guest)(stay)).content)).toMatchObject({ reason: "booking_closed" });
  });
});
