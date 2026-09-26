import { z } from "zod";
import { MAX_MESSAGE_CHARS, MAX_TOTAL_CHARS, MAX_TURNS } from "./limits";

const content = z.string().trim().min(1).max(MAX_MESSAGE_CHARS);

const message = z.discriminatedUnion("role", [
  z.strictObject({ role: z.literal("user"), content }),
  /** `sig`: the server's signature on its own reply; replies without a valid one never reach Claude. */
  z.strictObject({ role: z.literal("assistant"), content, sig: z.string().max(128).optional() }),
]);

export const conciergeRequestSchema = z
  .strictObject({
    /** One per conversation; signatures on replies and drafts are bound to it. */
    session_id: z.uuid(),
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
