import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlock,
  BetaContentBlockParam,
  BetaMessage,
  BetaMessageParam,
  BetaMessageStreamParams,
  BetaRawMessageStreamEvent,
  BetaTool,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { InquiryDraft } from "../inquiry/schema";
import { CHECK_AVAILABILITY, checkAvailabilityTool, type CheckAvailability } from "./availability";
import { SpendLimitReached, weighUsage, worstCaseCost, type SpendBudget } from "./budget";
import { mentionsMoney, priceLine } from "./guard";
import type { HistoryMessage } from "./history";
import { MAX_TOOL_CALLS } from "./limits";
import { buildDateLine } from "./prompt";
import type { ConciergeEvent } from "./protocol";
import { PREPARE_INQUIRY, prepareInquiryTool, runPrepareInquiry } from "./tool";

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

/** The tools, always in this order: check_availability only when the site takes bookings online. */
const TOOLS: readonly BetaTool[] = [prepareInquiryTool];
const TOOLS_WITH_AVAILABILITY: readonly BetaTool[] = [prepareInquiryTool, checkAvailabilityTool];

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
  /** What replaces a reply that starts quoting a price (default: guard.ts's priceLine). */
  readonly priceLine?: string;
  /**
   * Free beds for check_availability, through the booking form's own lookup.
   * Claude is offered the tool only when this is set (the site takes bookings online).
   */
  readonly checkAvailability?: CheckAvailability;
  readonly now: Date;
  readonly signal?: AbortSignal;
}

export function buildParams(
  options: Pick<RunConciergeOptions, "model" | "systemPrompt" | "now" | "checkAvailability">,
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
    // Tools and the stable prompt form the cached prefix; today's date follows the breakpoint.
    system: [
      { type: "text", text: options.systemPrompt, cache_control: { type: "ephemeral" } },
      { type: "text", text: buildDateLine(options.now) },
    ],
    tools: [...(options.checkAvailability ? TOOLS_WITH_AVAILABILITY : TOOLS)],
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

/** The answer to one tool call. Guest-supplied input only ever flows into a draft or a lookup, never into what a tool does. */
async function runTool(block: BetaToolUseBlock, options: RunConciergeOptions): Promise<BetaToolResultBlockParam> {
  const result = (content: string, isError: boolean): BetaToolResultBlockParam => ({
    type: "tool_result",
    tool_use_id: block.id,
    content,
    ...(isError ? { is_error: true } : {}),
  });
  if (block.name === PREPARE_INQUIRY) {
    const outcome = runPrepareInquiry(block.input, options.signDraft);
    if (outcome.draft) options.emit({ type: "draft", ...outcome.draft });
    return result(outcome.content, outcome.isError);
  }
  if (block.name === CHECK_AVAILABILITY && options.checkAvailability) {
    const outcome = await options.checkAvailability(block.input);
    // The card comes from the lookup itself, so Claude's words can never put other dates on it.
    if (outcome.card) options.emit({ type: "availability", card: outcome.card });
    return result(outcome.content, outcome.isError);
  }
  return result("unknown_tool", true);
}

/**
 * One concierge turn: stream Claude's reply to the client, run its tools (at
 * most MAX_TOOL_CALLS calls for this guest message), and stop cleanly on
 * refusal or truncation. Resolves with the reply the guest was shown, which
 * the caller signs ("" when there is nothing to keep, as after a refusal).
 * Throws the SDK's typed errors; the caller maps them.
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

  // `calls`: tool calls this guest message has asked for, those turned away over the limit included.
  for (let calls = 0, retries = 0; ; ) {
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
        sendText(options.priceLine ?? priceLine);
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
    // Once a call over the limit has been turned away (and Claude has had its turn to explain), the reply ends.
    if (message.stop_reason !== "tool_use" || toolUses.length === 0 || calls > MAX_TOOL_CALLS) return reply;

    messages.push({ role: "assistant", content });
    const results: BetaToolResultBlockParam[] = [];
    for (const block of toolUses) {
      calls++;
      results.push(
        calls > MAX_TOOL_CALLS
          ? {
              type: "tool_result",
              tool_use_id: block.id,
              is_error: true,
              content: `limit_reached: the ${MAX_TOOL_CALLS} tool calls allowed for one guest message are used up, so this call was not run.`,
            }
          : await runTool(block, options),
      );
    }
    messages.push({ role: "user", content: results });
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
