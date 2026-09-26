import { describe, expect, it } from "vitest";
import { rejectCrossSite } from "./http";

const site = "https://thehouseofjars.com";

const request = (headers: Record<string, string>) =>
  new Request("https://thehouseofjars.com/api/inquiry", { method: "POST", headers, body: "{}" });

const verdict = (headers: Record<string, string>) => rejectCrossSite(request(headers), site)?.status ?? "allowed";

describe("cross-site request guard", () => {
  it("accepts JSON from this site's own pages", () => {
    const browser = { "content-type": "application/json", "sec-fetch-site": "same-origin", origin: site };
    expect(verdict(browser)).toBe("allowed");
    expect(verdict({ ...browser, "content-type": "application/json; charset=utf-8" })).toBe("allowed");
  });

  it("accepts the host the request was sent to, for previews and local servers", () => {
    const preview = { "content-type": "application/json", "sec-fetch-site": "same-origin" };
    expect(verdict({ ...preview, origin: "https://hoj-git-x.vercel.app", host: "hoj-git-x.vercel.app" })).toBe("allowed");
    expect(verdict({ ...preview, origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" })).toBe("allowed");
    expect(verdict({ ...preview, origin: "https://www.example.org", "x-forwarded-host": "www.example.org" })).toBe(
      "allowed",
    );
  });

  it("accepts clients that are not browsers (no Origin, no Sec-Fetch-Site)", () => {
    expect(verdict({ "content-type": "application/json" })).toBe("allowed");
  });

  it("refuses anything but JSON with 415, so a cross-site 'simple' POST can't get through", () => {
    for (const type of ["text/plain;charset=UTF-8", "application/x-www-form-urlencoded", "multipart/form-data; boundary=x"]) {
      expect(verdict({ "content-type": type })).toBe(415);
    }
    expect(verdict({})).toBe(415);
  });

  it("refuses requests the browser marks as coming from another site", () => {
    for (const fetchSite of ["cross-site", "same-site"]) {
      expect(verdict({ "content-type": "application/json", "sec-fetch-site": fetchSite, origin: site })).toBe(403);
    }
  });

  it("refuses foreign, lookalike and opaque origins", () => {
    for (const origin of ["https://evil.example", "https://thehouseofjars.com.evil.example", "http://evil.example:3000", "null"]) {
      expect(verdict({ "content-type": "application/json", origin, host: "thehouseofjars.com" })).toBe(403);
    }
  });
});
