import { createDraftSendHandler } from "@/lib/concierge/send";
import { conciergeSigner } from "@/lib/concierge/signing";
import { readShadowConfig } from "@/lib/inquiry/submit";
import { createRateLimiter } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

// Five messages in a burst, then one every two minutes, per IP (as the booking form).
const limiter = createRateLimiter({ capacity: 5, refillMs: 120_000 });

export const POST = createDraftSendHandler({
  signer: () => conciergeSigner(),
  config: () => readShadowConfig(),
  limiter,
  siteUrl,
});
