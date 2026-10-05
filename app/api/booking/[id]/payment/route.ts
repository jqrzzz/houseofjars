import { sharedPaymentLimiter } from "@/lib/booking/limits";
import { createPayAgainHandler } from "@/lib/booking/handler";
import { readShadowConfig } from "@/lib/inquiry/submit";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

const handle = createPayAgainHandler({
  config: () => readShadowConfig(),
  limiter: sharedPaymentLimiter(),
  siteUrl,
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, (await params).id);
}
