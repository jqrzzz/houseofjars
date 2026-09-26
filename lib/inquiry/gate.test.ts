import { describe, expect, it } from "vitest";
import { createInquiryGate, PER_CLIENT, PER_INSTANCE, SHADOW_HOURLY_LIMIT, sharedInquiryGate } from "./gate";

const HOUR = 60 * 60_000;

function clock() {
  let time = 0;
  return { now: () => time, set: (ms: number) => (time = ms) };
}

/** Everything the gate lets through in [from, from + 1 hour), sending every `stepMs`. */
function allowedInOneHour(take: (i: number) => boolean, stepMs: number, time: ReturnType<typeof clock>, from = 0) {
  let allowed = 0;
  for (let i = 0, t = from; t < from + HOUR; i++, t += stepMs) {
    time.set(t);
    if (take(i)) allowed++;
  }
  return allowed;
}

describe("inquiry gate (R4-02)", () => {
  it("keeps the numbers strictly inside Shadow's per-key limit", () => {
    const perClientHour = PER_CLIENT.capacity + HOUR / PER_CLIENT.refillMs;
    const perInstanceHour = PER_INSTANCE.capacity + HOUR / PER_INSTANCE.refillMs;
    expect(perClientHour).toBe(6);
    expect(perInstanceHour).toBe(20);
    expect(perInstanceHour).toBeLessThan(SHADOW_HOURLY_LIMIT);
  });

  it("lets one client through at most 6 times in an hour, however fast it sends", () => {
    const time = clock();
    const gate = createInquiryGate(time.now);
    expect(allowedInOneHour(() => gate.take("203.0.113.9").allowed, 10_000, time)).toBeLessThanOrEqual(6);
  });

  it("keeps an attacker with endless addresses under the limit, and tells real guests it is busy", () => {
    const time = clock();
    const gate = createInquiryGate(time.now);
    const through = allowedInOneHour((i) => gate.take(`198.51.${i >> 8}.${i & 255}`).allowed, 5_000, time);
    expect(through).toBeLessThanOrEqual(20);
    expect(gate.take("192.0.2.77")).toMatchObject({ allowed: false, reason: "busy" });
  });

  it("leaves the reviewer's scenario harmless: one address every 2 minutes can't lock out a guest", () => {
    const time = clock();
    const gate = createInquiryGate(time.now);
    const attacker = allowedInOneHour(() => gate.take("203.0.113.9").allowed, 2 * 60_000, time);
    expect(attacker).toBeLessThanOrEqual(6);
    expect(gate.take("198.51.100.20").allowed).toBe(true);
  });

  it("is one gate per process, shared by the form and Shadow's send route", () => {
    expect(sharedInquiryGate()).toBe(sharedInquiryGate());
  });
});
