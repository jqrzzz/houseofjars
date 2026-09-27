import { isIP } from "node:net";

export interface RateLimiterOptions {
  /** Requests allowed in a burst. */
  readonly capacity: number;
  /** Milliseconds to earn back one request. */
  readonly refillMs: number;
  /** Upper bound on tracked keys, so memory stays bounded. */
  readonly maxKeys?: number;
  readonly now?: () => number;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  /** Seconds until the next request would be allowed (0 when allowed). */
  readonly retryAfterSeconds: number;
}

/**
 * In-memory token bucket per key (usually the client IP).
 *
 * Good enough for one server process. On serverless hosting each instance
 * keeps its own buckets, so in production use a shared store (for example
 * Redis or Vercel KV) if abuse becomes a problem. Shadow Check-in also
 * rate-limits inquiries per property key.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { capacity, refillMs, maxKeys = 10_000, now = Date.now } = options;
  const buckets = new Map<string, { tokens: number; updated: number }>();
  // After this long untouched a bucket is full again, no different from a new one.
  const idleMs = capacity * refillMs;

  return {
    take(key: string): RateLimitDecision {
      const time = now();
      // The Map is in least-recently-used order: forget buckets that have gone idle.
      for (const [staleKey, stale] of buckets) {
        if (time - stale.updated < idleMs) break;
        buckets.delete(staleKey);
      }
      const bucket = buckets.get(key) ?? { tokens: capacity, updated: time };
      const earned = (time - bucket.updated) / refillMs;
      bucket.tokens = Math.min(capacity, bucket.tokens + earned);
      bucket.updated = time;

      // Re-insert so the Map's order tracks recency; evict the stalest key.
      buckets.delete(key);
      buckets.set(key, bucket);
      if (buckets.size > maxKeys) {
        const oldest = buckets.keys().next().value;
        if (oldest !== undefined) buckets.delete(oldest);
      }

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { allowed: true, retryAfterSeconds: 0 };
      }
      return { allowed: false, retryAfterSeconds: Math.ceil(((1 - bucket.tokens) * refillMs) / 1000) };
    },
    /** Number of clients currently tracked (for tests). */
    get size() {
      return buckets.size;
    },
  };
}

export interface WindowLimiterOptions {
  /** Requests allowed in any window. */
  readonly limit: number;
  /** The window's length in milliseconds (an hour, a day). */
  readonly windowMs: number;
  /** Upper bound on tracked keys, so memory stays bounded. */
  readonly maxKeys?: number;
  readonly now?: () => number;
}

export interface WindowLimiter {
  /** Whether one more request would be allowed now, without counting it. */
  check(key: string): RateLimitDecision;
  /** Counts a request. */
  record(key: string): void;
  /** Number of keys currently tracked (for tests). */
  readonly size: number;
}

/**
 * At most `limit` requests per key in any `windowMs`: a sliding window over
 * the times of each key's last `limit` requests. Checking and counting are
 * separate, so a request that another limit turns away costs nothing here.
 * In memory, per server instance, like createRateLimiter.
 */
export function createWindowLimiter(options: WindowLimiterOptions): WindowLimiter {
  const { limit, windowMs, maxKeys = 10_000, now = Date.now } = options;
  // Per key, the times of its latest requests (oldest first), in least-recently-counted order.
  const hits = new Map<string, number[]>();
  const recent = (key: string, time: number) => (hits.get(key) ?? []).filter((at) => time - at < windowMs);

  return {
    check(key) {
      const time = now();
      const times = recent(key, time);
      if (times.length < limit) return { allowed: true, retryAfterSeconds: 0 };
      // The next request is allowed once the oldest of the last `limit` leaves the window.
      const oldest = times[times.length - limit]!;
      return { allowed: false, retryAfterSeconds: Math.ceil((oldest + windowMs - time) / 1000) };
    },
    record(key) {
      const time = now();
      // Keys whose latest request has left the window are no different from new ones.
      for (const [staleKey, stale] of hits) {
        if (time - stale[stale.length - 1]! < windowMs) break;
        hits.delete(staleKey);
      }
      const times = [...recent(key, time), time].slice(-limit);
      hits.delete(key);
      hits.set(key, times);
      if (hits.size > maxKeys) {
        const oldest = hits.keys().next().value;
        if (oldest !== undefined) hits.delete(oldest);
      }
    },
    get size() {
      return hits.size;
    },
  };
}

/**
 * The client's address as the hosting platform saw it. Vercel overwrites
 * x-forwarded-for with the one address it saw; behind another proxy the last
 * entry is the one that proxy added, while earlier entries come from the
 * client and can be anything. Without any proxy, both headers are whatever
 * the client sent.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * What rate limits count against: an IPv4 address, or the /64 network of an
 * IPv6 address. A home or phone connection is usually given a whole /64, so
 * counting single IPv6 addresses would let one client rotate freely.
 */
export function rateLimitKey(address: string): string {
  let host = address.trim().toLowerCase();
  // Some proxies add a port: "203.0.113.9:1234" or "[2001:db8::1]:443".
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(host);
  if (bracketed) host = bracketed[1]!;
  else if (/^[\d.]+:\d+$/.test(host)) host = host.slice(0, host.lastIndexOf(":"));
  host = host.split("%")[0]!; // an IPv6 zone index

  const version = isIP(host);
  if (version === 4) return host;
  if (version !== 6) return host || "unknown";

  const groups = ipv6Groups(host);
  // An IPv4-mapped address (::ffff:203.0.113.9) is an IPv4 client.
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    const [high = 0, low = 0] = groups.slice(6);
    return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
  }
  return `${groups
    .slice(0, 4)
    .map((group) => group.toString(16))
    .join(":")}::/64`;
}

/** The rate-limit key for the client that sent these headers. */
export function clientKey(headers: Headers): string {
  return rateLimitKey(clientIp(headers));
}

/** The eight 16-bit groups of a valid IPv6 address. */
function ipv6Groups(address: string): number[] {
  const [head = "", tail] = address.split("::");
  const parse = (part: string) => (part ? part.split(":").flatMap(ipv6Group) : []);
  const left = parse(head);
  const right = tail === undefined ? [] : parse(tail);
  return [...left, ...Array<number>(8 - left.length - right.length).fill(0), ...right];
}

/** One group, or two for a dotted IPv4 tail. */
function ipv6Group(group: string): number[] {
  if (!group.includes(".")) return [parseInt(group, 16)];
  const [a = 0, b = 0, c = 0, d = 0] = group.split(".").map(Number);
  return [(a << 8) | b, (c << 8) | d];
}
