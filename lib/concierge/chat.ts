import type { InquiryDraft } from "../inquiry/schema";
import type { ConciergeEvent } from "./protocol";
import { historyText, MAX_TOTAL_CHARS, MAX_TURNS } from "./limits";

/*
 * Chat-window state, kept free of React so it can be unit tested.
 * Runs in the browser; never import server-only modules here.
 */

export interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
  /** "failed" replies are shown to the guest but not sent back to Claude. */
  readonly state: "streaming" | "final" | "failed";
  /** The server's signature on a finished reply; unsigned replies never reach Claude again. */
  readonly sig?: string;
  /** The reply was cut off at the length limit (shown with an ellipsis). */
  readonly truncated?: boolean;
}

/** A message Shadow prepared for the team, with the server's signature over it. */
export interface ChatDraft {
  readonly draft: InquiryDraft;
  readonly token: string;
}

export interface ChatState {
  readonly sessionId: string;
  readonly messages: readonly ChatMessage[];
  /** Waiting for the guest to check it and press Send (or ask for changes). */
  readonly draft: ChatDraft | null;
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
  cutOff: "I ran out of room there. Could you ask again, or shall I pass your question to the team?",
  resting: "I’m resting for the rest of the day, but the team is here: their WhatsApp and email are below.",
  conversationLimit:
    "We’ve covered a lot in this conversation. For anything else the team can help directly: their WhatsApp and email are below.",
} as const;

/** Why the window points to the team instead of Shadow: no API key, today's budget spent, or a very long conversation. */
export type Closed = "offline" | "resting" | "limit";

/** What the window says when /api/concierge answers with an error before streaming. */
export function failureOf(status: number, code: unknown): { line: string; closed: Closed | null } {
  if (status === 503) {
    return code === "resting" ? { line: shadowLines.resting, closed: "resting" } : { line: shadowLines.offline, closed: "offline" };
  }
  if (status === 429) {
    return code === "conversation_limit"
      ? { line: shadowLines.conversationLimit, closed: "limit" }
      : { line: shadowLines.slowDown, closed: null };
  }
  return { line: shadowLines.unavailable, closed: null };
}

export function newChat(sessionId: string): ChatState {
  return { sessionId, messages: [], draft: null };
}

export type ChatAction =
  | { type: "send"; text: string }
  | { type: "event"; event: ConciergeEvent }
  /** The request failed before streaming began (network, 429, 503...). */
  | { type: "failed"; line: string }
  /** The stream ended without a `done` or `error` event. */
  | { type: "ended" }
  /** The guest wants to change the draft (they tell Shadow what). */
  | { type: "draftDismissed" }
  /** The draft reached the team; the server's signed confirmation joins the conversation. */
  | { type: "draftSent"; reply: { content: string; sig: string } }
  | { type: "reset"; sessionId: string };

function updateLast(state: ChatState, update: (message: ChatMessage) => ChatMessage): ChatState {
  const last = state.messages.at(-1);
  if (!last || last.role !== "assistant" || last.state !== "streaming") return state;
  return { ...state, messages: [...state.messages.slice(0, -1), update(last)] };
}

const finish = (message: ChatMessage, sig?: string): ChatMessage =>
  message.content.trim()
    ? { ...message, state: "final", ...(sig ? { sig } : {}) }
    : { ...message, content: shadowLines.empty, state: "failed" };

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
    case "draftDismissed":
      return { ...state, draft: null };
    case "draftSent":
      return {
        ...state,
        draft: null,
        messages: [...state.messages, { role: "assistant", content: action.reply.content, state: "final", sig: action.reply.sig }],
      };
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
    case "draft":
      return isDraft(event) ? { ...state, draft: { draft: event.draft, token: event.token } } : state;
    case "notice":
      if (event.code === "refusal") return updateLast(state, (m) => ({ ...m, content: shadowLines.refusal, state: "failed" }));
      // Keep the text exactly as streamed (it is what the server signs); the ellipsis is only drawn.
      return updateLast(state, (m) =>
        m.content.trim() ? { ...m, truncated: true } : { ...m, content: shadowLines.cutOff, state: "failed" },
      );
    case "error":
      return updateLast(state, (m) => ({ ...m, content: shadowLines[event.code], state: "failed" }));
    case "done":
      return updateLast(state, (m) => finish(m, event.sig));
  }
}

/**
 * The history sent to /api/concierge: finished messages only, each within
 * the per-message cap, at most MAX_TURNS, starting with the guest, and
 * under the total character cap.
 */
export interface ApiMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly sig?: string;
}

export function toApiMessages(messages: readonly ChatMessage[]): ApiMessage[] {
  let history: ApiMessage[] = messages
    .filter((m) => m.state === "final" && m.content.trim())
    .map((m) => ({ role: m.role, content: historyText(m.content), ...(m.role === "assistant" && m.sig ? { sig: m.sig } : {}) }))
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
      .map((m) => ({
        role: m.role,
        content: m.content,
        state: m.state,
        ...(typeof m.sig === "string" ? { sig: m.sig } : {}),
        ...(m.truncated === true ? { truncated: true } : {}),
      }));
    return { sessionId: saved.sessionId, messages, draft: isDraft(saved.draft) ? saved.draft : null };
  } catch {
    return null;
  }
}

/** Enough shape to show a draft; the server checks its signature before sending anything. */
function isDraft(value: unknown): value is ChatDraft {
  if (typeof value !== "object" || value === null) return false;
  const { draft, token } = value as { draft?: Partial<InquiryDraft>; token?: unknown };
  return (
    typeof token === "string" &&
    typeof draft === "object" &&
    draft !== null &&
    typeof draft.name === "string" &&
    typeof draft.message === "string"
  );
}

export type TextPart = { kind: "text"; text: string } | { kind: "link"; text: string; href: string };

/**
 * Splits a reply into text and links. Links to this site become relative so
 * they work on preview deployments too. Only this site and `allowedHosts`
 * become clickable: anything else Shadow writes stays plain text.
 */
export function linkify(text: string, siteUrl: string, allowedHosts: readonly string[] = []): TextPart[] {
  const parts: TextPart[] = [];
  const pattern = /https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const url = match[0];
    const internal = url === siteUrl || url.startsWith(`${siteUrl}/`);
    if (!internal && !isAllowed(url, allowedHosts)) continue;
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: "text", text: text.slice(last, index) });
    parts.push({ kind: "link", text: url, href: internal ? url.slice(siteUrl.length) || "/" : url });
    last = index + url.length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

function isAllowed(url: string, hosts: readonly string[]): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hosts.includes(hostname);
  } catch {
    return false;
  }
}
