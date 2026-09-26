import { describe, expect, it } from "vitest";
import {
  chatReducer,
  linkify,
  newChat,
  restoreChat,
  shadowLines,
  toApiMessages,
  type ChatMessage,
  type ChatState,
} from "./chat";
import { MAX_MESSAGE_CHARS, MAX_TOTAL_CHARS, MAX_TURNS } from "./limits";
import { encodeEvent, parseEvents, type ConciergeEvent } from "./protocol";

const start = () => chatReducer(newChat("s1"), { type: "send", text: "Is breakfast included?" });
const apply = (state: ChatState, ...events: ConciergeEvent[]) =>
  events.reduce((current, event) => chatReducer(current, { type: "event", event }), state);
const last = (state: ChatState) => state.messages.at(-1)!;

describe("chat window state", () => {
  it("adds the question and an empty reply that streams in", () => {
    const state = apply(start(), { type: "text", text: "Yes, " }, { type: "text", text: "it is." }, { type: "done" });
    expect(state.messages).toEqual([
      { role: "user", content: "Is breakfast included?", state: "final" },
      { role: "assistant", content: "Yes, it is.", state: "final" },
    ]);
  });

  it("rewinds a retried round", () => {
    const state = apply(start(), { type: "text", text: "Hello. " }, { type: "text", text: "Sending" }, { type: "rewind", keep: 7 });
    expect(last(state).content).toBe("Hello. ");
  });

  it("replaces a refused reply and marks a cut-off one", () => {
    expect(last(apply(start(), { type: "text", text: "Part" }, { type: "notice", code: "refusal" }))).toEqual({
      role: "assistant",
      content: shadowLines.refusal,
      state: "failed",
    });
    expect(last(apply(start(), { type: "text", text: "Part " }, { type: "notice", code: "truncated" })).content).toBe(
      "Part…",
    );
  });

  it("shows a friendly line for errors and empty replies", () => {
    expect(last(apply(start(), { type: "error", code: "busy" })).content).toBe(shadowLines.busy);
    expect(last(apply(start(), { type: "done" }))).toMatchObject({ content: shadowLines.empty, state: "failed" });
    expect(last(chatReducer(start(), { type: "failed", line: shadowLines.offline })).content).toBe(shadowLines.offline);
  });

  it("tracks consent and the inquiry", () => {
    let state = apply(start(), { type: "consent_required" });
    expect(state.consentRequested).toBe(true);
    state = chatReducer(state, { type: "consent", value: true });
    state = apply(state, { type: "inquiry_sent" });
    expect(state).toMatchObject({ consented: true, inquiry: "sent" });
    expect(chatReducer(state, { type: "reset", sessionId: "s2" })).toEqual(newChat("s2"));
  });
});

describe("history sent to the API", () => {
  const message = (role: ChatMessage["role"], content: string, state: ChatMessage["state"] = "final"): ChatMessage => ({
    role,
    content,
    state,
  });

  it("sends finished messages only, trimmed", () => {
    expect(
      toApiMessages([
        message("user", " Hi "),
        message("assistant", "Sorry, something went wrong", "failed"),
        message("user", "Hello?"),
        message("assistant", "", "streaming"),
      ]),
    ).toEqual([
      { role: "user", content: "Hi" },
      { role: "user", content: "Hello?" },
    ]);
  });

  it("keeps the most recent turns within every limit, starting with the guest", () => {
    const long = Array.from({ length: 20 }, (_, i) => message(i % 2 ? "assistant" : "user", `${i} ${"x".repeat(2000)}`));
    const history = toApiMessages(long);
    expect(history.length).toBeLessThanOrEqual(MAX_TURNS);
    expect(history[0]!.role).toBe("user");
    expect(history.every((m) => m.content.length <= MAX_MESSAGE_CHARS)).toBe(true);
    expect(history.reduce((sum, m) => sum + m.content.length, 0)).toBeLessThanOrEqual(MAX_TOTAL_CHARS);
    expect(history.at(-1)!.content.startsWith("19 ")).toBe(true);
  });
});

describe("saved conversations", () => {
  it("restores finished messages and drops a reply cut off mid-stream", () => {
    const saved = JSON.stringify({
      sessionId: "s1",
      messages: [
        { role: "user", content: "Hi", state: "final" },
        { role: "assistant", content: "Hel", state: "streaming" },
        { role: "system", content: "evil", state: "final" },
      ],
      consented: true,
      inquiry: "sent",
    });
    expect(restoreChat(saved)).toEqual({
      sessionId: "s1",
      messages: [{ role: "user", content: "Hi", state: "final" }],
      consentRequested: false,
      consented: true,
      inquiry: "sent",
    });
  });

  it("ignores missing or corrupt data", () => {
    expect(restoreChat(null)).toBeNull();
    expect(restoreChat("{oops")).toBeNull();
    expect(restoreChat(JSON.stringify({ messages: [] }))).toBeNull();
  });
});

describe("links in replies", () => {
  it("makes site links relative and leaves trailing punctuation out", () => {
    expect(linkify("See https://thehouseofjars.com/book. Or https://www.agoda.com/x!", "https://thehouseofjars.com")).toEqual([
      { kind: "text", text: "See " },
      { kind: "link", text: "https://thehouseofjars.com/book", href: "/book" },
      { kind: "text", text: ". Or " },
      { kind: "link", text: "https://www.agoda.com/x", href: "https://www.agoda.com/x" },
      { kind: "text", text: "!" },
    ]);
  });
});

describe("stream protocol", () => {
  it("round-trips events and keeps an unfinished line for later", () => {
    const wire = encodeEvent({ type: "text", text: "Hi\nthere" }) + encodeEvent({ type: "done" }) + '{"type":"te';
    expect(parseEvents(wire)).toEqual({
      events: [{ type: "text", text: "Hi\nthere" }, { type: "done" }],
      rest: '{"type":"te',
    });
  });

  it("drops malformed lines and unknown event types", () => {
    expect(parseEvents('nope\n{"type":"shell","cmd":"rm"}\n{"type":"done"}\n').events).toEqual([{ type: "done" }]);
  });
});
