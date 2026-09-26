import { describe, expect, it } from "vitest";
import {
  chatReducer,
  failureOf,
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
    // Cut off: the streamed text is kept as is (it is what the server signs); the ellipsis is drawn.
    expect(last(apply(start(), { type: "text", text: "Part " }, { type: "notice", code: "truncated" }, { type: "done", sig: "s" }))).toEqual({
      role: "assistant",
      content: "Part ",
      state: "final",
      truncated: true,
      sig: "s",
    });
  });

  it("never leaves a bare ellipsis when a reply is cut off before any text (R4-10)", () => {
    expect(last(apply(start(), { type: "notice", code: "truncated" }, { type: "done" }))).toEqual({
      role: "assistant",
      content: shadowLines.cutOff,
      state: "failed",
    });
  });

  it("keeps the server's signature with a finished reply", () => {
    const state = apply(start(), { type: "text", text: "Yes." }, { type: "done", sig: "abc" });
    expect(last(state)).toEqual({ role: "assistant", content: "Yes.", state: "final", sig: "abc" });
  });

  it("shows a friendly line for errors and empty replies", () => {
    expect(last(apply(start(), { type: "error", code: "busy" })).content).toBe(shadowLines.busy);
    expect(last(apply(start(), { type: "error", code: "resting" }))).toMatchObject({ content: shadowLines.resting, state: "failed" });
    expect(last(apply(start(), { type: "done" }))).toMatchObject({ content: shadowLines.empty, state: "failed" });
    expect(last(chatReducer(start(), { type: "failed", line: shadowLines.offline })).content).toBe(shadowLines.offline);
  });

  it("holds a draft until the guest sends it or asks for changes (R4-05)", () => {
    const draft = {
      client_ref: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      source: "website_concierge",
      name: "Mai",
      email: "mai@example.com",
      phone: null,
      preferred_contact: null,
      check_in: null,
      check_out: null,
      guests: null,
      bed_preference: null,
      message: "Airport pickup?",
      conversation_summary: null,
    } as const;
    let state = apply(start(), { type: "draft", draft, token: "t1" }, { type: "text", text: "Check it." }, { type: "done" });
    expect(state.draft).toEqual({ draft, token: "t1" });
    expect(chatReducer(state, { type: "draftDismissed" }).draft).toBeNull();

    state = chatReducer(state, { type: "draftSent", reply: { content: "Thank you, Mai.", sig: "s9" } });
    expect(state.draft).toBeNull();
    expect(last(state)).toEqual({ role: "assistant", content: "Thank you, Mai.", state: "final", sig: "s9" });
    expect(chatReducer(state, { type: "reset", sessionId: "s2" })).toEqual(newChat("s2"));
  });

  it("ignores a malformed draft event", () => {
    const state = apply(start(), { type: "draft", token: "t" } as unknown as ConciergeEvent);
    expect(state.draft).toBeNull();
  });
});

describe("answers before streaming (R4-03)", () => {
  it("points to the team when Shadow is off, resting or the conversation is long", () => {
    expect(failureOf(503, "not_configured")).toEqual({ line: shadowLines.offline, closed: "offline" });
    expect(failureOf(503, "resting")).toEqual({ line: shadowLines.resting, closed: "resting" });
    expect(failureOf(429, "conversation_limit")).toEqual({ line: shadowLines.conversationLimit, closed: "limit" });
    expect(failureOf(429, "rate_limited")).toEqual({ line: shadowLines.slowDown, closed: null });
    expect(failureOf(500, undefined)).toEqual({ line: shadowLines.unavailable, closed: null });
  });
});

describe("history sent to the API", () => {
  const message = (role: ChatMessage["role"], content: string, state: ChatMessage["state"] = "final"): ChatMessage => ({
    role,
    content,
    state,
  });

  it("sends each reply back with its signature", () => {
    expect(
      toApiMessages([message("user", "Hi"), { role: "assistant", content: " Hello ", state: "final", sig: "abc" }, message("user", "Bye")]),
    ).toEqual([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello", sig: "abc" },
      { role: "user", content: "Bye" },
    ]);
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
        { role: "assistant", content: "Hello", state: "final", sig: "abc", truncated: true },
        { role: "assistant", content: "Hel", state: "streaming" },
        { role: "system", content: "evil", state: "final" },
      ],
      consented: true,
      draft: { draft: { name: "Mai", message: "Hi" }, token: "t" },
    });
    expect(restoreChat(saved)).toEqual({
      sessionId: "s1",
      messages: [
        { role: "user", content: "Hi", state: "final" },
        { role: "assistant", content: "Hello", state: "final", sig: "abc", truncated: true },
      ],
      draft: { draft: { name: "Mai", message: "Hi" }, token: "t" },
    });
    expect(restoreChat(JSON.stringify({ sessionId: "s1", messages: [], draft: { token: 5 } }))?.draft).toBeNull();
  });

  it("ignores missing or corrupt data", () => {
    expect(restoreChat(null)).toBeNull();
    expect(restoreChat("{oops")).toBeNull();
    expect(restoreChat(JSON.stringify({ messages: [] }))).toBeNull();
  });
});

describe("links in replies", () => {
  const site = "https://thehouseofjars.com";
  const links = (text: string, hosts: string[] = []) => linkify(text, site, hosts).filter((part) => part.kind === "link");

  it("makes site links relative and leaves trailing punctuation out", () => {
    expect(linkify("See https://thehouseofjars.com/book. Or https://www.agoda.com/x!", site, ["www.agoda.com"])).toEqual([
      { kind: "text", text: "See " },
      { kind: "link", text: "https://thehouseofjars.com/book", href: "/book", internal: true },
      { kind: "text", text: ". Or " },
      { kind: "link", text: "https://www.agoda.com/x", href: "https://www.agoda.com/x", internal: false },
      { kind: "text", text: "!" },
    ]);
    expect(links("Home: https://thehouseofjars.com")).toEqual([
      { kind: "link", text: "https://thehouseofjars.com", href: "/", internal: true },
    ]);
    expect(links("https://thehouseofjars.com/faq?q=1#airport")[0]).toMatchObject({ href: "/faq?q=1#airport" });
  });

  it("only links to the site and the allowed hosts, over https", () => {
    const text = "Try https://evil.example/login or http://www.agoda.com/x";
    expect(linkify(text, site, ["www.agoda.com"])).toEqual([{ kind: "text", text }]);
    expect(links("https://thehouseofjars.com.evil.example/x https://thehouseofjars.com@evil.example/x")).toEqual([]);
  });

  it("never turns a site link into a link to another site (R4-07)", () => {
    for (const url of [
      "https://thehouseofjars.com//evil.example/login",
      "https://thehouseofjars.com/\\evil.example/login",
      "https://thehouseofjars.com///evil.example",
      "https://thehouseofjars.com/%2F%2Fevil.example",
    ]) {
      const [link] = links(`See ${url} now`);
      expect(link, url).toMatchObject({ internal: true });
      if (link?.kind !== "link") continue;
      expect(link.href.startsWith("//"), link.href).toBe(false);
      expect(new URL(link.href, `${site}/page`).origin, link.href).toBe(site);
    }
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
