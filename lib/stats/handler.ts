import { z } from "zod";
import { json, readJsonBody, rejectCrossSite } from "../http";
import { clientKey, type RateLimitDecision } from "../rate-limit";
import { pageViewLines, type CountLine } from "./lines";
import { visitSource } from "./sources";
import { asksNotToBeCounted, countryOf, deviceOf, isRobot, pageKey } from "./visitor";

/** A page view is a path and, on the first page the browser loads, where it came from: well under 3 KB. */
const MAX_BYTES = 3 * 1024;

const pageViewSchema = z.strictObject({
  /** The page's path, as the browser's address bar has it (no query). */
  path: z.string().max(512),
  /** The first page the browser loaded on the site (not a page opened from another of its pages without reloading). */
  landing: z.boolean().default(false),
  /** Where the browser came from (document.referrer without its path), sent with the first page only. */
  referrer: z.string().max(2048).nullish(),
  /** The link's own utm_source, sent with the first page only. */
  utm_source: z.string().max(200).nullish(),
});

export interface PageViewDeps {
  readonly siteUrl: string;
  /** Every page of the site (lib/pages.ts allPages); any other path counts as "other". */
  readonly pages: ReadonlySet<string>;
  /** Per client (IPv4 address or IPv6 /64). */
  readonly limiter: { take(key: string): RateLimitDecision };
  /** Sends the counts to Shadow after the response (lib/stats/send.ts, through after()). */
  readonly count: (lines: readonly CountLine[]) => void;
}

/**
 * POST /api/page-view: the site's page-view counter (components/stats/PageCounter.tsx).
 * Counts a page seen and, on the first page of a visit, where it came from,
 * the country and the kind of device; keeps nothing about the visitor (no
 * address, no cookie, no identifier). Robots, and browsers that ask not to be
 * followed, are not counted. Answers 204 whether or not it counted.
 */
export function createPageViewHandler(deps: PageViewDeps) {
  const ownHosts = [new URL(deps.siteUrl).host];

  return async function handlePageView(request: Request): Promise<Response> {
    const refused = rejectCrossSite(request, deps.siteUrl);
    if (refused) return refused;

    const body = await readJsonBody(request, MAX_BYTES);
    if (!body.ok) return json({ error: body.status === 413 ? "payload_too_large" : "invalid_request" }, body.status);
    const parsed = pageViewSchema.safeParse(body.value);
    if (!parsed.success) return json({ error: "invalid_request" }, 400);

    const userAgent = request.headers.get("user-agent");
    if (isRobot(userAgent) || asksNotToBeCounted(request.headers)) return new Response(null, { status: 204 });
    if (!deps.limiter.take(clientKey(request.headers)).allowed) return json({ error: "rate_limited" }, 429);

    const { path, landing, referrer, utm_source: label } = parsed.data;
    const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
    const source = landing ? visitSource(referrer, label, host ? [...ownHosts, host] : ownHosts) : null;
    deps.count(
      pageViewLines(
        pageKey(path, deps.pages),
        source === null ? null : { source, country: countryOf(request.headers), device: deviceOf(userAgent) },
      ),
    );
    return new Response(null, { status: 204 });
  };
}
