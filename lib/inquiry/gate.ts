import { createGate, processSingleton, type Gate } from "../gate";

export type { GateDecision } from "../gate";

/*
 * Shadow Check-in accepts at most SHADOW_HOURLY_LIMIT inquiries in any rolling
 * hour per inbound key, and the website has one key for the booking form and
 * Shadow together. These limits keep the website strictly inside that:
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

export type InquiryGate = Gate;

export function createInquiryGate(now?: () => number): InquiryGate {
  return createGate({ perClient: PER_CLIENT, perInstance: PER_INSTANCE }, now);
}

/**
 * The one gate in this server process. /api/inquiry and /api/concierge/send
 * both use it (they share Shadow's key), even if the bundler gives each route
 * its own copy of this module.
 */
export function sharedInquiryGate(): InquiryGate {
  return processSingleton("houseofjars.inquiry-gate", () => createInquiryGate());
}
