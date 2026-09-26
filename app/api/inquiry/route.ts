import { sharedInquiryGate } from "@/lib/inquiry/gate";
import { createInquiryHandler } from "@/lib/inquiry/handler";
import { readShadowConfig } from "@/lib/inquiry/submit";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

export const POST = createInquiryHandler({ config: () => readShadowConfig(), gate: sharedInquiryGate(), siteUrl });
