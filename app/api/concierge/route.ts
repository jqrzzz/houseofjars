import { onlineBookingConfigured } from "@/lib/booking/config";
import { anthropicStreamer, conciergeModel } from "@/lib/concierge/anthropic";
import { createDailyBudget, dailyTokenBudget } from "@/lib/concierge/budget";
import { createConciergeHandler } from "@/lib/concierge/handler";
import { MAX_CONVERSATION_TURNS } from "@/lib/concierge/limits";
import { conciergeSigner } from "@/lib/concierge/signing";
import { createRateLimiter } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";
export const maxDuration = 60;

// Twenty messages in a burst, then one every 20 seconds, per client.
const limiter = createRateLimiter({ capacity: 20, refillMs: 20_000 });
// MAX_CONVERSATION_TURNS guest messages per conversation, then one a day.
const conversations = createRateLimiter({ capacity: MAX_CONVERSATION_TURNS, refillMs: 86_400_000, maxKeys: 5_000 });
// The hard ceiling on what this server instance spends on Claude in a day.
const budget = createDailyBudget({ limit: dailyTokenBudget() });

export const POST = createConciergeHandler({
  streamer: () => anthropicStreamer(),
  signer: () => conciergeSigner(),
  limiter,
  conversations,
  budget,
  model: () => conciergeModel(),
  siteUrl,
  onlineBooking: () => onlineBookingConfigured(),
});
