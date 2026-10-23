import type { ShadowConfig } from "../inquiry/submit";
import type { CountLine } from "./lines";

/**
 * Shadow's address and a key of the house's when this deployment counts:
 * production on Vercel, or a server off Vercel (a local one, with
 * test/fake-shadow.ts); never a preview, whose visitors are the people
 * building the site. The key is SHADOW_STATS_KEY, else the inquiry key:
 * with SHADOW_API_URL and SHADOW_STATS_KEY alone the site counts while
 * online booking and the message form stay off (they need
 * SHADOW_INQUIRY_KEY). SITE_STATS=off stops the counting anywhere.
 */
export function statsConfig(env: Readonly<Record<string, string | undefined>> = process.env): ShadowConfig | null {
  if (env.SITE_STATS?.trim().toLowerCase() === "off") return null;
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "production") return null;
  const apiUrl = env.SHADOW_API_URL?.trim();
  const key = env.SHADOW_STATS_KEY?.trim() || env.SHADOW_INQUIRY_KEY?.trim();
  if (!apiUrl || !key) return null;
  return { apiUrl: apiUrl.replace(/\/+$/, ""), key };
}

export interface SendDeps {
  readonly config: ShadowConfig | null;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
  readonly log?: (message: string) => void;
}

/**
 * Adds the lines to the day's counts in Shadow (POST /api/public/site-counts,
 * docs/INQUIRY_API.md). Runs after the visitor has their answer, and never
 * throws: a count that does not arrive is lost. Shadow before its database
 * update (503) and a day with all its counts used (429) are not logged.
 */
export async function sendCounts(lines: readonly CountLine[], deps: SendDeps): Promise<void> {
  if (!deps.config || lines.length === 0) return;
  const log = deps.log ?? ((message: string) => console.error(message));
  try {
    const response = await (deps.fetch ?? fetch)(`${deps.config.apiUrl}/api/public/site-counts`, {
      method: "POST",
      headers: { authorization: `Bearer ${deps.config.key}`, "content-type": "application/json" },
      body: JSON.stringify({ counts: lines }),
      signal: AbortSignal.timeout(deps.timeoutMs ?? 4000),
    });
    if (!response.ok && response.status !== 503 && response.status !== 429) {
      log(`[stats] Shadow answered ${response.status} to the site's counts`);
    }
  } catch (error) {
    log(`[stats] the site's counts did not reach Shadow: ${error instanceof Error ? error.name : "error"}`);
  }
}
