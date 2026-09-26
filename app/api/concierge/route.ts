import { anthropicStreamer, conciergeModel } from "@/lib/concierge/anthropic";
import { createConciergeHandler } from "@/lib/concierge/handler";
import { readShadowConfig, submitInquiry } from "@/lib/inquiry/submit";
import { createRateLimiter } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";
export const maxDuration = 60;

// Twenty messages in a burst, then one every 20 seconds, per IP.
const limiter = createRateLimiter({ capacity: 20, refillMs: 20_000 });

export const POST = createConciergeHandler({
  streamer: () => anthropicStreamer(),
  submit: (payload) => submitInquiry(payload, { config: readShadowConfig() }),
  limiter,
  model: () => conciergeModel(),
  siteUrl,
});
