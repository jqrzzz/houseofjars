import { describe, expect, it } from "vitest";
import { siteVerification, verificationToken } from "./verification";

describe("search engine verification", () => {
  it("adds nothing until a token is set", () => {
    expect(siteVerification({})).toBeUndefined();
    expect(siteVerification({ GOOGLE_SITE_VERIFICATION: "  ", BING_SITE_VERIFICATION: "" })).toBeUndefined();
  });

  it("adds Google's and Bing's tags from their variables", () => {
    expect(
      siteVerification({
        GOOGLE_SITE_VERIFICATION: "aBc123-_xYz987aBc123-_xYz987aBc123-_xYz98",
        BING_SITE_VERIFICATION: "0123456789ABCDEF0123456789ABCDEF",
      }),
    ).toEqual({
      google: "aBc123-_xYz987aBc123-_xYz987aBc123-_xYz98",
      other: { "msvalidate.01": "0123456789ABCDEF0123456789ABCDEF" },
    });
    expect(siteVerification({ BING_SITE_VERIFICATION: "0123456789ABCDEF0123456789ABCDEF" })).toEqual({
      other: { "msvalidate.01": "0123456789ABCDEF0123456789ABCDEF" },
    });
  });

  it("takes the token out of a pasted meta tag", () => {
    expect(verificationToken('<meta name="google-site-verification" content="abcDEF123_-456789" />')).toBe(
      "abcDEF123_-456789",
    );
    expect(verificationToken("<meta name='msvalidate.01' content='0123456789ABCDEF' />")).toBe("0123456789ABCDEF");
  });

  it("ignores anything that isn't a token, so it can never break the page's head", () => {
    expect(verificationToken('abc" onload="alert(1)')).toBeNull();
    expect(verificationToken("short")).toBeNull();
    expect(verificationToken("has spaces in it")).toBeNull();
  });
});
