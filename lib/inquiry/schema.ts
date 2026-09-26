import { z } from "zod";
import { dateWindow } from "./dates";

export { MAX_DAYS_AHEAD, dateWindow } from "./dates";

/*
 * The inquiry contract shared with Shadow Check-in (docs/INQUIRY_API.md).
 * Four views of it:
 *  - inquiryPayloadSchema: exactly what is POSTed to Shadow.
 *  - inquiryFormSchema: what the booking form sends to /api/inquiry.
 *  - prepareInquiryInputSchema: what the concierge's prepare_inquiry tool accepts.
 *  - inquiryDraftSchema: the concierge's draft the guest checks and sends
 *    (the payload before consent).
 */

export const INQUIRY_SOURCES = ["website_form", "website_concierge"] as const;
export const CONTACT_METHODS = ["email", "whatsapp", "phone"] as const;

const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

/** Optional field: blank strings and missing keys become null. */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess(blankToNull, schema.nullish()).transform((value) => value ?? null);
}

const formFields = {
  name: z.string().trim().min(1, "Please tell us your name.").max(120, "Please keep your name under 120 characters."),
  email: optional(z.string().trim().pipe(z.email("Please check your email address."))),
  phone: optional(
    z.string().trim().min(5, "Please check your phone number.").max(40, "Please check your phone number."),
  ),
  preferred_contact: optional(z.enum(CONTACT_METHODS)),
  check_in: optional(z.iso.date("Please use a real date.")),
  check_out: optional(z.iso.date("Please use a real date.")),
  guests: optional(
    z
      .number("Please enter a number of guests.")
      .int("Please enter a whole number of guests.")
      .min(1, "At least one guest.")
      .max(20, "For more than 20 guests, write to us."),
  ),
  bed_preference: optional(z.string().trim().max(80, "Please keep this under 80 characters.")),
  message: z
    .string()
    .trim()
    .min(1, "Please write a short message.")
    .max(4000, "Please keep your message under 4,000 characters."),
};

const fields = {
  ...formFields,
  /** Concierge only: a short summary written by Shadow, never the raw transcript. */
  conversation_summary: optional(z.string().trim().max(4000)),
};

const isoDate = z.iso.date();

interface Checkable {
  email: string | null;
  phone: string | null;
  check_in: string | null;
  check_out: string | null;
}

function checkContactAndDates(value: Checkable, ctx: z.RefinementCtx) {
  if (!value.email && !value.phone) {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "Please give us an email address or a WhatsApp or phone number.",
    });
  }
  if (value.check_in && value.check_out && value.check_out <= value.check_in) {
    ctx.addIssue({ code: "custom", path: ["check_out"], message: "Check-out must be after check-in." });
  }
  const { earliest, latest } = dateWindow();
  for (const field of ["check_in", "check_out"] as const) {
    const date = value[field];
    // A date that doesn't exist already has its own message.
    if (!date || !isoDate.safeParse(date).success) continue;
    if (date < earliest) {
      ctx.addIssue({ code: "custom", path: [field], message: "Please choose a date from today onwards." });
    } else if (date > latest) {
      ctx.addIssue({ code: "custom", path: [field], message: "Please choose a date within the next two years." });
    }
  }
}

export const inquiryPayloadSchema = z
  .strictObject({
    client_ref: z.uuid(),
    source: z.enum(INQUIRY_SOURCES),
    ...fields,
    consent: z.literal(true),
  })
  .superRefine(checkContactAndDates);

export const inquiryFormSchema = z
  .strictObject({
    client_ref: z.uuid(),
    ...formFields,
    consent: z.literal(true, "Please agree to the privacy notice so we can reply."),
  })
  .superRefine(checkContactAndDates);

export const prepareInquiryInputSchema = z.strictObject(fields).superRefine(checkContactAndDates);

export const inquiryDraftSchema = z
  .strictObject({ client_ref: z.uuid(), source: z.literal("website_concierge"), ...fields })
  .superRefine(checkContactAndDates);

export type InquiryPayload = z.output<typeof inquiryPayloadSchema>;
export type InquiryForm = z.output<typeof inquiryFormSchema>;
export type PrepareInquiryInput = z.output<typeof prepareInquiryInputSchema>;
export type InquiryDraft = z.output<typeof inquiryDraftSchema>;
export type InquirySource = (typeof INQUIRY_SOURCES)[number];

export interface FieldIssue {
  readonly field: string;
  readonly message: string;
}

export function toFieldIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.map(String).join(".") : "form",
    message: issue.message,
  }));
}

/** The concierge's draft, keys in contract order (it is signed as JSON, so the order must never vary). */
export function buildDraft(input: PrepareInquiryInput, clientRef: string): InquiryDraft {
  return {
    client_ref: clientRef,
    source: "website_concierge",
    name: input.name,
    email: input.email,
    phone: input.phone,
    preferred_contact: input.preferred_contact,
    check_in: input.check_in,
    check_out: input.check_out,
    guests: input.guests,
    bed_preference: input.bed_preference,
    message: input.message,
    conversation_summary: input.conversation_summary,
  };
}

/** Builds the exact contract payload: every key present, optional ones null. */
export function buildPayload(
  input: Omit<InquiryPayload, "client_ref" | "source" | "consent" | "conversation_summary"> & {
    conversation_summary?: string | null;
  },
  meta: { client_ref: string; source: InquirySource },
): InquiryPayload {
  return {
    client_ref: meta.client_ref,
    source: meta.source,
    name: input.name,
    email: input.email,
    phone: input.phone,
    preferred_contact: input.preferred_contact,
    check_in: input.check_in,
    check_out: input.check_out,
    guests: input.guests,
    bed_preference: input.bed_preference,
    message: input.message,
    conversation_summary: input.conversation_summary ?? null,
    consent: true,
  };
}
