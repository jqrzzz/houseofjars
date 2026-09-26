import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "./rate-limit";

function clock(start = 0) {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe("token bucket rate limiter", () => {
  it("allows a burst up to capacity, then refuses with a retry time", () => {
    const { now } = clock();
    const limiter = createRateLimiter({ capacity: 3, refillMs: 10_000, now });
    expect([1, 2, 3].map(() => limiter.take("a").allowed)).toEqual([true, true, true]);
    expect(limiter.take("a")).toEqual({ allowed: false, retryAfterSeconds: 10 });
  });

  it("earns tokens back over time, never above capacity", () => {
    const time = clock();
    const limiter = createRateLimiter({ capacity: 2, refillMs: 1_000, now: time.now });
    limiter.take("a");
    limiter.take("a");
    expect(limiter.take("a").allowed).toBe(false);
    time.advance(1_000);
    expect(limiter.take("a").allowed).toBe(true);
    expect(limiter.take("a").allowed).toBe(false);
    time.advance(60_000);
    expect([1, 2, 3].map(() => limiter.take("a").allowed)).toEqual([true, true, false]);
  });

  it("keeps a separate bucket per key", () => {
    const limiter = createRateLimiter({ capacity: 1, refillMs: 60_000, now: clock().now });
    expect(limiter.take("a").allowed).toBe(true);
    expect(limiter.take("a").allowed).toBe(false);
    expect(limiter.take("b").allowed).toBe(true);
  });

  it("forgets clients once their bucket would be full again", () => {
    const time = clock();
    const limiter = createRateLimiter({ capacity: 2, refillMs: 1_000, now: time.now });
    limiter.take("a");
    limiter.take("b");
    expect(limiter.size).toBe(2);
    time.advance(2_000);
    limiter.take("c");
    expect(limiter.size).toBe(1);
  });

  it("bounds memory by evicting the least recently seen key", () => {
    const limiter = createRateLimiter({ capacity: 1, refillMs: 60_000, maxKeys: 2, now: clock().now });
    limiter.take("a");
    limiter.take("b");
    limiter.take("c");
    expect(limiter.size).toBe(2);
    // "a" was evicted, so it starts with a full bucket again.
    expect(limiter.take("a").allowed).toBe(true);
  });
});

describe("clientIp", () => {
  it("uses the first forwarded address, then x-real-ip", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
