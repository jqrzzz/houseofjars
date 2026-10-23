import { after } from "next/server";
import { allPages } from "@/lib/pages";
import { createRateLimiter } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";
import { createPageViewHandler } from "@/lib/stats/handler";
import { sendCounts, statsConfig } from "@/lib/stats/send";

export const runtime = "nodejs";

// Sixty pages in a burst, then one every two seconds, per client: more than anyone reads.
const limiter = createRateLimiter({ capacity: 60, refillMs: 2_000 });

export const POST = createPageViewHandler({
  siteUrl,
  pages: new Set(allPages.map((page) => page.path)),
  limiter,
  // To Shadow once the browser has its answer: the visitor never waits for Shadow.
  count: (lines) => after(() => sendCounts(lines, { config: statsConfig() })),
});
