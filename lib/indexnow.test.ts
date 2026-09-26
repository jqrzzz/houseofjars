import { describe, expect, it } from "vitest";
import { GET } from "@/app/indexnow-key.txt/route";
import { buildSubmission, describeResponse, indexNowKey, keyIsLive, submit } from "./indexnow";

const key = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const site = "https://thehouseofjars.com";

describe("the IndexNow key", () => {
  it("is used only when it is 8 to 128 letters, digits or dashes", () => {
    expect(indexNowKey(` ${key} `)).toBe(key);
    expect(indexNowKey(undefined)).toBeNull();
    expect(indexNowKey("short")).toBeNull();
    expect(indexNowKey("has spaces in it")).toBeNull();
    expect(indexNowKey("x".repeat(129))).toBeNull();
    expect(indexNowKey("../../etc/passwd")).toBeNull();
  });

  it("is served at /indexnow-key.txt once set, and is a 404 until then", async () => {
    const original = process.env.INDEXNOW_KEY;
    try {
      delete process.env.INDEXNOW_KEY;
      expect(GET().status).toBe(404);
      process.env.INDEXNOW_KEY = key;
      const response = GET();
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
      expect(await response.text()).toBe(key);
    } finally {
      if (original === undefined) delete process.env.INDEXNOW_KEY;
      else process.env.INDEXNOW_KEY = original;
    }
  });
});

describe("an IndexNow submission", () => {
  it("names the host, the key and where the key lives, and lists each URL once", () => {
    expect(buildSubmission(site, key, [`${site}/`, `${site}/faq`, `${site}/faq`])).toEqual({
      host: "thehouseofjars.com",
      key,
      keyLocation: `${site}/indexnow-key.txt`,
      urlList: [`${site}/`, `${site}/faq`],
    });
  });

  it("refuses URLs on another host, and an empty list", () => {
    expect(() => buildSubmission(site, key, ["https://example.org/"])).toThrow(/not on thehouseofjars.com/);
    expect(() => buildSubmission(site, key, [])).toThrow(RangeError);
  });

  it("is sent only after the live site shows the same key", async () => {
    const submission = buildSubmission(site, key, [`${site}/`]);
    const serving = (body: string, status = 200) => async () => new Response(body, { status });
    expect(await keyIsLive(submission, serving(`${key}\n`))).toBe(true);
    expect(await keyIsLive(submission, serving("another-key-123"))).toBe(false);
    expect(await keyIsLive(submission, serving("Not found", 404))).toBe(false);
    expect(
      await keyIsLive(submission, async () => {
        throw new TypeError("fetch failed");
      }),
    ).toBe(false);
  });

  it("posts the JSON to the endpoint and explains the answer", async () => {
    const submission = buildSubmission(site, key, [`${site}/`, `${site}/guides`]);
    const sent: { url: string; init?: RequestInit }[] = [];
    const result = await submit(submission, {
      endpoint: "http://127.0.0.1:9/indexnow",
      fetcher: async (url, init) => {
        sent.push({ url, init });
        return new Response(null, { status: 202 });
      },
    });
    expect(result).toEqual({ status: 202, ok: true, message: "Received; the key is still being checked." });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.url).toBe("http://127.0.0.1:9/indexnow");
    expect(sent[0]!.init?.method).toBe("POST");
    expect(JSON.parse(String(sent[0]!.init?.body))).toEqual(submission);
  });

  it("knows each of IndexNow's answers", () => {
    expect(describeResponse(200).ok).toBe(true);
    for (const status of [400, 403, 422, 429, 500]) expect(describeResponse(status).ok).toBe(false);
    expect(describeResponse(403).message).toMatch(/key/);
  });
});
