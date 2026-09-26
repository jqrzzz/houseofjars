import type { BetaUsage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { describe, expect, it } from "vitest";
import { createDailyBudget, dailyTokenBudget, DEFAULT_DAILY_BUDGET, weighUsage, worstCaseCost } from "./budget";
import { buildParams, MAX_TOKENS } from "./run";

const usage = (parts: Partial<BetaUsage>) => ({ input_tokens: 0, output_tokens: 0, ...parts }) as BetaUsage;

describe("what a call costs (R4-03)", () => {
  it("weighs output, cache writes and cache reads against input tokens", () => {
    expect(
      weighUsage(usage({ input_tokens: 1000, output_tokens: 100, cache_creation_input_tokens: 2000, cache_read_input_tokens: 3000 })),
    ).toBe(1000 + 500 + 2500 + 300);
  });

  it("counts every attempt after a refusal fallback", () => {
    const iterations = [
      { type: "message", input_tokens: 100, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      { type: "fallback_message", input_tokens: 200, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    ];
    expect(weighUsage(usage({ input_tokens: 200, output_tokens: 20, iterations } as Partial<BetaUsage>))).toBe(450);
  });

  it("reserves the whole input plus max_tokens of output as the worst case", () => {
    const now = new Date("2026-09-26T03:00:00Z");
    const short = worstCaseCost(buildParams({ model: "m", systemPrompt: "S", now }, [{ role: "user", content: "Hi" }]));
    const long = worstCaseCost(buildParams({ model: "m", systemPrompt: "S", now }, [{ role: "user", content: "x".repeat(10_000) }]));
    expect(short).toBeGreaterThan(5 * MAX_TOKENS);
    expect(long - short).toBeGreaterThan(4_900); // about one token per two characters
  });
});

describe("daily budget (R4-03)", () => {
  function clock(iso: string) {
    let time = Date.parse(iso);
    return { now: () => time, set: (next: string) => (time = Date.parse(next)) };
  }

  it("never lets reservations exceed the limit, and gives back what a call didn't use", () => {
    const budget = createDailyBudget({ limit: 100, now: clock("2026-09-26T03:00:00Z").now });
    const a = budget.reserve(60)!;
    expect(budget.reserve(60)).toBeNull();
    a.settle(10);
    expect(budget.remaining()).toBe(90);
    a.settle(0); // only the first settle counts
    expect(budget.remaining()).toBe(90);
    expect(budget.reserve(90)).not.toBeNull();
    expect(budget.reserve(1)).toBeNull();
  });

  it("refills at midnight in Vientiane (17:00 UTC)", () => {
    const time = clock("2026-09-26T16:59:00Z");
    const budget = createDailyBudget({ limit: 100, now: time.now });
    expect(budget.reserve(100)).not.toBeNull();
    expect(budget.remaining()).toBe(0);
    expect(budget.secondsUntilReset()).toBe(60);
    time.set("2026-09-26T17:00:00Z");
    expect(budget.remaining()).toBe(100);
  });

  it("reads CONCIERGE_DAILY_TOKEN_BUDGET, where 0 keeps Shadow resting", () => {
    expect(dailyTokenBudget({})).toBe(DEFAULT_DAILY_BUDGET);
    expect(dailyTokenBudget({ CONCIERGE_DAILY_TOKEN_BUDGET: "250000" })).toBe(250_000);
    expect(dailyTokenBudget({ CONCIERGE_DAILY_TOKEN_BUDGET: "0" })).toBe(0);
    expect(dailyTokenBudget({ CONCIERGE_DAILY_TOKEN_BUDGET: "lots" })).toBe(DEFAULT_DAILY_BUDGET);
    expect(dailyTokenBudget({ CONCIERGE_DAILY_TOKEN_BUDGET: "-5" })).toBe(DEFAULT_DAILY_BUDGET);
  });
});
