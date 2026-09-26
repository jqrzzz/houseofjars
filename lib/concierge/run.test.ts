import Anthropic from "@anthropic-ai/sdk";
import type { BetaContentBlock, BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { describe, expect, it, vi } from "vitest";
import { fakeClaude, toolUse, type Turn } from "@/test/fake-claude";
import { priceLine } from "./guard";
import type { HistoryMessage } from "./history";
import type { ConciergeEvent } from "./protocol";
import {
  buildParams,
  classifyError,
  echoableContent,
  isMalformedStream,
  MAX_TOOL_ROUNDS,
  runConcierge,
} from "./run";
import { createSigner } from "./signing";
import { prepareInquiryTool } from "./tool";

const sessionId = "0b7a7a4e-3c2f-4d1e-9a58-6f2b8c1d9e10";
const messages: HistoryMessage[] = [
  { role: "user", content: "Please ask the team about a bed on 3 October. I'm Mai, mai@example.com." },
];
const inquiry = { name: "Mai", email: "mai@example.com", message: "A bed on 3 October?" };

const signer = createSigner("sk-ant-test-key");

async function run(turns: Turn[]) {
  const { streamer, calls } = fakeClaude(turns);
  const events: ConciergeEvent[] = [];
  const signDraft = vi.fn((draft: Parameters<typeof signer.signDraft>[1]) => signer.signDraft(sessionId, draft));
  const promise = runConcierge({
    messages,
    stream: streamer,
    signDraft,
    emit: (event) => events.push(event),
    model: "claude-opus-5",
    systemPrompt: "SYSTEM",
    now: new Date("2026-09-26T03:00:00Z"),
  });
  return { promise, events, calls, signDraft };
}

const drafts = (events: ConciergeEvent[]) => events.filter((event) => event.type === "draft");

const text = (events: ConciergeEvent[]) =>
  events.flatMap((event) => (event.type === "text" ? [event.text] : [])).join("");

describe("request parameters", () => {
  const params = buildParams({ model: "claude-opus-5", systemPrompt: "SYSTEM", now: new Date("2026-09-26T03:00:00Z") }, [
    { role: "user", content: "Hi" },
  ]);

  it("asks for adaptive thinking at low effort with server-side refusal fallbacks", () => {
    expect(params).toMatchObject({
      model: "claude-opus-5",
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      tools: [prepareInquiryTool],
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
    });
  });

  it("caches the stable prompt and adds today's date after the breakpoint", () => {
    expect(params.system).toEqual([
      { type: "text", text: "SYSTEM", cache_control: { type: "ephemeral" } },
      { type: "text", text: "Today's date in Vientiane is Saturday, 2026-09-26." },
    ]);
  });
});

describe("the concierge loop", () => {
  it("streams a plain answer, stops, and resolves with the reply to sign", async () => {
    const { promise, events, calls } = await run([{ text: ["Check-in is ", "from 14:00."], stopReason: "end_turn" }]);
    expect(await promise).toBe("Check-in is from 14:00.");
    expect(text(events)).toBe("Check-in is from 14:00.");
    expect(calls).toHaveLength(1);
    expect(drafts(events)).toHaveLength(0);
  });

  it("prepares a signed draft for the guest, tells Claude nothing was sent, and streams the follow-up (R4-05)", async () => {
    const { promise, events, calls } = await run([
      { text: ["Here is what I'll pass on."], blocks: [toolUse(inquiry)], stopReason: "tool_use" },
      { text: ["Please check the details and press Send."], stopReason: "end_turn" },
    ]);
    await promise;

    const [draft] = drafts(events) as Extract<ConciergeEvent, { type: "draft" }>[];
    expect(draft!.draft).toMatchObject({ ...inquiry, source: "website_concierge", phone: null });
    expect(signer.verifyDraft(sessionId, draft!.draft, draft!.token)).toBe(true);
    expect(text(events)).toBe("Here is what I'll pass on.\n\nPlease check the details and press Send.");

    const followUp = calls[1]!.messages as BetaMessageParam[];
    expect(followUp.at(-2)?.role).toBe("assistant");
    const result = (followUp.at(-1)!.content as { type: string; content: string; is_error?: boolean }[])[0]!;
    expect(result.type).toBe("tool_result");
    expect(result.is_error).toBeUndefined();
    expect(result.content).toMatch(/^draft_ready: .*Nothing has been sent/);
  });

  it(`stops after ${MAX_TOOL_ROUNDS} tool rounds`, async () => {
    const again: Turn = { blocks: [toolUse(inquiry)], stopReason: "tool_use" };
    const { promise, events, calls } = await run([again, again, again, again]);
    await promise;
    expect(drafts(events)).toHaveLength(MAX_TOOL_ROUNDS);
    expect(calls).toHaveLength(MAX_TOOL_ROUNDS + 1);
  });

  it("replaces a reply as soon as it quotes a price, and stops generating (R4-04)", async () => {
    const { promise, events, calls } = await run([
      { text: ["Sure! Bed 4 is free ", "on the 3rd for 5 ", "USD a night, and ", "more text never sent"], stopReason: "end_turn" },
    ]);
    expect(await promise).toBe(priceLine);
    expect(calls).toHaveLength(1);
    expect(events).toContainEqual({ type: "rewind", keep: 0 });
    let shown = "";
    for (const event of events) {
      if (event.type === "text") shown += event.text;
      if (event.type === "rewind") shown = shown.slice(0, event.keep);
    }
    expect(shown).toBe(priceLine);
    expect(text(events)).not.toContain("more text never sent");
  });

  it("keeps nothing to sign after a refusal, and the text shown before a cut-off", async () => {
    expect(await (await run([{ text: ["Part"], stopReason: "refusal" }])).promise).toBe("");
    expect(await (await run([{ text: ["Part of an answer"], stopReason: "max_tokens" }])).promise).toBe("Part of an answer");
  });

  it("never runs a tool from a refused or truncated reply", async () => {
    for (const [stopReason, code] of [
      ["refusal", "refusal"],
      ["max_tokens", "truncated"],
    ] as const) {
      const { promise, events, signDraft } = await run([{ text: ["Let me"], blocks: [toolUse(inquiry)], stopReason }]);
      await promise;
      expect(signDraft).not.toHaveBeenCalled();
      expect(drafts(events)).toHaveLength(0);
      expect(events.at(-1)).toEqual({ type: "notice", code });
    }
  });

  it("answers unknown tools with an error result", async () => {
    const { promise, calls, events } = await run([
      { blocks: [toolUse({}, "book_bed")], stopReason: "tool_use" },
      { text: ["Sorry."], stopReason: "end_turn" },
    ]);
    await promise;
    expect(drafts(events)).toHaveLength(0);
    expect((calls[1]!.messages.at(-1)!.content as unknown[])[0]).toEqual({
      type: "tool_result",
      tool_use_id: "toolu_1",
      is_error: true,
      content: "unknown_tool",
    });
  });

  it("re-issues a round once when a streamed tool input cannot be parsed, rewinding its text", async () => {
    const malformed = new Anthropic.AnthropicError("Unable to parse tool parameter JSON from model.");
    const { promise, events, calls } = await run([
      { text: ["Sending "], stopReason: "tool_use", error: malformed },
      { text: ["Sent."], stopReason: "end_turn" },
    ]);
    await promise;
    expect(calls).toHaveLength(2);
    expect(events).toContainEqual({ type: "rewind", keep: 0 });
    // What the chat window shows after applying the rewind.
    let shown = "";
    for (const event of events) {
      if (event.type === "text") shown += event.text;
      if (event.type === "rewind") shown = shown.slice(0, event.keep);
    }
    expect(shown).toBe("Sent.");
  });

  it("gives up after one re-issue, and never re-issues API errors", async () => {
    const malformed = new Anthropic.AnthropicError("Unable to parse tool parameter JSON from model.");
    const twice = await run([
      { stopReason: "tool_use", error: malformed },
      { stopReason: "tool_use", error: malformed },
    ]);
    await expect(twice.promise).rejects.toBe(malformed);

    const overloaded = new Anthropic.InternalServerError(529, undefined, "Overloaded", new Headers());
    const api = await run([{ stopReason: "end_turn", error: overloaded }]);
    await expect(api.promise).rejects.toBe(overloaded);
    expect(api.calls).toHaveLength(1);
  });
});

describe("echoing content after a fallback", () => {
  it("drops the declined model's thinking and tool calls, keeps its text", () => {
    const content = [
      { type: "thinking", thinking: "", signature: "s1" },
      { type: "text", text: "Partial ", citations: null },
      { type: "tool_use", id: "toolu_0", name: "prepare_inquiry", input: {} },
      { type: "fallback", from: { model: "claude-opus-5" }, to: { model: "claude-opus-4-8" }, trigger: { type: "refusal", category: null } },
      { type: "thinking", thinking: "", signature: "s2" },
      { type: "text", text: "answer", citations: null },
    ] as unknown as BetaContentBlock[];
    expect(echoableContent(content).map((block) => block.type)).toEqual(["text", "fallback", "thinking", "text"]);
  });

  it("leaves a normal reply untouched", () => {
    const content = [
      { type: "thinking", thinking: "", signature: "s" },
      { type: "text", text: "Hi", citations: null },
    ] as unknown as BetaContentBlock[];
    expect(echoableContent(content)).toEqual(content);
  });
});

describe("error classification", () => {
  const headers = new Headers();

  it("maps typed SDK errors to what the guest sees", () => {
    expect(classifyError(new Anthropic.APIUserAbortError())).toBeNull();
    expect(classifyError(new Anthropic.RateLimitError(429, undefined, "slow down", headers))).toBe("busy");
    expect(classifyError(new Anthropic.InternalServerError(529, undefined, "overloaded", headers))).toBe("busy");
    expect(classifyError(new Anthropic.APIError(undefined, undefined, "overloaded", headers, "overloaded_error"))).toBe(
      "busy",
    );
    expect(classifyError(new Anthropic.AuthenticationError(401, undefined, "bad key", headers))).toBe("unavailable");
    expect(classifyError(new Error("anything else"))).toBe("unavailable");
  });

  it("only treats non-HTTP SDK errors as a malformed stream", () => {
    expect(isMalformedStream(new Anthropic.AnthropicError("bad JSON"))).toBe(true);
    expect(isMalformedStream(new Anthropic.APIConnectionError({ message: "offline" }))).toBe(false);
    expect(isMalformedStream(new Error("bad JSON"))).toBe(false);
  });
});
