import { describe, expect, it, vi } from "vitest";
import { createInquiryGate, PER_CLIENT, PER_INSTANCE } from "./gate";
import { createInquiryHandler } from "./handler";

const config = { apiUrl: "https://shadow.example", key: "sck_test" };
const siteUrl = "https://thehouseofjars.com";
const form = {
  client_ref: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  name: "Mai",
  phone: "+856 20 1234 5678",
  message: "Can you pick me up from the airport?",
  consent: true,
};

const post = (body: unknown, headers: HeadersInit = {}) =>
  new Request("http://localhost/api/inquiry", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

function setup(shadowStatus = 201) {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async () => new Response(JSON.stringify({ id: "b1", status: "received" }), { status: shadowStatus }));
  const handle = createInquiryHandler({ config: () => config, gate: createInquiryGate(() => 0), fetch, siteUrl });
  return { handle, fetch };
}

describe("POST /api/inquiry", () => {
  it("answers 503 when Shadow is not configured", async () => {
    const handle = createInquiryHandler({ config: () => null, gate: createInquiryGate(), siteUrl });
    const response = await handle(post(form));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "not_configured" });
  });

  it("forwards a valid inquiry as website_form", async () => {
    const { handle, fetch } = setup();
    const response = await handle(post(form));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ status: "received", id: "b1" });
    const sent = JSON.parse(String(fetch.mock.calls[0]![1]?.body));
    expect(sent).toMatchObject({ client_ref: form.client_ref, source: "website_form", consent: true, email: null });
  });

  it("passes Shadow's duplicate answer through as 200", async () => {
    const { handle } = setup(200);
    expect((await handle(post(form))).status).toBe(200);
  });

  it("returns field issues without contacting Shadow", async () => {
    const { handle, fetch } = setup();
    const response = await handle(post({ ...form, name: "", phone: null }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid_request");
    expect(body.issues.map((issue: { field: string }) => issue.field).sort()).toEqual(["email", "name"]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects bodies that are not JSON or too large", async () => {
    const { handle } = setup();
    expect((await handle(post("{not json"))).status).toBe(400);
    expect((await handle(post({ ...form, message: "x".repeat(17_000) }))).status).toBe(413);
  });

  it("rate-limits valid inquiries per client, but never invalid ones", async () => {
    const { handle } = setup();
    for (let i = 0; i < 5; i++) expect((await handle(post({ ...form, name: "" }))).status).toBe(400);
    for (let i = 0; i < PER_CLIENT.capacity; i++) expect((await handle(post(form))).status).toBe(201);
    const limited = await handle(post(form));
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "rate_limited" });
    expect(limited.headers.get("retry-after")).toBe(String(PER_CLIENT.refillMs / 1000));
    expect((await handle(post(form, { "x-forwarded-for": "198.51.100.4" }))).status).toBe(201);
  });

  it("tells guests the line is busy, not that they sent too much, when everyone together hits the limit (R4-02)", async () => {
    const { handle } = setup();
    for (let i = 0; i < PER_INSTANCE.capacity; i++) {
      expect((await handle(post(form, { "x-forwarded-for": `198.51.100.${i + 1}` }))).status).toBe(201);
    }
    const busy = await handle(post(form, { "x-forwarded-for": "203.0.113.200" }));
    expect(busy.status).toBe(503);
    expect(await busy.json()).toEqual({ error: "busy" });
  });

  it("reports Shadow's own hourly limit as busy (R4-02)", async () => {
    const { handle } = setup(429);
    const response = await handle(post(form));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "busy" });
  });

  it("refuses cross-site and non-JSON posts before anything reaches Shadow (R4-01)", async () => {
    const { handle, fetch } = setup();
    const crossSite = await handle(
      post(form, { origin: "https://evil.example", "sec-fetch-site": "cross-site" }),
    );
    expect(crossSite.status).toBe(403);
    expect(await crossSite.json()).toEqual({ error: "forbidden" });
    // What a page on another site can send without a preflight: text/plain, consent included.
    const simple = await handle(post(form, { "content-type": "text/plain;charset=UTF-8" }));
    expect(simple.status).toBe(415);
    expect(fetch).not.toHaveBeenCalled();
    // The site's own page still gets through.
    expect((await handle(post(form, { origin: siteUrl, "sec-fetch-site": "same-origin" }))).status).toBe(201);
  });

  it("maps Shadow being down to 502", async () => {
    const { handle } = setup(500);
    const response = await handle(post(form));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "unavailable" });
  });
});
