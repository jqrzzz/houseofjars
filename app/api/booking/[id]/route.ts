import { sharedPaymentLimiter } from "@/lib/booking/limits";
import { createBookingStatusHandler } from "@/lib/booking/handler";
import { readShadowConfig } from "@/lib/inquiry/submit";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

const handle = createBookingStatusHandler({
  config: () => readShadowConfig(),
  limiter: sharedPaymentLimiter(),
  siteUrl,
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, (await params).id);
}
