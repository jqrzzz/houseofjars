import { processSingleton, type GateDecision, type Limit } from "../gate";
import { createRateLimiter, createWindowLimiter, type RateLimitDecision, type WindowLimiter } from "../rate-limit";

/*
 * The website's limits in front of Shadow Check-in's booking API, kept
 * strictly inside Shadow's limits for the website's key (docs/BOOKING_API.md).
 * A client is an IPv4 address or an IPv6 /64 (lib/rate-limit.ts).
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Shadow Check-in's limit on booking requests per inbound key, in any rolling hour (the booking contract). */
export const SHADOW_BOOKING_HOURLY_LIMIT = 30;

export interface Window {
  /** Requests allowed in any window. */
  readonly limit: number;
  readonly windowMs: number;
}

/**
 * Booking requests, counted only when valid and on their way to Shadow. Each
 * request that is accepted may hold beds while the team confirms it, so no
 * one client may send many (F1W-01):
 *  - new requests per client: at most 3 in any hour and 6 in any day (a new
 *    client_ref is a new request);
 *  - the same request again (its client_ref already sent, after a timeout or
 *    an error): at most 10 in any hour per client. Shadow answers a repeat
 *    with the booking it has, never a second one, so a guest retrying while
 *    Shadow is failing never spends their allowance for new requests;
 *  - per server instance, every call: 10 at once, then one every 6 minutes,
 *    so at most 20 in any hour, under Shadow's 30.
 */
export const BOOKING_LIMITS = {
  perClientHour: { limit: 3, windowMs: HOUR },
  perClientDay: { limit: 6, windowMs: DAY },
  repeatsPerClient: { limit: 10, windowMs: HOUR },
  perInstance: { capacity: 10, refillMs: 6 * MINUTE },
} as const satisfies Record<string, Window | Limit>;

/**
 * Availability lookups (F1W-02):
 *  - per client, every valid lookup (cached answers included): at most 20 in
 *    any 10 minutes;
 *  - per client, lookups that reach Shadow (the cache can't answer): at most
 *    8 in any 10 minutes, so no one visitor can use up the instance's
 *    allowance by asking about dates nobody else has;
 *  - per server instance, lookups that reach Shadow: 20 at once, then one
 *    every 20 seconds, so at most 200 in any hour. Shadow's own limit for
 *    the key must stay above that.
 */
export const LOOKUP_LIMITS = {
  perClient: { limit: 20, windowMs: 10 * MINUTE },
  perClientUncached: { limit: 8, windowMs: 10 * MINUTE },
  perInstance: { capacity: 20, refillMs: 20_000 },
} as const satisfies Record<string, Window | Limit>;

/** Why a booking request can't go to Shadow now, or that it can (and it has been counted). */
export interface BookingGate {
  take(client: string, clientRef: string): GateDecision;
}

export interface LookupLimiters {
  readonly perClient: WindowLimiter;
  readonly perClientUncached: WindowLimiter;
  readonly perInstance: { take(key: string): RateLimitDecision };
}

const refused = (decisions: readonly RateLimitDecision[]): RateLimitDecision | null => {
  const no = decisions.filter((decision) => !decision.allowed);
  return no.length > 0 ? { allowed: false, retryAfterSeconds: Math.max(...no.map((d) => d.retryAfterSeconds)) } : null;
};

/**
 * The client's own limits first, so one client can't drain everyone's
 * allowance; a request the instance turns away (busy) costs the client
 * nothing.
 */
export function createBookingGate(now: () => number = Date.now): BookingGate {
  const hour = createWindowLimiter({ ...BOOKING_LIMITS.perClientHour, now });
  const day = createWindowLimiter({ ...BOOKING_LIMITS.perClientDay, now });
  const repeats = createWindowLimiter({ ...BOOKING_LIMITS.repeatsPerClient, now });
  const instance = createRateLimiter({ ...BOOKING_LIMITS.perInstance, now, maxKeys: 1 });
  // "client client_ref" -> when it was first let through, least recent first; kept for a day, like the daily limit.
  const sent = new Map<string, number>();

  return {
    take(client, clientRef) {
      const time = now();
      for (const [key, at] of sent) {
        if (time - at < DAY) break;
        sent.delete(key);
      }
      const ref = `${client} ${clientRef}`;
      const repeat = sent.has(ref);
      const own = repeat ? [repeats] : [hour, day];
      const limited = refused(own.map((limiter) => limiter.check(client)));
      if (limited) return { allowed: false, reason: "rate_limited", retryAfterSeconds: limited.retryAfterSeconds };
      const everyone = instance.take("all");
      if (!everyone.allowed) return { allowed: false, reason: "busy", retryAfterSeconds: everyone.retryAfterSeconds };
      for (const limiter of own) limiter.record(client);
      if (!repeat) {
        sent.set(ref, time);
        // Bounded like the limiters: at most 6 new requests per client per day, for 10,000 clients.
        if (sent.size > 60_000) sent.delete(sent.keys().next().value!);
      }
      return { allowed: true };
    },
  };
}

export function createLookupLimiters(now?: () => number): LookupLimiters {
  return {
    perClient: createWindowLimiter({ ...LOOKUP_LIMITS.perClient, now }),
    perClientUncached: createWindowLimiter({ ...LOOKUP_LIMITS.perClientUncached, now }),
    perInstance: createRateLimiter({ ...LOOKUP_LIMITS.perInstance, now, maxKeys: 1 }),
  };
}

export function sharedBookingGate(): BookingGate {
  return processSingleton("houseofjars.booking-gate", () => createBookingGate());
}

export function sharedLookupLimiters(): LookupLimiters {
  return processSingleton("houseofjars.lookup-limiters", () => createLookupLimiters());
}
