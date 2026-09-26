import type {
  BetaContentBlock,
  BetaMessage,
  BetaMessageStreamParams,
  BetaRawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { MessageStreamLike, StreamMessages } from "@/lib/concierge/run";

/** One scripted reply from the fake Claude. */
export interface Turn {
  /** Text streamed as deltas (and included in the final message). */
  text?: string[];
  /** Blocks after the text, e.g. a tool_use. */
  blocks?: BetaContentBlock[];
  stopReason: BetaMessage["stop_reason"];
  /** Thrown while streaming, after the text has been sent. */
  error?: unknown;
}

export function toolUse(input: unknown, name = "prepare_inquiry", id = "toolu_1"): BetaContentBlock {
  return { type: "tool_use", id, name, input } as BetaContentBlock;
}

function stream(turn: Turn): MessageStreamLike {
  const text = turn.text ?? [];
  const message = {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-test",
    content: [
      ...(text.length ? [{ type: "text", text: text.join(""), citations: null }] : []),
      ...(turn.blocks ?? []),
    ],
    stop_reason: turn.stopReason,
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as BetaMessage;

  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of text) {
        yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: chunk } } as BetaRawMessageStreamEvent;
      }
      if (turn.error) throw turn.error;
    },
    finalMessage: async () => {
      if (turn.error) throw turn.error;
      return message;
    },
  };
}

/** A StreamMessages that plays the turns in order and records every request. */
export function fakeClaude(turns: Turn[]) {
  const calls: BetaMessageStreamParams[] = [];
  const streamer: StreamMessages = (params) => {
    // Snapshot: the loop keeps appending to the same messages array.
    calls.push(structuredClone(params));
    const turn = turns[calls.length - 1];
    if (!turn) throw new Error(`No scripted turn for call ${calls.length}`);
    return stream(turn);
  };
  return { streamer, calls };
}
