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
import type { InquiryDraft } from "../inquiry/schema";
import { SpendLimitReached, weighUsage, worstCaseCost, type SpendBudget } from "./budget";
import { mentionsMoney, priceLine } from "./guard";
import type { HistoryMessage } from "./history";
import { buildDateLine } from "./prompt";
import type { ConciergeEvent } from "./protocol";
import { PREPARE_INQUIRY, prepareInquiryTool, runPrepareInquiry } from "./tool";

/** Tool rounds per request: enough to prepare a draft, and correct it once if it was invalid. */
export const MAX_TOOL_ROUNDS = 2;
/** Times a round is re-issued because its streamed tool input could not be parsed. */
export const MAX_MALFORMED_RETRIES = 1;
/**
 * A backstop, not a length control (the model never sees it): room for
 * low-effort thinking, a two-to-four-sentence reply and a prepare_inquiry
 * call carrying a long guest message, so real replies are never cut off. It
 * also bounds what each call reserves from the daily budget.
 */
export const MAX_TOKENS = 2048;
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
  /** The conversation, with only the replies this server signed (see trustedHistory). */
  readonly messages: readonly HistoryMessage[];
  readonly stream: StreamMessages;
  /** Signs a draft for the team, so the chat window can send exactly that and nothing else. */
  readonly signDraft: (draft: InquiryDraft) => string;
  /** Today's spending ceiling: every model call reserves its worst case first. */
  readonly budget: SpendBudget;
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
    // replies fast; the server enforces the rules that matter (only the guest can send a message).
    output_config: { effort: "low" },
    system: [
      { type: "text", text: options.systemPrompt, cache_control: { type: "ephemeral" } },
      { type: "text", text: buildDateLine(options.now) },
    ],
    tools: [prepareInquiryTool],
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
 * With eager input streaming the API no longer validates tool input while it
 * streams. When the SDK cannot parse a tool input at all it throws a plain
 * AnthropicError, never an APIError (HTTP, connection and abort failures are
 * all APIErrors), so this is the only kind of failure worth re-issuing.
 */
export function isMalformedStream(error: unknown): boolean {
  return error instanceof Anthropic.AnthropicError && !(error instanceof Anthropic.APIError);
}

/**
 * One concierge turn: stream Claude's reply to the client, run prepare_inquiry
 * when asked (at most MAX_TOOL_ROUNDS times), and stop cleanly on refusal or
 * truncation. Resolves with the reply the guest was shown, which the caller
 * signs ("" when there is nothing to keep, as after a refusal). Throws the
 * SDK's typed errors; the caller maps them.
 */
export async function runConcierge(options: RunConciergeOptions): Promise<string> {
  const { emit } = options;
  const messages: BetaMessageParam[] = options.messages.map((m) => ({ role: m.role, content: m.content }));
  /** Everything shown to the guest so far. */
  let reply = "";
  const sendText = (text: string) => {
    emit({ type: "text", text });
    reply += text;
  };

  for (let round = 0, retries = 0; ; ) {
    const keep = reply.length;
    const params = buildParams(options, messages);
    const reservation = options.budget.reserve(worstCaseCost(params));
    if (!reservation) throw new SpendLimitReached();
    let message: BetaMessage;
    try {
      const stream = options.stream(params, { signal: options.signal });
      let needsSeparator = reply.length > 0;
      let quotedMoney = false;
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta" && event.delta.text) {
          if (needsSeparator) {
            sendText("\n\n");
            needsSeparator = false;
          }
          sendText(event.delta.text);
          if (mentionsMoney(reply)) {
            quotedMoney = true;
            break; // Leaving the loop aborts the request: nothing more is generated or billed.
          }
        }
      }
      if (quotedMoney) {
        // The call's real usage is unknown now, so its reservation stays spent.
        emit({ type: "rewind", keep: 0 });
        reply = "";
        sendText(priceLine);
        return reply;
      }
      message = await stream.finalMessage();
      reservation.settle(weighUsage(message.usage));
    } catch (error) {
      // An HTTP error means the API turned the request away unbilled; after
      // any other failure the call may have run, so its reservation stays spent.
      if (error instanceof Anthropic.APIError && error.status !== undefined) reservation.settle(0);
      if (!isMalformedStream(error) || retries >= MAX_MALFORMED_RETRIES) throw error;
      // Nothing from this round reached a tool; take back its text and ask again.
      retries++;
      reply = reply.slice(0, keep);
      emit({ type: "rewind", keep });
      continue;
    }

    // Check why the model stopped before using anything it produced.
    if (message.stop_reason === "refusal") {
      emit({ type: "notice", code: "refusal" });
      return "";
    }
    if (message.stop_reason === "max_tokens") {
      // Never run a tool whose input may have been cut off.
      emit({ type: "notice", code: "truncated" });
      return reply;
    }

    const content = echoableContent(message.content);
    const toolUses = content.filter((block): block is BetaToolUseBlock => block.type === "tool_use");
    if (message.stop_reason !== "tool_use" || toolUses.length === 0 || round >= MAX_TOOL_ROUNDS) return reply;

    messages.push({ role: "assistant", content });
    const results: BetaToolResultBlockParam[] = [];
    for (const block of toolUses) {
      if (block.name !== PREPARE_INQUIRY) {
        results.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: "unknown_tool" });
        continue;
      }
      const outcome = runPrepareInquiry(block.input, options.signDraft);
      if (outcome.draft) emit({ type: "draft", ...outcome.draft });
      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: outcome.content,
        ...(outcome.isError ? { is_error: true } : {}),
      });
    }
    messages.push({ role: "user", content: results });
    round++;
  }
}

/** Maps a thrown error to what the chat window shows; null when the guest has gone. */
export function classifyError(error: unknown): "busy" | "unavailable" | "resting" | null {
  if (error instanceof SpendLimitReached) return "resting";
  if (error instanceof Anthropic.APIUserAbortError) return null;
  if (error instanceof Anthropic.RateLimitError) return "busy";
  // Mid-stream errors carry no HTTP status, only the API's error type.
  if (
    error instanceof Anthropic.APIError &&
    (error.status === 529 || error.type === "overloaded_error" || error.type === "rate_limit_error")
  ) {
    return "busy";
  }
  return "unavailable";
}

/**
 * A log line with no guest data. SDK messages can quote the raw tool input
 * (a guest's name, email, phone) or an upstream error body, so only a fixed
 * code, the HTTP status, the API's error type and request id are logged.
 */
export function describeFailure(error: unknown): string {
  if (error instanceof SpendLimitReached) return "[concierge] budget_spent";
  if (isMalformedStream(error)) return "[concierge] tool_input_unparseable";
  if (error instanceof Anthropic.APIError) {
    const parts = [error instanceof Anthropic.APIConnectionError ? "connection_error" : "api_error"];
    if (error.status !== undefined) parts.push(`status=${error.status}`);
    if (error.type) parts.push(`type=${error.type}`);
    if (error.requestID) parts.push(`request_id=${error.requestID}`);
    return `[concierge] ${parts.join(" ")}`;
  }
  return `[concierge] unexpected_error${error instanceof Error ? ` ${error.name}` : ""}`;
}
