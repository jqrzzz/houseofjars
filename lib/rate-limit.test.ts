import { describe, expect, it } from "vitest";
import { clientIp, clientKey, createRateLimiter, rateLimitKey } from "./rate-limit";

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
  it("uses the address the nearest proxy added, never a client-supplied first entry (R4-03)", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "192.0.2.1, 203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("rate-limit keys", () => {
  it("counts every address in one IPv6 /64 as one client (R4-03)", () => {
    const keys = ["2001:db8:1:2::1", "2001:db8:1:2::ffff", "2001:0DB8:0001:0002:aaaa:bbbb:cccc:dddd", "[2001:db8:1:2::9]:443"];
    expect(new Set(keys.map(rateLimitKey))).toEqual(new Set(["2001:db8:1:2::/64"]));
    expect(rateLimitKey("2001:db8:1:3::1")).toBe("2001:db8:1:3::/64");
    expect(rateLimitKey("::1")).toBe("0:0:0:0::/64");
    expect(rateLimitKey("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });

  it("keeps IPv4 addresses whole, including IPv4-mapped IPv6 and a trailing port", () => {
    expect(rateLimitKey("203.0.113.9")).toBe("203.0.113.9");
    expect(rateLimitKey("203.0.113.9:51234")).toBe("203.0.113.9");
    expect(rateLimitKey("::ffff:203.0.113.9")).toBe("203.0.113.9");
    expect(rateLimitKey("64:ff9b::203.0.113.9")).toBe("64:ff9b:0:0::/64");
  });

  it("falls back to the raw value for anything that is not an address", () => {
    expect(rateLimitKey(" Unknown ")).toBe("unknown");
    expect(rateLimitKey("")).toBe("unknown");
  });

  it("gives a rotating IPv6 client one bucket", () => {
    const limiter = createRateLimiter({ capacity: 1, refillMs: 60_000, now: clock().now });
    const allowed = [1, 2, 3].map(
      (i) => limiter.take(clientKey(new Headers({ "x-forwarded-for": `2001:db8:1:2::${i}` }))).allowed,
    );
    expect(allowed).toEqual([true, false, false]);
  });
});
