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

/** Best-effort client IP. On Vercel the platform sets x-forwarded-for. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
