import { createInquiryHandler } from "@/lib/inquiry/handler";
import { readShadowConfig } from "@/lib/inquiry/submit";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Five messages in a burst, then one every two minutes, per IP.
const limiter = createRateLimiter({ capacity: 5, refillMs: 120_000 });

export const POST = createInquiryHandler({ config: () => readShadowConfig(), limiter });
