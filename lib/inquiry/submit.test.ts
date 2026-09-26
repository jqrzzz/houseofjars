import { describe, expect, it, vi } from "vitest";
import { buildPayload, inquiryFormSchema } from "./schema";
import { readShadowConfig, submitInquiry, type ShadowConfig } from "./submit";

const config: ShadowConfig = { apiUrl: "https://shadow.example", key: "sck_test" };
const payload = buildPayload(
  inquiryFormSchema.parse({
    client_ref: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    name: "Mai",
    email: "mai@example.com",
    message: "Hello",
    consent: true,
  }),
  { client_ref: "7c9e6679-7425-40de-944b-e07fc1f90ae7", source: "website_form" },
);

const reply = (status: number, body?: unknown) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

describe("submitInquiry", () => {
  it("posts the contract payload to Shadow with the bearer key", async () => {
    const fetch = reply(201, { id: "b1", status: "received" });
    const result = await submitInquiry(payload, { config, fetch, log: () => {} });

    expect(result).toEqual({ ok: true, id: "b1", duplicate: false });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://shadow.example/api/public/inquiries");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer sck_test");
    expect(JSON.parse(String(init?.body))).toEqual(payload);
  });

  it("treats 200 as an inquiry Shadow already had", async () => {
    const result = await submitInquiry(payload, { config, fetch: reply(200, { id: "b1", status: "received" }) });
    expect(result).toEqual({ ok: true, id: "b1", duplicate: true });
  });

  it.each([
    [400, "invalid_request"],
    [413, "invalid_request"],
    [429, "busy"],
    [503, "not_configured"],
    [401, "unavailable"],
    [500, "unavailable"],
  ] as const)("maps HTTP %i to %s", async (status, error) => {
    const result = await submitInquiry(payload, { config, fetch: reply(status, { error: "x" }), log: () => {} });
    expect(result).toEqual({ ok: false, error });
  });

  it("reports an unexpected success body as unavailable", async () => {
    const log = vi.fn();
    const result = await submitInquiry(payload, { config, fetch: reply(201, { ok: true }), log });
    expect(result).toEqual({ ok: false, error: "unavailable" });
    expect(log).toHaveBeenCalled();
  });

  it("survives network failures", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError("fetch failed"));
    const result = await submitInquiry(payload, { config, fetch, log: () => {} });
    expect(result).toEqual({ ok: false, error: "unavailable" });
  });

  it("never calls Shadow with an invalid payload or without configuration", async () => {
    const fetch = reply(201, { id: "b1", status: "received" });
    const invalid = await submitInquiry({ ...payload, consent: false }, { config, fetch });
    expect(invalid.ok).toBe(false);
    expect(invalid.ok ? null : invalid.error).toBe("invalid_request");

    expect(await submitInquiry(payload, { config: null, fetch })).toEqual({ ok: false, error: "not_configured" });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("readShadowConfig", () => {
  it("needs both the URL and the key, and drops trailing slashes", () => {
    expect(readShadowConfig({ SHADOW_API_URL: "https://shadow.example/", SHADOW_INQUIRY_KEY: " sck_x " })).toEqual({
      apiUrl: "https://shadow.example",
      key: "sck_x",
    });
    expect(readShadowConfig({ SHADOW_API_URL: "https://shadow.example" })).toBeNull();
    expect(readShadowConfig({ SHADOW_INQUIRY_KEY: "sck_x" })).toBeNull();
  });
});
