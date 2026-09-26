import type { ConciergeEvent } from "./protocol";
import { MAX_MESSAGE_CHARS, MAX_TOTAL_CHARS, MAX_TURNS } from "./limits";

/*
 * Chat-window state, kept free of React so it can be unit tested.
 * Runs in the browser; never import server-only modules here.
 */

export interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
  /** "failed" replies are shown to the guest but not sent back to Claude. */
  readonly state: "streaming" | "final" | "failed";
}

export interface ChatState {
  readonly sessionId: string;
  readonly messages: readonly ChatMessage[];
  /** Shadow asked for the privacy box to be ticked. */
  readonly consentRequested: boolean;
  readonly consented: boolean;
  readonly inquiry: "none" | "sent" | "failed";
}

export const shadowLines = {
  greeting:
    "Sabaidee! I’m Shadow, the house’s AI concierge. Ask me about the beds, breakfast, check-in or getting here, and I can pass a message to the team.",
  refusal: "I’m sorry, that’s one I can’t help with. The team can: their WhatsApp and email are below.",
  busy: "I’m looking after a lot of guests at once. Please try again in a moment.",
  slowDown: "That’s a lot of questions in a short time. Please wait a minute, then ask again.",
  offline: "I’m not taking questions at the moment, but the team is. Their WhatsApp and email are below.",
  unavailable: "Something went wrong on my side. Please try again, or message the team directly.",
  empty: "Sorry, I lost my thread there. Could you ask me again?",
  confirmSend: "I’ve ticked the privacy box. Please send my request to the team.",
} as const;

export function newChat(sessionId: string): ChatState {
  return { sessionId, messages: [], consentRequested: false, consented: false, inquiry: "none" };
}

export type ChatAction =
  | { type: "send"; text: string }
  | { type: "event"; event: ConciergeEvent }
  /** The request failed before streaming began (network, 429, 503...). */
  | { type: "failed"; line: string }
  /** The stream ended without a `done` or `error` event. */
  | { type: "ended" }
  | { type: "consent"; value: boolean }
  | { type: "reset"; sessionId: string };

function updateLast(state: ChatState, update: (message: ChatMessage) => ChatMessage): ChatState {
  const last = state.messages.at(-1);
  if (!last || last.role !== "assistant" || last.state !== "streaming") return state;
  return { ...state, messages: [...state.messages.slice(0, -1), update(last)] };
}

const finish = (message: ChatMessage): ChatMessage =>
  message.content.trim() ? { ...message, state: "final" } : { ...message, content: shadowLines.empty, state: "failed" };

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "send":
      return {
        ...state,
        messages: [
          ...state.messages,
          { role: "user", content: action.text, state: "final" },
          { role: "assistant", content: "", state: "streaming" },
        ],
      };
    case "failed":
      return updateLast(state, (m) => ({ ...m, content: action.line, state: "failed" }));
    case "ended":
      return updateLast(state, finish);
    case "consent":
      return { ...state, consented: action.value };
    case "reset":
      return newChat(action.sessionId);
    case "event":
      return applyEvent(state, action.event);
  }
}

function applyEvent(state: ChatState, event: ConciergeEvent): ChatState {
  switch (event.type) {
    case "text":
      return updateLast(state, (m) => ({ ...m, content: m.content + event.text }));
    case "rewind":
      return updateLast(state, (m) => ({ ...m, content: m.content.slice(0, event.keep) }));
    case "consent_required":
      return { ...state, consentRequested: true };
    case "inquiry_sent":
      return { ...state, inquiry: "sent" };
    case "inquiry_failed":
      return { ...state, inquiry: "failed" };
    case "notice":
      return event.code === "refusal"
        ? updateLast(state, (m) => ({ ...m, content: shadowLines.refusal, state: "failed" }))
        : updateLast(state, (m) => ({ ...m, content: `${m.content.trimEnd()}…`, state: "final" }));
    case "error":
      return updateLast(state, (m) => ({
        ...m,
        content: event.code === "busy" ? shadowLines.busy : shadowLines.unavailable,
        state: "failed",
      }));
    case "done":
      return updateLast(state, finish);
  }
}

/**
 * The history sent to /api/concierge: finished messages only, each within
 * the per-message cap, at most MAX_TURNS, starting with the guest, and
 * under the total character cap.
 */
export function toApiMessages(messages: readonly ChatMessage[]): { role: "user" | "assistant"; content: string }[] {
  let history = messages
    .filter((m) => m.state === "final" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_CHARS) }))
    .slice(-MAX_TURNS);
  const total = () => history.reduce((sum, m) => sum + m.content.length, 0);
  while (history.length > 1 && (history[0]?.role !== "user" || total() > MAX_TOTAL_CHARS)) {
    history = history.slice(1);
  }
  return history;
}

/** Restores a saved chat, dropping a reply that was cut off mid-stream. */
export function restoreChat(raw: string | null): ChatState | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as Partial<ChatState>;
    if (typeof saved.sessionId !== "string" || !Array.isArray(saved.messages)) return null;
    const messages = saved.messages
      .filter(
        (m): m is ChatMessage =>
          typeof m === "object" &&
          m !== null &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          (m.state === "final" || m.state === "failed"),
      )
      .map((m) => ({ role: m.role, content: m.content, state: m.state }));
    return {
      sessionId: saved.sessionId,
      messages,
      consentRequested: saved.consentRequested === true,
      consented: saved.consented === true,
      inquiry: saved.inquiry === "sent" || saved.inquiry === "failed" ? saved.inquiry : "none",
    };
  } catch {
    return null;
  }
}

export type TextPart = { kind: "text"; text: string } | { kind: "link"; text: string; href: string };

/**
 * Splits a reply into text and links. Links to this site become relative so
 * they work on preview deployments too.
 */
export function linkify(text: string, siteUrl: string): TextPart[] {
  const parts: TextPart[] = [];
  const pattern = /https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: "text", text: text.slice(last, index) });
    const url = match[0];
    const href = url.startsWith(`${siteUrl}/`) ? url.slice(siteUrl.length) : url === siteUrl ? "/" : url;
    parts.push({ kind: "link", text: url, href });
    last = index + url.length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}
