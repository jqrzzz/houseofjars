import { json, readJsonBody, rejectCrossSite, rejectForeignOrigin } from "../http";
import { submitErrorStatus, type ShadowConfig } from "../inquiry/submit";
import { clientKey } from "../rate-limit";
import type { AvailabilityCache } from "./cache";
import { MAX_BOOKING_BYTES, parseAvailabilityQuery, parseBookingRequest } from "./contract";
import type { BookingGate, LookupLimiters } from "./limits";
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
  readonly gate: BookingGate;
}

const rateLimited = (retryAfterSeconds: number) =>
  json({ error: "rate_limited" }, 429, { "retry-after": String(retryAfterSeconds) });

/** GET /api/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=N: free beds (and prices, where set). */
export function createAvailabilityHandler(deps: AvailabilityHandlerDeps) {
  return async function handleAvailability(request: Request): Promise<Response> {
    const refused = rejectForeignOrigin(request, deps.siteUrl);
    if (refused) return refused;

    const config = deps.config();
    if (!config) return json({ error: "not_configured" }, 503);

    const parsed = parseAvailabilityQuery(new URL(request.url).searchParams, deps.now?.());
    if (!parsed.ok) return json({ error: "invalid_request", issues: parsed.issues }, 400);

    const client = clientKey(request.headers);
    const own = deps.limiters.perClient.check(client);
    if (!own.allowed) return rateLimited(own.retryAfterSeconds);
    deps.limiters.perClient.record(client);

    // The cache's key is the checked query (parseAvailabilityQuery), so no way of writing a query can get past it.
    let lookup = deps.cache.get(parsed.query);
    if (!lookup) {
      // Only lookups that reach Shadow count against the client's share and everyone's allowance.
      const fresh = deps.limiters.perClientUncached.check(client);
      if (!fresh.allowed) return rateLimited(fresh.retryAfterSeconds);
      const everyone = deps.limiters.perInstance.take("all");
      if (!everyone.allowed) return json({ error: "busy" }, 503, { "retry-after": String(everyone.retryAfterSeconds) });
      deps.limiters.perClientUncached.record(client);
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

    // Only requests that would reach Shadow count, so fixing a typo never locks a guest out; and sending
    // the same request again (its client_ref) never counts as a new one.
    const booking = parsed.request;
    const decision = deps.gate.take(clientKey(request.headers), booking.client_ref);
    if (!decision.allowed) {
      return decision.reason === "rate_limited"
        ? rateLimited(decision.retryAfterSeconds)
        : json({ error: "busy" }, 503, { "retry-after": String(decision.retryAfterSeconds) });
    }

    const result = await sendBookingRequest(booking, { config, fetch: deps.fetch, timeoutMs: deps.timeoutMs, log: deps.log });
    // Beds or prices on those nights just changed: the next guest must hear it from Shadow.
    if (result.ok || result.error === "taken" || result.error === "price_changed") {
      deps.cache.invalidate(booking.check_in, booking.check_out);
    }

    if (result.ok) return json(result.confirmation, result.repeat ? 200 : 201);
    if (result.error === "taken") return json({ error: "taken" }, 409);
    if (result.error === "price_changed") return json({ error: "price_changed", ...result.quote }, 409);
    if (result.error === "invalid_request") return json({ error: "invalid_request", issues: result.issues }, 400);
    return json({ error: result.error }, submitErrorStatus[result.error]);
  };
}
