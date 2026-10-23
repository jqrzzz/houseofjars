import { createDraftSendHandler } from "@/lib/concierge/send";
import { conciergeSigner } from "@/lib/concierge/signing";
import { sharedInquiryGate } from "@/lib/inquiry/gate";
import { readShadowConfig } from "@/lib/inquiry/submit";
import { siteUrl } from "@/lib/site";
import { tallyAfterResponse } from "@/lib/stats/tally";

export const runtime = "nodejs";

export const POST = createDraftSendHandler({
  signer: () => conciergeSigner(),
  config: () => readShadowConfig(),
  gate: sharedInquiryGate(),
  siteUrl,
  tally: () => tallyAfterResponse(),
});
