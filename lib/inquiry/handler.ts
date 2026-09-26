import { json, readJsonBody, rejectCrossSite } from "../http";
import { clientKey, type RateLimitDecision } from "../rate-limit";
import { buildPayload, inquiryFormSchema, toFieldIssues } from "./schema";
import { submitInquiry, type ShadowConfig, type SubmitError } from "./submit";

export const MAX_INQUIRY_BYTES = 16 * 1024;

const STATUS: Record<SubmitError, number> = {
  invalid_request: 400,
  rate_limited: 429,
  not_configured: 503,
  unavailable: 502,
};

export interface InquiryHandlerDeps {
  readonly config: () => ShadowConfig | null;
  readonly limiter: { take(key: string): RateLimitDecision };
  readonly siteUrl: string;
  readonly fetch?: typeof fetch;
}

/** POST /api/inquiry: the booking form's route to Shadow Check-in. */
export function createInquiryHandler(deps: InquiryHandlerDeps) {
  return async function handleInquiry(request: Request): Promise<Response> {
    const refused = rejectCrossSite(request, deps.siteUrl);
    if (refused) return refused;

    const config = deps.config();
    if (!config) return json({ error: "not_configured" }, 503);

    const body = await readJsonBody(request, MAX_INQUIRY_BYTES);
    if (!body.ok) {
      return body.status === 413
        ? json({ error: "payload_too_large" }, 413)
        : json({ error: "invalid_request", issues: [{ field: "form", message: "The request was not valid JSON." }] }, 400);
    }

    const form = inquiryFormSchema.safeParse(body.value);
    if (!form.success) return json({ error: "invalid_request", issues: toFieldIssues(form.error) }, 400);

    // Only requests that would reach Shadow count, so fixing a typo never locks a guest out.
    const decision = deps.limiter.take(clientKey(request.headers));
    if (!decision.allowed) {
      return json({ error: "rate_limited" }, 429, { "retry-after": String(decision.retryAfterSeconds) });
    }

    const payload = buildPayload(form.data, { client_ref: form.data.client_ref, source: "website_form" });
    const result = await submitInquiry(payload, { config, fetch: deps.fetch });
    if (result.ok) return json({ status: "received", id: result.id }, result.duplicate ? 200 : 201);
    return json({ error: result.error, ...(result.issues ? { issues: result.issues } : {}) }, STATUS[result.error]);
  };
}
