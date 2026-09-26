import { createGate, processSingleton, type Gate, type GateLimits } from "../gate";
import { createRateLimiter, type RateLimitDecision } from "../rate-limit";

/*
 * The website's limits in front of Shadow Check-in's booking API, kept
 * strictly inside Shadow's limits for the website's key (docs/BOOKING_API.md).
 */

/** Shadow Check-in's limit on booking requests per inbound key, in any rolling hour (the booking contract). */
export const SHADOW_BOOKING_HOURLY_LIMIT = 30;

/**
 * Booking requests, counted only when valid and on their way to Shadow:
 *  - per client (an IPv4 address or IPv6 /64): 3 at once, then one every
 *    20 minutes, so at most 6 in any hour;
 *  - per server instance: 10 at once, then one every 6 minutes, so at most 20
 *    in any hour, under Shadow's 30.
 */
export const BOOKING_LIMITS: GateLimits = {
  perClient: { capacity: 3, refillMs: 20 * 60_000 },
  perInstance: { capacity: 10, refillMs: 6 * 60_000 },
};

/**
 * Availability lookups:
 *  - per client, every valid lookup: 20 at once, then one every 6 seconds;
 *  - per server instance, only lookups that reach Shadow (the cache answers
 *    the rest): 20 at once, then one every 20 seconds, so at most 200 in any
 *    hour. Shadow's own limit for the key must stay above that.
 */
export const LOOKUP_LIMITS: GateLimits = {
  perClient: { capacity: 20, refillMs: 6_000 },
  perInstance: { capacity: 20, refillMs: 20_000 },
};

export interface LookupLimiters {
  readonly perClient: { take(key: string): RateLimitDecision };
  readonly perInstance: { take(key: string): RateLimitDecision };
}

export function createBookingGate(now?: () => number): Gate {
  return createGate(BOOKING_LIMITS, now);
}

export function createLookupLimiters(now?: () => number): LookupLimiters {
  return {
    perClient: createRateLimiter({ ...LOOKUP_LIMITS.perClient, now }),
    perInstance: createRateLimiter({ ...LOOKUP_LIMITS.perInstance, now, maxKeys: 1 }),
  };
}

export function sharedBookingGate(): Gate {
  return processSingleton("houseofjars.booking-gate", () => createBookingGate());
}

export function sharedLookupLimiters(): LookupLimiters {
  return processSingleton("houseofjars.lookup-limiters", () => createLookupLimiters());
}
