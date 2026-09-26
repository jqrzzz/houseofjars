import Anthropic from "@anthropic-ai/sdk";
import type { BetaContentBlock, BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { describe, expect, it, vi } from "vitest";
import { fakeClaude, toolUse, type Turn } from "@/test/fake-claude";
import type { SubmitResult } from "../inquiry/submit";
import type { ConciergeEvent } from "./protocol";
import type { ConciergeRequest } from "./request";
import {
  buildParams,
  classifyError,
  echoableContent,
  isMalformedStream,
  MAX_TOOL_ROUNDS,
  runConcierge,
} from "./run";
import { sendInquiryTool } from "./tool";

const request: ConciergeRequest = {
  session_id: "0b7a7a4e-3c2f-4d1e-9a58-6f2b8c1d9e10",
  consent: true,
  messages: [{ role: "user", content: "Please ask the team about a bed on 3 October. I'm Mai, mai@example.com." }],
};
const inquiry = { name: "Mai", email: "mai@example.com", message: "A bed on 3 October?" };

async function run(turns: Turn[], options: { consent?: boolean; submit?: SubmitResult } = {}) {
  const { streamer, calls } = fakeClaude(turns);
  const events: ConciergeEvent[] = [];
  const submit = vi.fn(async (payload: unknown) => (void payload, options.submit ?? ({ ok: true, id: "b1", duplicate: false } as const)));
  const promise = runConcierge({
    request: { ...request, consent: options.consent ?? request.consent },
    stream: streamer,
    submit,
    emit: (event) => events.push(event),
    model: "claude-opus-5",
    systemPrompt: "SYSTEM",
    now: new Date("2026-09-26T03:00:00Z"),
  });
  return { promise, events, calls, submit };
}

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
      tools: [sendInquiryTool],
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
  it("streams a plain answer and stops", async () => {
    const { promise, events, calls, submit } = await run([{ text: ["Check-in is ", "from 14:00."], stopReason: "end_turn" }]);
    await promise;
    expect(text(events)).toBe("Check-in is from 14:00.");
    expect(calls).toHaveLength(1);
    expect(submit).not.toHaveBeenCalled();
  });

  it("runs send_inquiry, returns the result to Claude and streams the follow-up", async () => {
    const { promise, events, calls, submit } = await run([
      { text: ["Sending it now."], blocks: [toolUse(inquiry)], stopReason: "tool_use" },
      { text: ["Done: the team will email you."], stopReason: "end_turn" },
    ]);
    await promise;

    expect(submit).toHaveBeenCalledOnce();
    expect(submit.mock.calls[0]![0]).toMatchObject({ source: "website_concierge", client_ref: request.session_id });
    expect(events).toContainEqual({ type: "inquiry_sent" });
    expect(text(events)).toBe("Sending it now.\n\nDone: the team will email you.");

    const followUp = calls[1]!.messages as BetaMessageParam[];
    expect(followUp.at(-2)?.role).toBe("assistant");
    expect(followUp.at(-1)).toEqual({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: "toolu_1",
          content: "sent: the team has the inquiry and will reply using the guest's contact details.",
        },
      ],
    });
  });

  it("refuses to send without consent from the chat window", async () => {
    const { promise, events, calls, submit } = await run(
      [
        { blocks: [toolUse(inquiry)], stopReason: "tool_use" },
        { text: ["Please tick the box below."], stopReason: "end_turn" },
      ],
      { consent: false },
    );
    await promise;
    expect(submit).not.toHaveBeenCalled();
    expect(events).toContainEqual({ type: "consent_required" });
    const result = (calls[1]!.messages.at(-1)!.content as { is_error?: boolean; content: string }[])[0]!;
    expect(result.is_error).toBe(true);
    expect(result.content).toMatch(/^consent_required/);
  });

  it(`stops after ${MAX_TOOL_ROUNDS} tool rounds`, async () => {
    const again: Turn = { blocks: [toolUse(inquiry)], stopReason: "tool_use" };
    const { promise, calls, submit } = await run([again, again, again, again]);
    await promise;
    expect(submit).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
    expect(calls).toHaveLength(MAX_TOOL_ROUNDS + 1);
  });

  it("never runs a tool from a refused or truncated reply", async () => {
    for (const [stopReason, code] of [
      ["refusal", "refusal"],
      ["max_tokens", "truncated"],
    ] as const) {
      const { promise, events, submit } = await run([{ text: ["Let me"], blocks: [toolUse(inquiry)], stopReason }]);
      await promise;
      expect(submit).not.toHaveBeenCalled();
      expect(events.at(-1)).toEqual({ type: "notice", code });
    }
  });

  it("answers unknown tools with an error result", async () => {
    const { promise, calls, submit } = await run([
      { blocks: [toolUse({}, "book_bed")], stopReason: "tool_use" },
      { text: ["Sorry."], stopReason: "end_turn" },
    ]);
    await promise;
    expect(submit).not.toHaveBeenCalled();
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
      { type: "tool_use", id: "toolu_0", name: "send_inquiry", input: {} },
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
