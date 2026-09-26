import { sharedAvailabilityCache } from "@/lib/booking/cache";
import { createBookingHandler } from "@/lib/booking/handler";
import { sharedBookingGate } from "@/lib/booking/limits";
import { readShadowConfig } from "@/lib/inquiry/submit";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

export const POST = createBookingHandler({
  config: () => readShadowConfig(),
  cache: sharedAvailabilityCache(),
  gate: sharedBookingGate(),
  siteUrl,
});
