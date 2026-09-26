import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL, type StreamMessages } from "./run";

let client: Anthropic | null = null;

/**
 * The real Claude client, created on first use. Returns null without an
 * API key so the route can answer 503 instead of failing mid-stream.
 */
export function anthropicStreamer(env: NodeJS.ProcessEnv = process.env): StreamMessages | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 2 });
  const anthropic = client;
  return (params, options) => anthropic.beta.messages.stream(params, options);
}

export function conciergeModel(env: NodeJS.ProcessEnv = process.env): string {
  return env.CONCIERGE_MODEL?.trim() || DEFAULT_MODEL;
}
