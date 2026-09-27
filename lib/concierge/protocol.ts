import type { RoomKind } from "../booking/types";
import type { InquiryDraft } from "../inquiry/schema";

/**
 * Free beds for one stay, built by the server from Shadow Check-in's own
 * answer to check_availability (never from Claude's words), with no prices:
 * the chat window shows it with a Book these dates link to /book.
 */
export interface AvailabilityCard {
  readonly check_in: string;
  readonly check_out: string;
  readonly nights: number;
  readonly guests: number;
  /** The room types that can be booked for the stay, with the fewest free beds on any of its nights. */
  readonly rooms: readonly { readonly name: string; readonly kind: RoomKind | null; readonly free: number }[];
}

/**
 * The streaming protocol between /api/concierge and the chat window:
 * newline-delimited JSON, one event per line.
 */
export type ConciergeEvent =
  /** A piece of Shadow's reply. */
  | { type: "text"; text: string }
  /** A round is being retried: cut the reply back to its first `keep` characters. */
  | { type: "rewind"; keep: number }
  /**
   * Shadow prepared a message for the team. The window shows every detail;
   * only the guest's Send delivers it, with `token` (the server's signature).
   */
  | { type: "draft"; draft: InquiryDraft; token: string }
  /** Shadow checked a stay and beds are free: the window shows the card under his reply. */
  | { type: "availability"; card: AvailabilityCard }
  /** The reply was withheld (refusal) or cut short (length). */
  | { type: "notice"; code: "refusal" | "truncated" }
  /** Something went wrong mid-stream; "resting": today's budget is spent. */
  | { type: "error"; code: "busy" | "unavailable" | "resting" }
  /** The reply is complete; `sig` is the server's signature on it, sent back with the reply as history. */
  | { type: "done"; sig?: string };

/** Error bodies returned before streaming starts. */
export type ConciergeErrorCode =
  | "not_configured"
  /** Today's budget is spent (503, with retry-after). */
  | "resting"
  | "rate_limited"
  /** This conversation reached MAX_CONVERSATION_TURNS (429). */
  | "conversation_limit"
  | "invalid_request"
  | "payload_too_large"
  | "unsupported_media_type"
  | "forbidden";

export function encodeEvent(event: ConciergeEvent): string {
  return `${JSON.stringify(event)}\n`;
}

const EVENT_TYPES = new Set([
  "text",
  "rewind",
  "draft",
  "availability",
  "notice",
  "error",
  "done",
]);

/**
 * Splits a buffer of NDJSON into complete events and the unfinished tail.
 * Lines that are not valid events are dropped.
 */
export function parseEvents(buffer: string): { events: ConciergeEvent[]; rest: string } {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  const events: ConciergeEvent[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line) as { type?: unknown };
      if (typeof value?.type === "string" && EVENT_TYPES.has(value.type)) events.push(value as ConciergeEvent);
    } catch {
      // Ignore a malformed line rather than breaking the conversation.
    }
  }
  return { events, rest };
}
