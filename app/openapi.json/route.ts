import { openApiDocument } from "@/lib/agents/openapi";
import { onlineBookingConfigured } from "@/lib/booking/config";
import { siteUrl } from "@/lib/site";

// Built with the site, like /llms.txt: online booking is read when the site is built.
export const dynamic = "force-static";

export function GET(): Response {
  return Response.json(openApiDocument(siteUrl, onlineBookingConfigured()), {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
