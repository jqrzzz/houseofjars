import { randomUUID } from "node:crypto";
import type { BetaTool } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { buildDraft, CONTACT_METHODS, prepareInquiryInputSchema, type InquiryDraft } from "../inquiry/schema";

export const PREPARE_INQUIRY = "prepare_inquiry";

const nullableString = (description: string, extra: Record<string, unknown> = {}) => ({
  type: ["string", "null"],
  description,
  ...extra,
});

/**
 * The concierge's only tool. It sends nothing: it turns what the guest told
 * Shadow into a draft that the chat window shows them in full, and only the
 * guest's own Send (POST /api/concierge/send) delivers it. Its schema mirrors
 * the inquiry contract minus client_ref, source and consent, which the server
 * sets. The server validates every call with prepareInquiryInputSchema,
 * which is also what makes eager input streaming (no server-side buffering)
 * safe.
 */
export const prepareInquiryTool: BetaTool = {
  name: PREPARE_INQUIRY,
  eager_input_streaming: true,
  description:
    "Prepare a message from the guest to the House of Jars team, who reply by email, WhatsApp or phone. " +
    "This sends nothing: the chat window shows the guest the exact details with a privacy checkbox and a Send button, " +
    "and only the guest can send it. Call it when the guest wants the team to contact them and you have their name, " +
    "their message and at least an email address or a WhatsApp/phone number. " +
    "If the guest wants to change something, call it again with the corrected details.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string", description: "The guest's name, as they gave it." },
      email: nullableString("Guest's email address, or null."),
      phone: nullableString("Guest's WhatsApp or phone number with country code (E.164 preferred, e.g. +447700900123), or null."),
      preferred_contact: {
        type: ["string", "null"],
        enum: [...CONTACT_METHODS, null],
        description: "How the guest prefers to be contacted, or null.",
      },
      check_in: nullableString("Arrival date as YYYY-MM-DD, or null.", { format: "date" }),
      check_out: nullableString("Departure date as YYYY-MM-DD (after check_in), or null.", { format: "date" }),
      guests: { type: ["integer", "null"], description: "Number of guests (1 to 20), or null." },
      bed_preference: nullableString("Short bed or dorm preference in the guest's words (80 characters max), or null."),
      message: { type: "string", description: "What the guest wants the team to know or answer, in the guest's words." },
      conversation_summary: nullableString(
        "One or two sentences in your own words summarising the request. Never the transcript.",
      ),
    },
    required: ["name", "message"],
  },
};

export interface ToolOutcome {
  /** Text returned to the model as the tool result. */
  readonly content: string;
  readonly isError: boolean;
  /** The draft for the chat window, with the server's signature over it. */
  readonly draft: { readonly draft: InquiryDraft; readonly token: string } | null;
}

/**
 * Runs prepare_inquiry. Guest-supplied data only flows into the draft; it can
 * never change what the tool does, and nothing leaves the server here. Each
 * draft gets its own reference, so a corrected draft is a new inquiry while
 * sending the same draft twice is not.
 */
export function runPrepareInquiry(
  input: unknown,
  sign: (draft: InquiryDraft) => string,
  newReference: () => string = randomUUID,
): ToolOutcome {
  const parsed = prepareInquiryInputSchema.safeParse(input);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`);
    return { content: `invalid_input: ${problems.join("; ")}. Ask the guest for what is missing.`, isError: true, draft: null };
  }

  const draft = buildDraft(parsed.data, newReference());
  return {
    content:
      "draft_ready: the guest now sees these exact details in a card below your reply, with a privacy checkbox and a Send button. " +
      "Nothing has been sent. In one short sentence, ask them to check the details and press Send, or to tell you what to change.",
    isError: false,
    draft: { draft, token: sign(draft) },
  };
}
