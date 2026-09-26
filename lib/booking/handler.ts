import { gateRefusal, type Gate } from "../gate";
import { json, readJsonBody, rejectCrossSite, rejectForeignOrigin } from "../http";
import { submitErrorStatus, type ShadowConfig } from "../inquiry/submit";
import { clientKey } from "../rate-limit";
import type { AvailabilityCache } from "./cache";
import { MAX_BOOKING_BYTES, parseAvailabilityQuery, parseBookingRequest } from "./contract";
import type { LookupLimiters } from "./limits";
import { lookUpAvailability, sendBookingRequest } from "./shadow";

interface ShadowRouteDeps {
  /** Shadow's address and the property's key; null when either is not set. */
  readonly config: () => ShadowConfig | null;
  /** Answers about the same dates and guests, shared by both routes. */
  readonly cache: AvailabilityCache;
  readonly siteUrl: string;
  readonly fetch?: typeof fetch;
  /** How long to wait for Shadow (default 10 seconds). */
  readonly timeoutMs?: number;
  readonly now?: () => number;
  readonly log?: (message: string) => void;
}

export interface AvailabilityHandlerDeps extends ShadowRouteDeps {
  readonly limiters: LookupLimiters;
}

export interface BookingHandlerDeps extends ShadowRouteDeps {
  /** Per client and per instance, strictly inside Shadow's limit for the key. */
  readonly gate: Gate;
}

/** GET /api/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=N: free beds (and prices, where set). */
export function createAvailabilityHandler(deps: AvailabilityHandlerDeps) {
  return async function handleAvailability(request: Request): Promise<Response> {
    const refused = rejectForeignOrigin(request, deps.siteUrl);
    if (refused) return refused;

    const config = deps.config();
    if (!config) return json({ error: "not_configured" }, 503);

    const parsed = parseAvailabilityQuery(new URL(request.url).searchParams, deps.now?.());
    if (!parsed.ok) return json({ error: "invalid_request", issues: parsed.issues }, 400);

    const client = deps.limiters.perClient.take(clientKey(request.headers));
    if (!client.allowed) {
      return json({ error: "rate_limited" }, 429, { "retry-after": String(client.retryAfterSeconds) });
    }

    let lookup = deps.cache.get(parsed.query);
    if (!lookup) {
      // Only lookups that reach Shadow count against everyone's allowance.
      const everyone = deps.limiters.perInstance.take("all");
      if (!everyone.allowed) return json({ error: "busy" }, 503, { "retry-after": String(everyone.retryAfterSeconds) });
      lookup = lookUpAvailability(parsed.query, { config, fetch: deps.fetch, timeoutMs: deps.timeoutMs, log: deps.log });
      deps.cache.put(parsed.query, lookup);
    }

    const result = await lookup;
    if (result.ok) return json(result.availability);
    if (result.error === "invalid_request") return json({ error: "invalid_request", issues: result.issues }, 400);
    return json({ error: result.error }, submitErrorStatus[result.error]);
  };
}

/** POST /api/booking: a guest's booking request, forwarded to Shadow Check-in exactly as the contract says. */
export function createBookingHandler(deps: BookingHandlerDeps) {
  return async function handleBooking(request: Request): Promise<Response> {
    const refused = rejectCrossSite(request, deps.siteUrl);
    if (refused) return refused;

    const config = deps.config();
    if (!config) return json({ error: "not_configured" }, 503);

    const body = await readJsonBody(request, MAX_BOOKING_BYTES);
    if (!body.ok) {
      return body.status === 413
        ? json({ error: "payload_too_large" }, 413)
        : json({ error: "invalid_request", issues: [{ field: "form", message: "The request was not valid JSON." }] }, 400);
    }

    const parsed = parseBookingRequest(body.value, deps.now?.());
    if (!parsed.ok) return json({ error: "invalid_request", issues: parsed.issues }, 400);

    // Only requests that would reach Shadow count, so fixing a typo never locks a guest out.
    const refusal = gateRefusal(deps.gate, request);
    if (refusal) return refusal;

    const booking = parsed.request;
    const result = await sendBookingRequest(booking, { config, fetch: deps.fetch, timeoutMs: deps.timeoutMs, log: deps.log });
    // Beds on those nights just changed (or were already gone): the next guest must hear it from Shadow.
    if (result.ok || result.error === "taken") deps.cache.invalidate(booking.check_in, booking.check_out);

    if (result.ok) return json(result.confirmation, result.repeat ? 200 : 201);
    if (result.error === "taken") return json({ error: "taken" }, 409);
    if (result.error === "invalid_request") return json({ error: "invalid_request", issues: result.issues }, 400);
    return json({ error: result.error }, submitErrorStatus[result.error]);
  };
}
