import { json, readJsonBody, rejectCrossSite } from "../http";
import { clientKey, type RateLimitDecision } from "../rate-limit";
import { worstCaseCost, type SpendBudget } from "./budget";
import { trustedHistory } from "./history";
import { bookingPriceLine } from "./guard";
import { bookingPageLinks } from "./knowledge";
import { buildSystemPrompt } from "./prompt";
import { encodeEvent, type ConciergeEvent } from "./protocol";
import { MAX_REQUEST_BYTES } from "./limits";
import { conciergeRequestSchema } from "./request";
import { buildParams, classifyError, describeFailure, runConcierge, type StreamMessages } from "./run";
import type { Signer } from "./signing";

export interface ConciergeHandlerDeps {
  /** Returns a streaming function, or null when ANTHROPIC_API_KEY is not set. */
  readonly streamer: () => StreamMessages | null;
  /** Signs Shadow's replies; null when ANTHROPIC_API_KEY is not set. */
  readonly signer: () => Signer | null;
  /** Per client (IPv4 address or IPv6 /64). */
  readonly limiter: { take(key: string): RateLimitDecision };
  /** Per conversation (session id): at most MAX_CONVERSATION_TURNS guest messages. */
  readonly conversations: { take(key: string): RateLimitDecision };
  /** Today's spending ceiling for this server instance. */
  readonly budget: SpendBudget;
  readonly model: () => string;
  readonly siteUrl: string;
  /** Whether the site takes booking requests on /book (Shadow then points guests there). */
  readonly onlineBooking?: () => boolean;
  readonly now?: () => Date;
  readonly log?: (message: string) => void;
}

/** POST /api/concierge: validates the chat, then streams NDJSON events. */
export function createConciergeHandler(deps: ConciergeHandlerDeps) {
  let systemPrompt: string | null = null;
  let priceLine: string | undefined;
  const log = deps.log ?? ((message: string) => console.error(message));

  return async function handleConcierge(request: Request): Promise<Response> {
    const refused = rejectCrossSite(request, deps.siteUrl);
    if (refused) return refused;

    const stream = deps.streamer();
    const signer = deps.signer();
    if (!stream || !signer) return json({ error: "not_configured" }, 503);

    const body = await readJsonBody(request, MAX_REQUEST_BYTES);
    if (!body.ok) {
      return json({ error: body.status === 413 ? "payload_too_large" : "invalid_request" }, body.status);
    }
    const parsed = conciergeRequestSchema.safeParse(body.value);
    if (!parsed.success) return json({ error: "invalid_request" }, 400);
    const sessionId = parsed.data.session_id;

    // Rate-limit only requests that would reach Claude.
    const decision = deps.limiter.take(clientKey(request.headers));
    if (!decision.allowed) {
      return json({ error: "rate_limited" }, 429, { "retry-after": String(decision.retryAfterSeconds) });
    }

    if (systemPrompt === null) {
      const onlineBooking = deps.onlineBooking?.() ?? false;
      systemPrompt = buildSystemPrompt(deps.siteUrl, { onlineBooking });
      priceLine = onlineBooking ? bookingPriceLine(bookingPageLinks(deps.siteUrl).page) : undefined;
    }
    const prompt = systemPrompt;
    const model = deps.model();
    const now = deps.now?.() ?? new Date();
    const history = trustedHistory(parsed.data, signer);

    // Answer plainly now if today's budget can't cover even the first call.
    if (deps.budget.remaining() < worstCaseCost(buildParams({ model, systemPrompt: prompt, now }, history))) {
      return json({ error: "resting" }, 503, { "retry-after": String(deps.budget.secondsUntilReset()) });
    }
    const turn = deps.conversations.take(sessionId);
    if (!turn.allowed) return json({ error: "conversation_limit" }, 429);

    const encoder = new TextEncoder();

    const events = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (event: ConciergeEvent) => {
          try {
            controller.enqueue(encoder.encode(encodeEvent(event)));
          } catch {
            // The guest closed the window; nothing to deliver to.
          }
        };
        try {
          const reply = await runConcierge({
            messages: history,
            stream,
            signDraft: (draft) => signer.signDraft(sessionId, draft),
            budget: deps.budget,
            emit,
            model,
            systemPrompt: prompt,
            priceLine,
            now,
            signal: request.signal,
          });
          // The browser sends the reply back with this signature; without it, it never reaches Claude again.
          emit({ type: "done", ...(reply.trim() ? { sig: signer.signReply(sessionId, reply) } : {}) });
        } catch (error) {
          const code = classifyError(error);
          if (code) {
            log(describeFailure(error));
            emit({ type: "error", code });
          }
        } finally {
          try {
            controller.close();
          } catch {
            // Already closed by a disconnect.
          }
        }
      },
    });

    return new Response(events, {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store",
        "x-accel-buffering": "no",
      },
    });
  };
}
