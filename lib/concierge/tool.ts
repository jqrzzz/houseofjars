import type { BetaTool } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { buildPayload, CONTACT_METHODS, sendInquiryInputSchema } from "../inquiry/schema";
import type { SubmitResult } from "../inquiry/submit";

export const SEND_INQUIRY = "send_inquiry";

const nullableString = (description: string, extra: Record<string, unknown> = {}) => ({
  type: ["string", "null"],
  description,
  ...extra,
});

/**
 * The concierge's only tool. Its schema mirrors the inquiry contract minus
 * client_ref, source and consent, which the server sets. The server validates
 * every call with sendInquiryInputSchema before anything is sent.
 */
export const sendInquiryTool: BetaTool = {
  name: SEND_INQUIRY,
  description:
    "Send the guest's message to the House of Jars team, who reply by email, WhatsApp or phone. " +
    "Call this only when all of these are true: (1) the guest wants the team to contact them; " +
    "(2) you have their name, their message and at least an email address or a WhatsApp/phone number; " +
    "(3) you read back a one-line summary and the guest clearly confirmed they want it sent. " +
    "The guest must also tick the privacy box in the chat window; if they haven't, this returns consent_required. " +
    "Send at most once per conversation.",
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
  /** What the chat window should show. */
  readonly event: "consent_required" | "inquiry_sent" | "inquiry_failed" | null;
}

/**
 * Runs send_inquiry. Guest-supplied data only flows into the inquiry; it can
 * never change what the tool does. Nothing is sent without UI consent.
 */
export async function runSendInquiry(
  input: unknown,
  context: {
    readonly consent: boolean;
    readonly sessionId: string;
    readonly submit: (payload: unknown) => Promise<SubmitResult>;
  },
): Promise<ToolOutcome> {
  const parsed = sendInquiryInputSchema.safeParse(input);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`);
    return { content: `invalid_input: ${problems.join("; ")}. Ask the guest for what is missing.`, isError: true, event: null };
  }

  if (!context.consent) {
    return {
      content:
        "consent_required: the guest has not ticked the privacy-notice box. Nothing was sent. Ask them to tick the box below the chat and confirm again.",
      isError: true,
      event: "consent_required",
    };
  }

  const result = await context.submit(
    buildPayload(parsed.data, { client_ref: context.sessionId, source: "website_concierge" }),
  );

  if (result.ok) {
    return {
      content: result.duplicate
        ? "already_sent: this conversation's inquiry had already reached the team. Nothing new was sent."
        : "sent: the team has the inquiry and will reply using the guest's contact details.",
      isError: false,
      event: "inquiry_sent",
    };
  }

  return {
    content: `not_sent (${result.error}): the inquiry could not be delivered. Apologise briefly and give the guest the WhatsApp number and email from the house knowledge.`,
    isError: true,
    event: "inquiry_failed",
  };
}
