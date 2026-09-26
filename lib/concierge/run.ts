import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlock,
  BetaContentBlockParam,
  BetaMessage,
  BetaMessageParam,
  BetaMessageStreamParams,
  BetaRawMessageStreamEvent,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { SubmitResult } from "../inquiry/submit";
import { buildDateLine } from "./prompt";
import type { ConciergeEvent } from "./protocol";
import type { ConciergeRequest } from "./request";
import { runSendInquiry, SEND_INQUIRY, sendInquiryTool } from "./tool";

/** Tool rounds per request: enough for "consent missing" then "sent". */
export const MAX_TOOL_ROUNDS = 2;
/** Caps thinking plus reply; replies are two to four sentences. */
export const MAX_TOKENS = 4096;
export const DEFAULT_MODEL = "claude-opus-5";

/** The slice of the SDK's BetaMessageStream the loop needs (lets tests inject a fake). */
export interface MessageStreamLike extends AsyncIterable<BetaRawMessageStreamEvent> {
  finalMessage(): Promise<BetaMessage>;
}

export type StreamMessages = (
  params: BetaMessageStreamParams,
  options: { signal?: AbortSignal },
) => MessageStreamLike;

export interface RunConciergeOptions {
  readonly request: ConciergeRequest;
  readonly stream: StreamMessages;
  readonly submit: (payload: unknown) => Promise<SubmitResult>;
  readonly emit: (event: ConciergeEvent) => void;
  readonly model: string;
  /** Stable instructions and house knowledge (cached). */
  readonly systemPrompt: string;
  readonly now: Date;
  readonly signal?: AbortSignal;
}

export function buildParams(
  options: Pick<RunConciergeOptions, "model" | "systemPrompt" | "now">,
  messages: BetaMessageParam[],
): BetaMessageStreamParams {
  return {
    model: options.model,
    max_tokens: MAX_TOKENS,
    // Server-side refusal fallback: a declined request is retried on the
    // model Anthropic recommends for that refusal category.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    // Short factual answers from a fixed knowledge base: low effort keeps
    // replies fast; the server enforces the rules that matter (consent).
    output_config: { effort: "low" },
    system: [
      { type: "text", text: options.systemPrompt, cache_control: { type: "ephemeral" } },
      { type: "text", text: buildDateLine(options.now) },
    ],
    tools: [sendInquiryTool],
    tool_choice: { type: "auto", disable_parallel_tool_use: true },
    messages,
  };
}

/**
 * Content to send back to the API after a turn. After a mid-output
 * fallback, thinking and tool_use blocks from the model that declined
 * (everything before the last `fallback` block) must be left out.
 */
export function echoableContent(content: readonly BetaContentBlock[]): BetaContentBlockParam[] {
  const lastFallback = content.findLastIndex((block) => block.type === "fallback");
  return content.filter(
    (block, index) =>
      index > lastFallback ||
      !(block.type === "thinking" || block.type === "redacted_thinking" || block.type === "tool_use"),
  ) as BetaContentBlockParam[];
}

/**
 * One concierge turn: stream Claude's reply to the client, run send_inquiry
 * when asked (at most MAX_TOOL_ROUNDS times), and stop cleanly on refusal or
 * truncation. Throws the SDK's typed errors; the caller maps them.
 */
export async function runConcierge(options: RunConciergeOptions): Promise<void> {
  const { request, emit } = options;
  const messages: BetaMessageParam[] = request.messages.map((m) => ({ role: m.role, content: m.content }));
  let wroteText = false;

  for (let round = 0; ; round++) {
    const stream = options.stream(buildParams(options, messages), { signal: options.signal });
    let needsSeparator = wroteText;

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta" && event.delta.text) {
        if (needsSeparator) {
          emit({ type: "text", text: "\n\n" });
          needsSeparator = false;
        }
        emit({ type: "text", text: event.delta.text });
        wroteText = true;
      }
    }
    const message = await stream.finalMessage();

    // Check why the model stopped before using anything it produced.
    if (message.stop_reason === "refusal") {
      emit({ type: "notice", code: "refusal" });
      return;
    }
    if (message.stop_reason === "max_tokens") {
      // Never run a tool whose input may have been cut off.
      emit({ type: "notice", code: "truncated" });
      return;
    }

    const content = echoableContent(message.content);
    const toolUses = content.filter((block): block is BetaToolUseBlock => block.type === "tool_use");
    if (message.stop_reason !== "tool_use" || toolUses.length === 0 || round >= MAX_TOOL_ROUNDS) return;

    messages.push({ role: "assistant", content });
    const results: BetaToolResultBlockParam[] = [];
    for (const block of toolUses) {
      if (block.name !== SEND_INQUIRY) {
        results.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: "unknown_tool" });
        continue;
      }
      const outcome = await runSendInquiry(block.input, {
        consent: request.consent,
        sessionId: request.session_id,
        submit: options.submit,
      });
      if (outcome.event) emit({ type: outcome.event });
      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: outcome.content,
        ...(outcome.isError ? { is_error: true } : {}),
      });
    }
    messages.push({ role: "user", content: results });
  }
}

/** Maps a thrown error to what the chat window shows; null when the guest has gone. */
export function classifyError(error: unknown): "busy" | "unavailable" | null {
  if (error instanceof Anthropic.APIUserAbortError) return null;
  if (error instanceof Anthropic.RateLimitError) return "busy";
  if (error instanceof Anthropic.APIError && error.status === 529) return "busy";
  return "unavailable";
}
