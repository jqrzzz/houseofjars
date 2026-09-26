import { z } from "zod";

export const MAX_TURNS = 12;
export const MAX_MESSAGE_CHARS = 1500;
export const MAX_TOTAL_CHARS = 12_000;
export const MAX_REQUEST_BYTES = 64 * 1024;

const message = z.strictObject({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
});

export const conciergeRequestSchema = z
  .strictObject({
    /** One per conversation; also the idempotency key for any inquiry it sends. */
    session_id: z.uuid(),
    /** Whether the guest ticked the privacy-notice box in the chat window. */
    consent: z.boolean(),
    messages: z.array(message).min(1).max(MAX_TURNS),
  })
  .superRefine((value, ctx) => {
    if (value.messages[0]?.role !== "user") {
      ctx.addIssue({ code: "custom", path: ["messages", 0], message: "The conversation must start with the guest." });
    }
    if (value.messages.at(-1)?.role !== "user") {
      ctx.addIssue({ code: "custom", path: ["messages"], message: "The last message must be the guest's." });
    }
    const total = value.messages.reduce((sum, m) => sum + m.content.length, 0);
    if (total > MAX_TOTAL_CHARS) {
      ctx.addIssue({ code: "custom", path: ["messages"], message: "The conversation is too long." });
    }
  });

export type ConciergeRequest = z.output<typeof conciergeRequestSchema>;
