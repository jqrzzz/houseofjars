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
  kindLabel,
  postBooking,
  priceLines,
  stepForIssues,
  unavailableText,
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
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function answer(status: number, body: unknown) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }));
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
      expect(await postBooking(bookingBody("r", stay, room.id, { ...EMPTY_DETAILS, name: "Mai" })), String(status)).toMatchObject({
        ok: false,
        problem,
      });
    }
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    expect(await fetchAvailability(stay)).toEqual({ ok: false, problem: "unavailable", issues: [] });
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

  it("builds the contract's body: trimmed, blanks as null, no price", () => {
    const body = bookingBody("ref", stay, room.id, { ...valid, name: " Mai ", message: "  " });
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
    });
  });
});

describe("resending", () => {
  it("reuses the client_ref for exactly the same request, and only then", () => {
    let n = 0;
    const next = () => `ref-${++n}`;
    const request = bookingBody("", stay, room.id, { ...EMPTY_DETAILS, name: "Mai", consent: true });
    const first = clientRefFor(null, request, next);
    expect(clientRefFor(first, request, next).ref).toBe("ref-1");
    expect(clientRefFor(first, { ...request, room_type_id: "other" }, next).ref).toBe("ref-2");
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
