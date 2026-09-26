import { json, readJsonBody, rejectCrossSite } from "../http";
import type { SubmitResult } from "../inquiry/submit";
import { clientKey, type RateLimitDecision } from "../rate-limit";
import { buildSystemPrompt } from "./prompt";
import { encodeEvent, type ConciergeEvent } from "./protocol";
import { MAX_REQUEST_BYTES } from "./limits";
import { conciergeRequestSchema } from "./request";
import { classifyError, runConcierge, type StreamMessages } from "./run";

export interface ConciergeHandlerDeps {
  /** Returns a streaming function, or null when ANTHROPIC_API_KEY is not set. */
  readonly streamer: () => StreamMessages | null;
  readonly submit: (payload: unknown) => Promise<SubmitResult>;
  readonly limiter: { take(key: string): RateLimitDecision };
  readonly model: () => string;
  readonly siteUrl: string;
  readonly now?: () => Date;
  readonly log?: (message: string) => void;
}

/** POST /api/concierge: validates the chat, then streams NDJSON events. */
export function createConciergeHandler(deps: ConciergeHandlerDeps) {
  let systemPrompt: string | null = null;
  const log = deps.log ?? ((message: string) => console.error(message));

  return async function handleConcierge(request: Request): Promise<Response> {
    const refused = rejectCrossSite(request, deps.siteUrl);
    if (refused) return refused;

    const stream = deps.streamer();
    if (!stream) return json({ error: "not_configured" }, 503);

    const body = await readJsonBody(request, MAX_REQUEST_BYTES);
    if (!body.ok) {
      return json({ error: body.status === 413 ? "payload_too_large" : "invalid_request" }, body.status);
    }
    const parsed = conciergeRequestSchema.safeParse(body.value);
    if (!parsed.success) return json({ error: "invalid_request" }, 400);

    // Rate-limit only requests that would reach Claude.
    const decision = deps.limiter.take(clientKey(request.headers));
    if (!decision.allowed) {
      return json({ error: "rate_limited" }, 429, { "retry-after": String(decision.retryAfterSeconds) });
    }

    systemPrompt ??= buildSystemPrompt(deps.siteUrl);
    const prompt = systemPrompt;
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
          await runConcierge({
            request: parsed.data,
            stream,
            submit: deps.submit,
            emit,
            model: deps.model(),
            systemPrompt: prompt,
            now: deps.now?.() ?? new Date(),
            signal: request.signal,
          });
          emit({ type: "done" });
        } catch (error) {
          const code = classifyError(error);
          if (code) {
            log(`[concierge] ${error instanceof Error ? `${error.name}: ${error.message}` : "unknown error"}`);
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
