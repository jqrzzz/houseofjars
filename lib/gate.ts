import { json } from "./http";
import { clientKey, createRateLimiter } from "./rate-limit";

/*
 * A gate in front of a Shadow Check-in endpoint the website reaches with the
 * property's one inbound key. Shadow limits that key; the gate keeps the
 * website strictly inside the limit, so no single client, and no single
 * server instance, can use up the house's quota: a bucket per client (an IPv4
 * address or IPv6 /64), then one for every client together.
 */

export interface Limit {
  /** Requests allowed in a burst. */
  readonly capacity: number;
  /** Milliseconds to earn back one request. */
  readonly refillMs: number;
}

export interface GateLimits {
  readonly perClient: Limit;
  readonly perInstance: Limit;
}

export type GateDecision =
  | { readonly allowed: true }
  /** rate_limited: this client sent too many; busy: too many from everyone (or Shadow said so). */
  | { readonly allowed: false; readonly reason: "rate_limited" | "busy"; readonly retryAfterSeconds: number };

export interface Gate {
  take(clientKey: string): GateDecision;
}

/** The most a limit lets through in any hour: the burst, then the refill. */
export function hourlyCeiling(limit: Limit): number {
  return limit.capacity + Math.floor(3_600_000 / limit.refillMs);
}

export function createGate(limits: GateLimits, now?: () => number): Gate {
  const perClient = createRateLimiter({ ...limits.perClient, now });
  const perInstance = createRateLimiter({ ...limits.perInstance, now, maxKeys: 1 });
  return {
    take(key) {
      // The client's own limit first, so one client can't drain everyone's allowance.
      const client = perClient.take(key);
      if (!client.allowed) return { allowed: false, reason: "rate_limited", retryAfterSeconds: client.retryAfterSeconds };
      const everyone = perInstance.take("all");
      if (!everyone.allowed) return { allowed: false, reason: "busy", retryAfterSeconds: everyone.retryAfterSeconds };
      return { allowed: true };
    },
  };
}

/** The gate's answer as a response: 429 when this client sent too many, 503 busy when everyone did. */
export function gateRefusal(gate: Gate, request: Request): Response | null {
  const decision = gate.take(clientKey(request.headers));
  if (decision.allowed) return null;
  return json(
    { error: decision.reason },
    decision.reason === "rate_limited" ? 429 : 503,
    { "retry-after": String(decision.retryAfterSeconds) },
  );
}

/**
 * One value per server process, even if the bundler gives each route its own
 * copy of the module that creates it (routes sharing Shadow's key must share
 * its gate).
 */
export function processSingleton<T>(name: string, create: () => T): T {
  const store = globalThis as unknown as Record<symbol, T | undefined>;
  const key = Symbol.for(name);
  return (store[key] ??= create());
}
