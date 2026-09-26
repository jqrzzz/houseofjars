import { describe, expect, it } from "vitest";
import { inquiryDraftSchema } from "../inquiry/schema";
import { createSigner } from "./signing";
import { prepareInquiryTool, runPrepareInquiry } from "./tool";

const sessionId = "0b7a7a4e-3c2f-4d1e-9a58-6f2b8c1d9e10";
const reference = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const input = {
  name: "Mai",
  email: "mai@example.com",
  phone: null,
  preferred_contact: "email",
  check_in: "2026-10-03",
  check_out: "2026-10-05",
  guests: 1,
  bed_preference: null,
  message: "Is there a bed from the 3rd to the 5th?",
  conversation_summary: "Asks about a bed for two nights from 3 October.",
};
const signer = createSigner("sk-ant-test-key");
const sign = (draft: Parameters<typeof signer.signDraft>[1]) => signer.signDraft(sessionId, draft);

describe("prepare_inquiry tool definition", () => {
  it("mirrors the contract minus what the server sets", () => {
    const properties = Object.keys((prepareInquiryTool.input_schema as { properties: object }).properties);
    expect(properties).toEqual([
      "name",
      "email",
      "phone",
      "preferred_contact",
      "check_in",
      "check_out",
      "guests",
      "bed_preference",
      "message",
      "conversation_summary",
    ]);
    expect(prepareInquiryTool.eager_input_streaming).toBe(true);
    expect(prepareInquiryTool.description).toContain("This sends nothing");
  });
});

describe("prepare_inquiry (R4-05)", () => {
  it("turns the details into a signed draft for the guest to check, and sends nothing", () => {
    const outcome = runPrepareInquiry(input, sign, () => reference);
    expect(outcome.isError).toBe(false);
    expect(outcome.content).toMatch(/^draft_ready: .*Nothing has been sent/);
    expect(outcome.draft!.draft).toEqual({ ...input, client_ref: reference, source: "website_concierge" });
    expect(inquiryDraftSchema.safeParse(outcome.draft!.draft).success).toBe(true);
    expect(signer.verifyDraft(sessionId, outcome.draft!.draft, outcome.draft!.token)).toBe(true);
  });

  it("gives every draft its own reference, so a corrected one is a new inquiry", () => {
    const first = runPrepareInquiry(input, sign).draft!.draft.client_ref;
    const second = runPrepareInquiry({ ...input, email: "mai@example.org" }, sign).draft!.draft.client_ref;
    expect(first).not.toBe(second);
  });

  it("rejects invalid input, and any attempt to set the reference, source or consent", () => {
    for (const bad of [{ ...input, email: null, phone: null }, { ...input, consent: true }, { ...input, source: "website_form" }]) {
      const outcome = runPrepareInquiry(bad, sign);
      expect(outcome).toMatchObject({ isError: true, draft: null });
      expect(outcome.content).toContain("invalid_input");
    }
  });
});
