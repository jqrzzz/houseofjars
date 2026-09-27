import { describe, expect, it } from "vitest";
import { AVAILABILITY_TTL_MS, createAvailabilityCache } from "./cache";
import type { LookupResult } from "./shadow";

const answer = (result: LookupResult) => Promise.resolve(result);
const found: LookupResult = { ok: true, availability: {} as never };
const q = (check_in: string, check_out: string, guests = 2) => ({ check_in, check_out, guests });

describe("availability cache", () => {
  it("keeps an answer for 60 seconds, for exactly the same query", () => {
    let time = 0;
    const cache = createAvailabilityCache(() => time);
    const lookup = answer(found);
    cache.put(q("2026-10-03", "2026-10-05"), lookup);
    expect(cache.get(q("2026-10-03", "2026-10-05"))).toBe(lookup);
    expect(cache.get(q("2026-10-03", "2026-10-05", 3))).toBeNull();
    time = AVAILABILITY_TTL_MS - 1;
    expect(cache.get(q("2026-10-03", "2026-10-05"))).toBe(lookup);
    time = AVAILABILITY_TTL_MS;
    expect(cache.get(q("2026-10-03", "2026-10-05"))).toBeNull();
  });

  it("keeps availability, 'not open' and Shadow turning the stay down, and drops failures once they arrive", async () => {
    const cache = createAvailabilityCache(() => 0);
    cache.put(q("2026-10-01", "2026-10-02"), answer({ ok: false, error: "not_configured" }));
    cache.put(q("2026-10-02", "2026-10-03"), answer({ ok: false, error: "unavailable" }));
    cache.put(q("2026-10-03", "2026-10-04"), answer({ ok: false, error: "busy" }));
    cache.put(q("2026-10-04", "2026-10-05", 7), answer({ ok: false, error: "invalid_request", issues: [] }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cache.get(q("2026-10-01", "2026-10-02"))).not.toBeNull();
    expect(cache.get(q("2026-10-02", "2026-10-03"))).toBeNull();
    expect(cache.get(q("2026-10-03", "2026-10-04"))).toBeNull();
    expect(cache.get(q("2026-10-04", "2026-10-05", 7))).not.toBeNull();
  });

  it("forgets answers that share a night with a booking, and only those", () => {
    const cache = createAvailabilityCache(() => 0);
    const stays = [q("2026-10-01", "2026-10-03"), q("2026-10-02", "2026-10-06"), q("2026-10-05", "2026-10-07"), q("2026-09-28", "2026-10-02")];
    for (const stay of stays) cache.put(stay, answer(found));
    cache.invalidate("2026-10-03", "2026-10-05");
    // Check-out on the 3rd shares no night with a stay from the 3rd; nor does check-in on the 5th with one ending on the 5th.
    expect(stays.map((stay) => cache.get(stay) !== null)).toEqual([true, false, true, true]);
  });

  it("stays bounded, dropping the oldest answers first", () => {
    const cache = createAvailabilityCache(() => 0);
    for (let i = 0; i < 600; i++) cache.put(q("2026-10-01", "2026-10-02", i), answer(found));
    expect(cache.size).toBe(500);
    expect(cache.get(q("2026-10-01", "2026-10-02", 0))).toBeNull();
    expect(cache.get(q("2026-10-01", "2026-10-02", 599))).not.toBeNull();
  });
});
