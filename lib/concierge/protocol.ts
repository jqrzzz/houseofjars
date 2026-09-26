/**
 * The streaming protocol between /api/concierge and the chat window:
 * newline-delimited JSON, one event per line.
 */
export type ConciergeEvent =
  /** A piece of Shadow's reply. */
  | { type: "text"; text: string }
  /** Shadow tried to send an inquiry but the guest has not ticked the privacy box. */
  | { type: "consent_required" }
  /** The inquiry reached the team. */
  | { type: "inquiry_sent" }
  /** The inquiry could not be sent; the window shows contact details instead. */
  | { type: "inquiry_failed" }
  /** The reply was withheld (refusal) or cut short (length). */
  | { type: "notice"; code: "refusal" | "truncated" }
  /** Something went wrong mid-stream. */
  | { type: "error"; code: "busy" | "unavailable" }
  | { type: "done" };

/** Error bodies returned before streaming starts. */
export type ConciergeErrorCode = "not_configured" | "rate_limited" | "invalid_request" | "payload_too_large";

export function encodeEvent(event: ConciergeEvent): string {
  return `${JSON.stringify(event)}\n`;
}

const EVENT_TYPES = new Set(["text", "consent_required", "inquiry_sent", "inquiry_failed", "notice", "error", "done"]);

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
