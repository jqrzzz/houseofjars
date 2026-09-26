import { createRateLimiter } from "../rate-limit";

/*
 * Shadow Check-in accepts at most SHADOW_HOURLY_LIMIT inquiries in any rolling
 * hour per inbound key, and the website has one key for the booking form and
 * Shadow together. These limits keep the website strictly inside that, so no
 * single client, and no single server instance, can use up the house's quota:
 *  - per client (an IPv4 address or IPv6 /64): 3 at once, then one every
 *    20 minutes, so at most 6 in any hour;
 *  - per server instance, all clients together: 10 at once, then one every
 *    6 minutes, so at most 20 in any hour.
 * Only valid requests that would reach Shadow are counted.
 */

/** Shadow Check-in's limit per inbound key (HOURLY_LIMIT in its lib/inquiries/contract.ts). */
export const SHADOW_HOURLY_LIMIT = 30;
export const PER_CLIENT = { capacity: 3, refillMs: 20 * 60_000 } as const;
export const PER_INSTANCE = { capacity: 10, refillMs: 6 * 60_000 } as const;

export type GateDecision =
  | { readonly allowed: true }
  /** rate_limited: this client sent too many; busy: too many from everyone (or Shadow said so). */
  | { readonly allowed: false; readonly reason: "rate_limited" | "busy"; readonly retryAfterSeconds: number };

export interface InquiryGate {
  take(clientKey: string): GateDecision;
}

export function createInquiryGate(now?: () => number): InquiryGate {
  const perClient = createRateLimiter({ ...PER_CLIENT, now });
  const perInstance = createRateLimiter({ ...PER_INSTANCE, now, maxKeys: 1 });
  return {
    take(clientKey) {
      // The client's own limit first, so one client can't drain everyone's allowance.
      const client = perClient.take(clientKey);
      if (!client.allowed) return { allowed: false, reason: "rate_limited", retryAfterSeconds: client.retryAfterSeconds };
      const everyone = perInstance.take("all");
      if (!everyone.allowed) return { allowed: false, reason: "busy", retryAfterSeconds: everyone.retryAfterSeconds };
      return { allowed: true };
    },
  };
}

const SHARED = Symbol.for("houseofjars.inquiry-gate");

/**
 * The one gate in this server process. /api/inquiry and /api/concierge/send
 * both use it (they share Shadow's key), even if the bundler gives each route
 * its own copy of this module.
 */
export function sharedInquiryGate(): InquiryGate {
  const store = globalThis as typeof globalThis & { [SHARED]?: InquiryGate };
  return (store[SHARED] ??= createInquiryGate());
}
