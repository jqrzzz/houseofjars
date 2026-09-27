import type { ShadowConfig } from "../inquiry/submit";
import {
  hasQuote,
  readAvailability,
  readConfirmation,
  readPriceChange,
  refusedIssues,
  refusedOnlyTheBody,
  withoutQuote,
  type AvailabilityQuery,
} from "./contract";
import type { Availability, BookingConfirmation, BookingRequest, FieldIssue, Quote } from "./types";

/*
 * The website's two calls to Shadow Check-in's booking API, with the
 * property's inbound key (server side only). Neither throws: every answer
 * maps to a result the routes turn into a calm message for the guest.
 */

/**
 * busy: Shadow's limit for the website's key was reached. That limit is
 * shared by every guest, so it is never reported as the guest sending too much.
 */
export type ShadowProblem = "busy" | "not_configured" | "unavailable";

export type LookupResult =
  | { readonly ok: true; readonly availability: Availability }
  | { readonly ok: false; readonly error: "invalid_request"; readonly issues: readonly FieldIssue[] }
  | { readonly ok: false; readonly error: ShadowProblem };

export type BookingResult =
  | { readonly ok: true; readonly confirmation: BookingConfirmation; readonly repeat: boolean }
  /** Shadow's 409: the beds are no longer free. */
  | { readonly ok: false; readonly error: "taken" }
  /** Shadow's 409: its total isn't the one the guest saw, so nothing was booked; `quote` is its total now. */
  | { readonly ok: false; readonly error: "price_changed"; readonly quote: Quote }
  | { readonly ok: false; readonly error: "invalid_request"; readonly issues: readonly FieldIssue[] }
  | { readonly ok: false; readonly error: ShadowProblem };

export interface ShadowCallDeps {
  readonly config: ShadowConfig;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
  readonly log?: (message: string) => void;
}

/** A call to Shadow, or null when it could not be reached (logged, never with guest data). */
async function call(path: string, init: RequestInit, deps: ShadowCallDeps, what: string): Promise<Response | null> {
  try {
    return await (deps.fetch ?? fetch)(`${deps.config.apiUrl}${path}`, {
      ...init,
      headers: { ...init.headers, authorization: `Bearer ${deps.config.key}` },
      signal: AbortSignal.timeout(deps.timeoutMs ?? 10_000),
      cache: "no-store",
    });
  } catch (error) {
    log(deps, `[booking] Shadow unreachable for ${what}: ${error instanceof Error ? error.name : "unknown error"}`);
    return null;
  }
}

function log(deps: ShadowCallDeps, message: string) {
  (deps.log ?? ((text: string) => console.error(text)))(message);
}

/** How the answers both endpoints share map to a problem. */
function problemFor(status: number, deps: ShadowCallDeps, what: string): ShadowProblem {
  switch (status) {
    case 429:
      log(deps, `[booking] Shadow's limit for this key was reached (${what}, 429)`);
      return "busy";
    case 503:
      return "not_configured";
    case 401:
    case 403:
      log(deps, `[booking] Shadow refused the inbound key (${what}, ${status}); check SHADOW_INQUIRY_KEY`);
      return "unavailable";
    default:
      log(deps, `[booking] Shadow answered ${status} (${what})`);
      return "unavailable";
  }
}

/** GET {SHADOW_API_URL}/api/public/availability */
export async function lookUpAvailability(query: AvailabilityQuery, deps: ShadowCallDeps): Promise<LookupResult> {
  const search = new URLSearchParams({
    check_in: query.check_in,
    check_out: query.check_out,
    guests: String(query.guests),
  });
  const response = await call(`/api/public/availability?${search}`, { method: "GET" }, deps, "availability");
  if (!response) return { ok: false, error: "unavailable" };

  if (response.status === 200) {
    const availability = readAvailability(await response.json().catch(() => null), query);
    if (availability) return { ok: true, availability };
    log(deps, "[booking] Shadow's availability did not match the contract");
    return { ok: false, error: "unavailable" };
  }
  if (response.status === 400) {
    return { ok: false, error: "invalid_request", issues: refusedIssues(await response.json().catch(() => null)) };
  }
  return { ok: false, error: problemFor(response.status, deps, "availability") };
}

/**
 * POST {SHADOW_API_URL}/api/public/booking-requests
 *
 * The request carries the total the guest saw (quoted_total and
 * quoted_currency), so Shadow books nothing at a price the guest didn't see.
 * A Shadow Check-in from before that part of the contract refuses keys it
 * doesn't know: when its 400 is about the body as a whole, the same request
 * goes again without the quote (nothing was stored), and the confirmation
 * still says if the total differs from the one shown.
 */
export async function sendBookingRequest(request: BookingRequest, deps: ShadowCallDeps): Promise<BookingResult> {
  const post = (body: BookingRequest) =>
    call(
      "/api/public/booking-requests",
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
      deps,
      "booking request",
    );
  let response = await post(request);
  if (response?.status === 400 && hasQuote(request)) {
    const refusal: unknown = await response
      .clone()
      .json()
      .catch(() => null);
    if (refusedOnlyTheBody(refusal)) {
      log(deps, "[booking] Shadow refused the price quote (400); sent the request without it. Update Shadow Check-in for price protection.");
      response = await post(withoutQuote(request));
    }
  }
  if (!response) return { ok: false, error: "unavailable" };

  if (response.status === 201 || response.status === 200) {
    const confirmation = readConfirmation(await response.json().catch(() => null));
    if (confirmation) return { ok: true, confirmation, repeat: response.status === 200 };
    // Shadow may well have stored it: the guest keeps the same client_ref, so trying again is safe.
    log(deps, `[booking] Shadow answered ${response.status} with an unexpected body`);
    return { ok: false, error: "unavailable" };
  }
  switch (response.status) {
    case 409: {
      const change = readPriceChange(await response.json().catch(() => null));
      return change.changed ? { ok: false, error: "price_changed", quote: change.quote } : { ok: false, error: "taken" };
    }
    case 400:
      log(deps, "[booking] Shadow rejected the booking request (400)");
      return { ok: false, error: "invalid_request", issues: refusedIssues(await response.json().catch(() => null)) };
    case 413:
      log(deps, "[booking] Shadow rejected the booking request as too large (413)");
      return { ok: false, error: "invalid_request", issues: refusedIssues(null) };
    default:
      return { ok: false, error: problemFor(response.status, deps, "booking request") };
  }
}
