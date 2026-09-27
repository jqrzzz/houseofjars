import Anthropic from "@anthropic-ai/sdk";
import type { BetaContentBlock, BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeClaude, toolUse, type Turn } from "@/test/fake-claude";
import { FAKE_ROOMS, startFakeShadow, type FakeShadow } from "@/test/fake-shadow";
import { createAvailabilityCache } from "../booking/cache";
import { createLookupLimiters } from "../booking/limits";
import { addDays } from "../dates";
import { availabilityChecker, checkAvailabilityTool, type CheckAvailability } from "./availability";
import { createDailyBudget, SpendLimitReached, type SpendBudget } from "./budget";
import { priceLine } from "./guard";
import type { HistoryMessage } from "./history";
import type { ConciergeEvent } from "./protocol";
import {
  buildParams,
  classifyError,
  echoableContent,
  isMalformedStream,
  MAX_TOOL_CALLS,
  runConcierge,
} from "./run";
import { createSigner } from "./signing";
import { prepareInquiryTool } from "./tool";

const sessionId = "0b7a7a4e-3c2f-4d1e-9a58-6f2b8c1d9e10";
const messages: HistoryMessage[] = [
  { role: "user", content: "Please ask the team about a bed on 3 October. I'm Mai, mai@example.com." },
];
const inquiry = { name: "Mai", email: "mai@example.com", message: "A bed on 3 October?" };
const NOW = new Date("2026-09-26T03:00:00Z");

const signer = createSigner("sk-ant-test-key");

// A stand-in for Shadow Check-in behind the booking form's own lookup, as the site wires it.
let fake: FakeShadow;
const clock = () => NOW.getTime();
beforeAll(async () => {
  fake = await startFakeShadow({ now: clock });
});
afterAll(async () => {
  await fake.close();
});
beforeEach(() => {
  fake.reset();
});

function freeBeds(): CheckAvailability {
  const path = {
    config: () => ({ apiUrl: fake.url, key: fake.key }),
    cache: createAvailabilityCache(clock),
    limiters: createLookupLimiters(clock),
    now: clock,
    log: () => {},
  };
  return availabilityChecker(path, "203.0.113.9");
}

async function run(
  turns: Turn[],
  budget: SpendBudget = createDailyBudget({ limit: 10_000_000 }),
  checkAvailability?: CheckAvailability,
) {
  const { streamer, calls } = fakeClaude(turns);
  const events: ConciergeEvent[] = [];
  const signDraft = vi.fn((draft: Parameters<typeof signer.signDraft>[1]) => signer.signDraft(sessionId, draft));
  const promise = runConcierge({
    messages,
    stream: streamer,
    signDraft,
    budget,
    emit: (event) => events.push(event),
    model: "claude-opus-5",
    systemPrompt: "SYSTEM",
    checkAvailability,
    now: NOW,
  });
  return { promise, events, calls, signDraft };
}

const drafts = (events: ConciergeEvent[]) => events.filter((event) => event.type === "draft");
const cards = (events: ConciergeEvent[]) => events.flatMap((event) => (event.type === "availability" ? [event.card] : []));
const toolNames = (params: { tools?: unknown[] }) => (params.tools ?? []).map((tool) => (tool as { name: string }).name);

/** The tool results sent back to Claude in a call. */
function toolResults(messagesSent: BetaMessageParam[]) {
  return messagesSent.at(-1)!.content as { type: string; tool_use_id: string; content: string; is_error?: boolean }[];
}

const lookUp = (input: object, id = "toolu_1") => toolUse(input, "check_availability", id);
const stay = { check_in: "2026-10-03", check_out: "2026-10-05", guests: 2 };
const shadowLookups = () => fake.calls.filter((call) => call.path.startsWith("/api/public/availability")).length;

const text = (events: ConciergeEvent[]) =>
  events.flatMap((event) => (event.type === "text" ? [event.text] : [])).join("");

describe("request parameters", () => {
  const params = buildParams({ model: "claude-opus-5", systemPrompt: "SYSTEM", now: new Date("2026-09-26T03:00:00Z") }, [
    { role: "user", content: "Hi" },
  ]);

  it("asks for adaptive thinking at low effort with server-side refusal fallbacks", () => {
    expect(params).toMatchObject({
      model: "claude-opus-5",
      max_tokens: 2048,
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

  it("offers check_availability only when the site takes bookings online", () => {
    expect(toolNames(params)).toEqual(["prepare_inquiry"]);
    const online = buildParams({ model: "claude-opus-5", systemPrompt: "SYSTEM", now: NOW, checkAvailability: freeBeds() }, []);
    expect(online.tools).toEqual([prepareInquiryTool, checkAvailabilityTool]);
  });

  it("keeps the cached prefix (tools, then the stable prompt) the same from day to day", () => {
    const on = (now: Date) => buildParams({ model: "claude-opus-5", systemPrompt: "SYSTEM", now, checkAvailability: freeBeds() }, []);
    const [today, tomorrow] = [on(NOW), on(new Date("2026-09-27T03:00:00Z"))];
    expect(JSON.stringify([tomorrow.tools, tomorrow.system?.[0]])).toBe(JSON.stringify([today.tools, today.system?.[0]]));
    expect(tomorrow.system?.[1]).toEqual({ type: "text", text: "Today's date in Vientiane is Sunday, 2026-09-27." });
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

  it(`runs at most ${MAX_TOOL_CALLS} tool calls per guest message, turns the next away, and then stops`, async () => {
    const again: Turn = { blocks: [toolUse(inquiry)], stopReason: "tool_use" };
    const { promise, events, calls } = await run([again, again, again, again, again, again]);
    await promise;
    expect(drafts(events)).toHaveLength(MAX_TOOL_CALLS);
    // One more call to explain the refusal; a tool call in that one ends the reply.
    expect(calls).toHaveLength(MAX_TOOL_CALLS + 2);
    const [refusal] = toolResults(calls[MAX_TOOL_CALLS + 1]!.messages);
    expect(refusal).toMatchObject({ is_error: true, content: expect.stringMatching(/^limit_reached: the 3 tool calls/) });
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

describe("checking free beds (check_availability)", () => {
  it("looks the stay up through the booking path and shows a card built from Shadow Check-in's answer, not Claude's words", async () => {
    const { promise, events, calls } = await run(
      [
        { text: ["Let me look."], blocks: [lookUp(stay)], stopReason: "tool_use" },
        // Claude gets the dates wrong in its words: the card still shows the stay that was looked up.
        { text: ["Beds are free from the 4th to the 6th: press Book these dates below."], stopReason: "end_turn" },
      ],
      undefined,
      freeBeds(),
    );
    await promise;

    expect(cards(events)).toEqual([
      {
        ...stay,
        nights: 2,
        rooms: FAKE_ROOMS.map((room) => ({ name: room.name, kind: room.kind, free: room.beds })),
      },
    ]);
    // The card reaches the window before the reply that points to it.
    expect(events.findIndex((event) => event.type === "availability")).toBeLessThan(
      events.findIndex((event) => event.type === "text" && event.text.startsWith("Beds")),
    );
    expect(shadowLookups()).toBe(1);

    const [result] = toolResults(calls[1]!.messages);
    expect(result).toMatchObject({ type: "tool_result", tool_use_id: "toolu_1" });
    expect(result!.is_error).toBeUndefined();
    expect(JSON.parse(result!.content)).toMatchObject({ ...stay, bookable: true, booking_card_shown: true });
    // The fake Shadow Check-in prices two of its rooms; none of it reaches Claude.
    expect(result!.content).not.toMatch(/price|total|amount|currency|LAK|USD/i);
  });

  it(`allows ${MAX_TOOL_CALLS} lookups per guest message and answers a fourth with a tool error Claude explains`, async () => {
    const nights = (i: number) => ({ check_in: addDays(stay.check_in, i * 7), check_out: addDays(stay.check_out, i * 7), guests: 2 });
    const turns: Turn[] = [0, 1, 2, 3].map((i) => ({ blocks: [lookUp(nights(i), `toolu_${i}`)], stopReason: "tool_use" }));
    const { promise, events, calls } = await run(
      [...turns, { text: ["I checked three stays; which one shall we book?"], stopReason: "end_turn" }],
      undefined,
      freeBeds(),
    );
    expect(await promise).toBe("I checked three stays; which one shall we book?");

    expect(shadowLookups()).toBe(MAX_TOOL_CALLS);
    expect(cards(events).map((card) => card.check_in)).toEqual([0, 1, 2].map((i) => nights(i).check_in));
    expect(toolResults(calls[4]!.messages)).toEqual([
      {
        type: "tool_result",
        tool_use_id: "toolu_3",
        is_error: true,
        content: "limit_reached: the 3 tool calls allowed for one guest message are used up, so this call was not run.",
      },
    ]);
    expect(calls).toHaveLength(5);
  });

  it("relays Shadow Check-in's limits and failures as tool results, never as an exception", async () => {
    for (const [mode, expected] of [
      ["rate_limited", { error: "busy" }],
      ["not_configured", { reason: "booking_closed" }],
    ] as const) {
      fake.reset();
      fake.state.mode = mode;
      const { promise, events, calls } = await run(
        [
          { blocks: [lookUp(stay)], stopReason: "tool_use" },
          { text: ["I can't see the free beds just now."], stopReason: "end_turn" },
        ],
        undefined,
        freeBeds(),
      );
      expect(await promise, mode).toBe("I can't see the free beds just now.");
      expect(cards(events)).toEqual([]);
      expect(JSON.parse(toolResults(calls[1]!.messages)[0]!.content), mode).toMatchObject(expected);
    }
  });

  it("offers no check_availability when the site doesn't take bookings online, and runs none", async () => {
    const { promise, events, calls } = await run([
      { blocks: [lookUp(stay)], stopReason: "tool_use" },
      { text: ["The booking sites show what is free."], stopReason: "end_turn" },
    ]);
    await promise;
    expect(toolNames(calls[0]!)).toEqual(["prepare_inquiry"]);
    expect(toolResults(calls[1]!.messages)[0]).toMatchObject({ is_error: true, content: "unknown_tool" });
    expect(cards(events)).toEqual([]);
    expect(fake.calls).toHaveLength(0);
  });
});

describe("spend ceiling (R4-03)", () => {
  it("reserves each call's worst case and settles to what it really used", async () => {
    const budget = createDailyBudget({ limit: 1_000_000 });
    const { promise } = await run([{ text: ["Hi."], stopReason: "end_turn" }], budget);
    await promise;
    expect(budget.remaining()).toBe(1_000_000 - 6); // the fake reports 1 input and 1 output token
  });

  it("calls nothing when today's budget can't cover a call", async () => {
    const { promise, calls } = await run([{ text: ["Hi."], stopReason: "end_turn" }], createDailyBudget({ limit: 1_000 }));
    await expect(promise).rejects.toBeInstanceOf(SpendLimitReached);
    expect(calls).toHaveLength(0);
  });

  it("stops before a follow-up call the budget can't cover", async () => {
    const budget = createDailyBudget({ limit: 30_000 });
    const { promise, calls } = await run(
      [
        { blocks: [toolUse(inquiry)], stopReason: "tool_use", usage: { input_tokens: 20_000, output_tokens: 0 } },
        { text: ["Please check it."], stopReason: "end_turn" },
      ],
      budget,
    );
    await expect(promise).rejects.toBeInstanceOf(SpendLimitReached);
    expect(calls).toHaveLength(1);
    expect(classifyError(new SpendLimitReached())).toBe("resting");
  });

  it("gives back a reservation the API turned away, but keeps one for a call that may have run", async () => {
    const budget = createDailyBudget({ limit: 1_000_000 });
    const overloaded = new Anthropic.InternalServerError(529, undefined, "Overloaded", new Headers());
    await (await run([{ stopReason: "end_turn", error: overloaded }], budget)).promise.catch(() => {});
    expect(budget.remaining()).toBe(1_000_000);

    const midStream = new Anthropic.APIError(undefined, undefined, "overloaded", undefined, "overloaded_error");
    await (await run([{ text: ["Part"], stopReason: "end_turn", error: midStream }], budget)).promise.catch(() => {});
    expect(budget.remaining()).toBeLessThan(1_000_000 - 10_000);
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
