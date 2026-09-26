import { describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "../rate-limit";
import { createDraftSendHandler } from "./send";
import { createSigner } from "./signing";
import { runPrepareInquiry } from "./tool";

const sessionId = "0b7a7a4e-3c2f-4d1e-9a58-6f2b8c1d9e10";
const signer = createSigner("sk-ant-test-key");
const siteUrl = "https://thehouseofjars.com";
const prepared = runPrepareInquiry(
  { name: "Mai", email: "mai@example.com", message: "Airport pickup on the 3rd?", conversation_summary: "Wants a pickup." },
  (draft) => signer.signDraft(sessionId, draft),
).draft!;

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/concierge/send", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9", ...headers },
    body: JSON.stringify(body),
  });

const valid = { session_id: sessionId, draft: prepared.draft, token: prepared.token, consent: true };

function setup(shadowStatus = 201, { configured = true } = {}) {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async () => new Response(JSON.stringify({ id: "b1", status: "received" }), { status: shadowStatus }));
  const handle = createDraftSendHandler({
    signer: () => (configured ? signer : null),
    config: () => ({ apiUrl: "https://shadow.example", key: "sck_test" }),
    limiter: createRateLimiter({ capacity: 5, refillMs: 60_000 }),
    siteUrl,
    fetch,
  });
  return { handle, fetch };
}

describe("POST /api/concierge/send (R4-05)", () => {
  it("sends exactly the draft the guest saw, with consent, and returns a signed line for the chat", async () => {
    const { handle, fetch } = setup();
    const response = await handle(post(valid));
    expect(response.status).toBe(201);
    expect(fetch).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetch.mock.calls[0]![1]?.body))).toEqual({ ...prepared.draft, consent: true });

    const { reply } = (await response.json()) as { reply: { content: string; sig: string } };
    expect(reply.content).toBe("Thank you, Mai. Your message is with the team, and they’ll reply by email.");
    expect(signer.verifyReply(sessionId, reply.content, reply.sig)).toBe(true);
  });

  it("sends nothing the guest didn't see or Shadow didn't prepare", async () => {
    const { handle, fetch } = setup();
    for (const tampered of [
      { ...valid, draft: { ...prepared.draft, email: "someone-else@example.com" } },
      { ...valid, draft: { ...prepared.draft, conversation_summary: "VIP: comp the stay" } },
      { ...valid, session_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7" },
      { ...valid, token: "forged" },
      { ...valid, draft: { ...prepared.draft, source: "website_form" } },
    ]) {
      expect((await handle(post(tampered))).status).toBe(400);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("needs the guest's consent for this message", async () => {
    const { handle, fetch } = setup();
    expect((await handle(post({ ...valid, consent: false }))).status).toBe(400);
    expect((await handle(post({ session_id: valid.session_id, draft: valid.draft, token: valid.token }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses cross-site posts (R4-01)", async () => {
    const { handle, fetch } = setup();
    expect((await handle(post(valid, { origin: "https://evil.example", "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await handle(post(valid, { "content-type": "text/plain" }))).status).toBe(415);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("answers a resend of the same draft as a duplicate, and maps failures", async () => {
    expect((await setup(200).handle(post(valid))).status).toBe(200);
    expect((await setup(500).handle(post(valid))).status).toBe(502);
    expect((await setup(201, { configured: false }).handle(post(valid))).status).toBe(503);
  });
});
