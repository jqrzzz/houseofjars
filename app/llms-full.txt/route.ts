import { onlineBookingConfigured } from "@/lib/booking/config";
import { buildLlmsFullTxt } from "@/lib/llms";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsFullTxt(siteUrl, { onlineBooking: onlineBookingConfigured() }), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
