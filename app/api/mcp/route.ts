import { createMcpHandler, methodNotAllowed } from "@/lib/agents/mcp";
import { sharedAvailabilityCache } from "@/lib/booking/cache";
import { onlineBookingConfigured } from "@/lib/booking/config";
import { sharedLookupLimiters } from "@/lib/booking/limits";
import { readShadowConfig } from "@/lib/inquiry/submit";
import { createRateLimiter } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

// Sixty messages in a burst, then one a second, per client. Lookups of free beds also count against /book's own limits.
const limiter = createRateLimiter({ capacity: 60, refillMs: 1_000 });

export const POST = createMcpHandler({
  siteUrl,
  onlineBooking: () => onlineBookingConfigured(),
  availability: { config: () => readShadowConfig(), cache: sharedAvailabilityCache(), limiters: sharedLookupLimiters() },
  limiter,
});

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
