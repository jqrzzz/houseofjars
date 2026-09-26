import { sharedAvailabilityCache } from "@/lib/booking/cache";
import { createAvailabilityHandler } from "@/lib/booking/handler";
import { sharedLookupLimiters } from "@/lib/booking/limits";
import { readShadowConfig } from "@/lib/inquiry/submit";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

export const GET = createAvailabilityHandler({
  config: () => readShadowConfig(),
  cache: sharedAvailabilityCache(),
  limiters: sharedLookupLimiters(),
  siteUrl,
});
