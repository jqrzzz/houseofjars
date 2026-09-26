import { z } from "zod";
import { json, readJsonBody, rejectCrossSite } from "../http";
import { MAX_INQUIRY_BYTES } from "../inquiry/handler";
import { replyChannel } from "../inquiry/reply";
import { buildPayload, inquiryDraftSchema } from "../inquiry/schema";
import { submitErrorStatus, submitInquiry, type ShadowConfig } from "../inquiry/submit";
import { clientKey, type RateLimitDecision } from "../rate-limit";
import type { Signer } from "./signing";

const sendRequestSchema = z.strictObject({
  session_id: z.uuid(),
  /** Exactly the draft the chat window showed the guest. */
  draft: inquiryDraftSchema,
  /** The server's signature on that draft, from the `draft` event. */
  token: z.string().min(1).max(128),
  /** The guest ticked the privacy box for this message. */
  consent: z.literal(true),
});

export interface DraftSendDeps {
  /** Null when ANTHROPIC_API_KEY is not set (no drafts can exist then). */
  readonly signer: () => Signer | null;
  readonly config: () => ShadowConfig | null;
  readonly limiter: { take(key: string): RateLimitDecision };
  readonly siteUrl: string;
  readonly fetch?: typeof fetch;
}

/**
 * POST /api/concierge/send: the guest's own Send on a draft Shadow prepared.
 * Sends exactly the signed draft (nothing the guest didn't see, nothing Shadow
 * didn't prepare) with no model call, and answers with a signed line for the
 * conversation, so Shadow knows it went.
 */
export function createDraftSendHandler(deps: DraftSendDeps) {
  return async function handleDraftSend(request: Request): Promise<Response> {
    const refused = rejectCrossSite(request, deps.siteUrl);
    if (refused) return refused;

    const signer = deps.signer();
    const config = deps.config();
    if (!signer || !config) return json({ error: "not_configured" }, 503);

    const body = await readJsonBody(request, MAX_INQUIRY_BYTES);
    if (!body.ok) return json({ error: body.status === 413 ? "payload_too_large" : "invalid_request" }, body.status);
    const parsed = sendRequestSchema.safeParse(body.value);
    if (!parsed.success) return json({ error: "invalid_request" }, 400);
    const { session_id: sessionId, draft, token } = parsed.data;
    if (!signer.verifyDraft(sessionId, draft, token)) return json({ error: "invalid_request" }, 400);

    const decision = deps.limiter.take(clientKey(request.headers));
    if (!decision.allowed) {
      return json({ error: "rate_limited" }, 429, { "retry-after": String(decision.retryAfterSeconds) });
    }

    const result = await submitInquiry(buildPayload(draft, { client_ref: draft.client_ref, source: draft.source }), {
      config,
      fetch: deps.fetch,
    });
    if (!result.ok) return json({ error: result.error }, submitErrorStatus[result.error]);

    const content = `Thank you, ${draft.name}. Your message is with the team, and they’ll reply ${replyChannel(
      draft.preferred_contact,
      draft.email,
      draft.phone,
    )}.`;
    return json(
      { status: "received", reply: { content, sig: signer.signReply(sessionId, content) } },
      result.duplicate ? 200 : 201,
    );
  };
}
