import type { BetaMessageStreamParams, BetaUsage } from "@anthropic-ai/sdk/resources/beta/messages/messages";

/*
 * A hard ceiling on what Shadow can spend in a day on one server instance,
 * counted in input-token equivalents: on every current Claude model an output
 * token costs 5 input tokens, a cache write 1.25 and a cache read 0.1. Each
 * model call reserves its worst case before it starts, so concurrent calls
 * can never overshoot, and settles to its real usage when it ends.
 */

export const OUTPUT_WEIGHT = 5;
const CACHE_WRITE_WEIGHT = 1.25;
const CACHE_READ_WEIGHT = 0.1;

/** About US$5 a day at Claude Opus 5's list price ($5 per million input tokens): some 300 typical questions. */
export const DEFAULT_DAILY_BUDGET = 1_000_000;

interface UsagePart {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly cache_creation_input_tokens?: number | null;
  readonly cache_read_input_tokens?: number | null;
}

/** What a finished call cost, in input-token equivalents. */
export function weighUsage(usage: BetaUsage): number {
  // After a refusal fallback, `iterations` lists every attempt; the top level covers only the last.
  const parts: readonly UsagePart[] = usage.iterations?.length ? usage.iterations : [usage];
  const total = parts.reduce(
    (sum, part) =>
      sum +
      part.input_tokens +
      CACHE_WRITE_WEIGHT * (part.cache_creation_input_tokens ?? 0) +
      CACHE_READ_WEIGHT * (part.cache_read_input_tokens ?? 0) +
      OUTPUT_WEIGHT * part.output_tokens,
    0,
  );
  return Math.ceil(total);
}

/**
 * The most a call could cost: all of its input at the uncached price (counted
 * generously as one token per two characters) plus max_tokens of output.
 */
export function worstCaseCost(params: BetaMessageStreamParams): number {
  const inputChars = JSON.stringify([params.system, params.tools, params.messages]).length;
  return Math.ceil(inputChars / 2) + OUTPUT_WEIGHT * params.max_tokens;
}

export interface Reservation {
  /** Replaces the reservation with what the call really cost. Only the first call counts. */
  settle(cost: number): void;
}

export interface SpendBudget {
  /** Reserves `cost` from today's budget, or returns null when what is left can't cover it. */
  reserve(cost: number): Reservation | null;
  remaining(): number;
  /** Seconds until the budget refills, at midnight in Vientiane. */
  secondsUntilReset(): number;
}

const DAY_MS = 86_400_000;
/** Laos is UTC+7 all year. */
const VIENTIANE_OFFSET_MS = 7 * 3_600_000;

export function createDailyBudget({ limit, now = Date.now }: { limit: number; now?: () => number }): SpendBudget {
  let day = Number.NaN;
  let spent = 0;
  const today = () => {
    const current = Math.floor((now() + VIENTIANE_OFFSET_MS) / DAY_MS);
    if (current !== day) {
      day = current;
      spent = 0;
    }
    return current;
  };

  return {
    reserve(cost) {
      const reservedOn = today();
      if (spent + cost > limit) return null;
      spent += cost;
      let open = true;
      return {
        settle(actual) {
          if (!open) return;
          open = false;
          if (today() === reservedOn) spent = Math.max(0, spent - cost + actual);
        },
      };
    },
    remaining() {
      today();
      return Math.max(0, limit - spent);
    },
    secondsUntilReset() {
      const tomorrow = (today() + 1) * DAY_MS - VIENTIANE_OFFSET_MS;
      return Math.ceil((tomorrow - now()) / 1000);
    },
  };
}

/** CONCIERGE_DAILY_TOKEN_BUDGET, or the default. 0 keeps Shadow resting (a switch for the owner). */
export function dailyTokenBudget(env: Readonly<Record<string, string | undefined>> = process.env): number {
  const value = env.CONCIERGE_DAILY_TOKEN_BUDGET?.trim();
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : DEFAULT_DAILY_BUDGET;
}

/** Thrown when today's budget can't cover the next model call. */
export class SpendLimitReached extends Error {
  constructor() {
    super("The concierge's daily budget is spent.");
    this.name = "SpendLimitReached";
  }
}
