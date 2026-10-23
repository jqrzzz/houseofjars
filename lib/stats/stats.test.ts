import { describe, expect, it } from "vitest";
import { onlineBookingConfigured } from "../booking/config";
import { createRateLimiter } from "../rate-limit";
import { createPageViewHandler } from "./handler";
import { chatLines, pageViewLines, type CountLine } from "./lines";
import { sendCounts, statsConfig } from "./send";
import { hostSource, labelSource, visitSource } from "./sources";
import { asksNotToBeCounted, countryOf, deviceOf, isRobot, pageKey } from "./visitor";

const siteUrl = "https://www.houseofjars.la";
const own = ["www.houseofjars.la"];

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID_PHONE = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const ANDROID_TABLET = "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

describe("where a visit came from", () => {
  it("names search engines, AI assistants, booking sites and social media by their hosts", () => {
    const cases: [string, string][] = [
      ["www.google.com", "google"],
      ["www.google.co.th", "google"],
      ["google.com.au", "google"],
      ["gemini.google.com", "gemini"],
      ["chatgpt.com", "chatgpt"],
      ["chat.openai.com", "chatgpt"],
      ["www.perplexity.ai", "perplexity"],
      ["copilot.microsoft.com", "copilot"],
      ["edgeservices.bing.com", "copilot"],
      ["www.bing.com", "bing"],
      ["claude.ai", "claude"],
      ["chat.deepseek.com", "deepseek"],
      ["grok.com", "grok"],
      ["duckduckgo.com", "duckduckgo"],
      ["search.brave.com", "brave"],
      ["www.booking.com", "booking"],
      ["www.agoda.com", "agoda"],
      ["www.hostelworld.com", "hostelworld"],
      ["www.tripadvisor.co.uk", "tripadvisor"],
      ["l.facebook.com", "facebook"],
      ["m.facebook.com", "facebook"],
      ["l.instagram.com", "instagram"],
      ["t.co", "x"],
      ["x.com", "x"],
      ["www.reddit.com", "reddit"],
      ["web.telegram.org", "telegram"],
      ["www.lonelyplanet.com", "lonelyplanet.com"],
      ["mail.google.com", "mail.google.com"],
      ["WWW.Example.ORG.", "example.org"],
    ];
    for (const [host, source] of cases) expect([host, hostSource(host)]).toEqual([host, source]);
  });

  it("reads a link's own label first: ChatGPT's utm_source, or the house's own", () => {
    expect(labelSource("chatgpt.com")).toBe("chatgpt");
    expect(labelSource("perplexity")).toBe("perplexity");
    expect(labelSource("fb")).toBe("facebook");
    expect(labelSource("QR Menu")).toBe("qr-menu");
    expect(labelSource("<script>")).toBe("script");
    expect(labelSource("   ")).toBeNull();
    expect(labelSource(null)).toBeNull();
    expect(visitSource("https://www.google.com/", "chatgpt.com", own)).toBe("chatgpt");
  });

  it("is direct with no address, from an app that sends none, or from a mail app", () => {
    expect(visitSource(null, null, own)).toBe("direct");
    expect(visitSource("", undefined, own)).toBe("direct");
    expect(visitSource("not a url", null, own)).toBe("direct");
    expect(visitSource("android-app://com.google.android.gm/", null, own)).toBe("direct");
    expect(visitSource("android-app://com.google.android.googlequicksearchbox/", null, own)).toBe("google");
    expect(visitSource("android-app://com.facebook.katana/", null, own)).toBe("facebook");
  });

  it("is no new visit from the site's own pages, with or without www", () => {
    expect(visitSource("https://www.houseofjars.la/menu", null, own)).toBeNull();
    expect(visitSource("https://houseofjars.la/", "chatgpt.com", own)).toBeNull();
    expect(visitSource("http://localhost:3000/", null, ["localhost:3000"])).toBeNull();
    expect(visitSource("http://localhost:3000/", null, ["localhost"])).toBeNull();
    expect(visitSource("http://localhost:4000/", null, ["localhost:3000"])).toBe("localhost");
  });

  it("never keeps the address itself or what was searched for", () => {
    expect(visitSource("https://www.google.com/search?q=quiet+hostel+vientiane", null, own)).toBe("google");
    expect(visitSource("https://someones-blog.example/trip-to-laos?ref=me", null, own)).toBe("someones-blog.example");
  });
});

describe("the visitor, as the request shows it", () => {
  it("tells robots and scripts from browsers", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0 Safari/537.36",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "curl/8.5.0",
      "python-requests/2.32",
    ]) {
      expect([ua, isRobot(ua)]).toEqual([ua, true]);
    }
    expect(isRobot(null)).toBe(true);
    for (const ua of [IPHONE, ANDROID_PHONE, ANDROID_TABLET, IPAD, MAC]) expect(isRobot(ua)).toBe(false);
  });

  it("names the kind of device", () => {
    expect(deviceOf(IPHONE)).toBe("phone");
    expect(deviceOf(ANDROID_PHONE)).toBe("phone");
    expect(deviceOf(ANDROID_TABLET)).toBe("tablet");
    expect(deviceOf(IPAD)).toBe("tablet");
    expect(deviceOf(MAC)).toBe("computer");
  });

  it("reads the country Vercel gives, and the browser's wish not to be counted", () => {
    expect(countryOf(new Headers({ "x-vercel-ip-country": "TH" }))).toBe("th");
    expect(countryOf(new Headers({ "x-vercel-ip-country": "T1" }))).toBeNull();
    expect(countryOf(new Headers())).toBeNull();
    expect(asksNotToBeCounted(new Headers({ dnt: "1" }))).toBe(true);
    expect(asksNotToBeCounted(new Headers({ "sec-gpc": "1" }))).toBe(true);
    expect(asksNotToBeCounted(new Headers({ dnt: "0" }))).toBe(false);
  });

  it("names a page by its path, or other", () => {
    const pages = new Set(["/", "/menu", "/guides/whats-nearby"]);
    expect(pageKey("/", pages)).toBe("/");
    expect(pageKey("/menu/", pages)).toBe("/menu");
    expect(pageKey("/guides/whats-nearby?utm_source=qr#map", pages)).toBe("/guides/whats-nearby");
    expect(pageKey("/wp-admin", pages)).toBe("other");
    expect(pageKey("/Menu", pages)).toBe("other");
  });
});

describe("the lines Shadow counts", () => {
  it("are a page seen, and with the first page of a visit its source, country and device", () => {
    expect(pageViewLines("/menu", null)).toEqual([{ measure: "view" }, { measure: "page", value: "/menu" }]);
    expect(pageViewLines("/", { source: "chatgpt", country: "th", device: "phone" })).toEqual([
      { measure: "view" },
      { measure: "page", value: "/" },
      { measure: "visit" },
      { measure: "source", value: "chatgpt" },
      { measure: "country", value: "th" },
      { measure: "device", value: "phone" },
    ]);
    expect(pageViewLines("/", { source: "direct", country: null, device: "computer" }).map((l) => l.measure)).toEqual([
      "view",
      "page",
      "visit",
      "source",
      "device",
    ]);
  });

  it("add up a talk with Shadow, one line a measure", () => {
    expect(chatLines(["chat", "question", "check", "check"])).toEqual([
      { measure: "chat" },
      { measure: "question" },
      { measure: "check", n: 2 },
    ]);
    expect(chatLines([])).toEqual([]);
  });
});

describe("POST /api/page-view", () => {
  function setup(capacity = 10) {
    const counted: (readonly CountLine[])[] = [];
    const handle = createPageViewHandler({
      siteUrl,
      pages: new Set(["/", "/menu", "/book"]),
      limiter: createRateLimiter({ capacity, refillMs: 60_000 }),
      count: (lines) => counted.push(lines),
    });
    return { handle, counted };
  }
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    new Request(`${siteUrl}/api/page-view`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
        "user-agent": IPHONE,
        "x-forwarded-for": "203.0.113.9",
        "x-vercel-ip-country": "FR",
        host: "www.houseofjars.la",
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });

  it("counts the first page of a visit from Google: 204", async () => {
    const { handle, counted } = setup();
    const response = await handle(post({ path: "/menu", landing: true, referrer: "https://www.google.com/", utm_source: null }));
    expect(response.status).toBe(204);
    expect(counted).toEqual([pageViewLines("/menu", { source: "google", country: "fr", device: "phone" })]);
  });

  it("counts a later page as a page seen only, and a page from the site's own pages too", async () => {
    const { handle, counted } = setup();
    await handle(post({ path: "/book" }));
    await handle(post({ path: "/", landing: true, referrer: "https://www.houseofjars.la/menu" }));
    expect(counted).toEqual([pageViewLines("/book", null), pageViewLines("/", null)]);
  });

  it("counts a mistyped address as other", async () => {
    const { handle, counted } = setup();
    await handle(post({ path: "/wp-login.php", landing: true, referrer: null }));
    expect(counted[0]).toEqual(pageViewLines("other", { source: "direct", country: "fr", device: "phone" }));
  });

  it("does not count robots, or browsers that ask not to be followed", async () => {
    const { handle, counted } = setup();
    expect((await handle(post({ path: "/" }, { "user-agent": "Mozilla/5.0 (compatible; GPTBot/1.2)" }))).status).toBe(204);
    expect((await handle(post({ path: "/" }, { "sec-gpc": "1" }))).status).toBe(204);
    expect((await handle(post({ path: "/" }, { dnt: "1" }))).status).toBe(204);
    expect(counted).toEqual([]);
  });

  it("refuses other websites' pages, and anything that is not a page view", async () => {
    const { handle, counted } = setup();
    expect((await handle(post({ path: "/" }, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await handle(post({ path: "/" }, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await handle(post("{nope"))).status).toBe(400);
    expect((await handle(post({ path: "/", who: "mai" }))).status).toBe(400);
    expect((await handle(post({ path: "/", referrer: "x".repeat(4000) }))).status).toBe(413);
    expect(counted).toEqual([]);
  });

  it("limits each client", async () => {
    const { handle, counted } = setup(2);
    const statuses = [];
    for (let i = 0; i < 3; i++) statuses.push((await handle(post({ path: "/" }))).status);
    expect(statuses).toEqual([204, 204, 429]);
    expect(counted).toHaveLength(2);
  });
});

describe("sending the counts to Shadow", () => {
  const config = { apiUrl: "https://shadow.example", key: "sck_test" };

  it("posts the lines with the website's key", async () => {
    const sent: { url: string; init: RequestInit }[] = [];
    const fetch = async (url: string | URL | Request, init?: RequestInit) => {
      sent.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({ status: "counted" }), { status: 200 });
    };
    await sendCounts([{ measure: "view" }], { config, fetch: fetch as typeof globalThis.fetch });
    expect(sent[0]!.url).toBe("https://shadow.example/api/public/site-counts");
    expect(sent[0]!.init.method).toBe("POST");
    expect(new Headers(sent[0]!.init.headers).get("authorization")).toBe("Bearer sck_test");
    expect(JSON.parse(String(sent[0]!.init.body))).toEqual({ counts: [{ measure: "view" }] });
  });

  it("sends nothing without Shadow or without lines, and never throws", async () => {
    let calls = 0;
    const fetch = (async () => {
      calls++;
      throw new TypeError("network down");
    }) as typeof globalThis.fetch;
    await sendCounts([{ measure: "view" }], { config: null, fetch });
    await sendCounts([], { config, fetch });
    expect(calls).toBe(0);
    const logged: string[] = [];
    await sendCounts([{ measure: "view" }], { config, fetch, log: (m) => logged.push(m) });
    expect(logged).toEqual(["[stats] the site's counts did not reach Shadow: TypeError"]);
  });

  it("logs a refusal, but not Shadow waiting for its database update or a full day", async () => {
    const logged: string[] = [];
    for (const status of [503, 429, 401]) {
      const fetch = (async () => new Response("{}", { status })) as typeof globalThis.fetch;
      await sendCounts([{ measure: "view" }], { config, fetch, log: (m) => logged.push(m) });
    }
    expect(logged).toEqual(["[stats] Shadow answered 401 to the site's counts"]);
  });

  it("counts in production and off Vercel, never on a preview, and not when switched off", () => {
    const shadow = { SHADOW_API_URL: "https://shadow.example/", SHADOW_INQUIRY_KEY: "sck_test" };
    expect(statsConfig({ ...shadow, VERCEL_ENV: "production" })).toEqual(config);
    expect(statsConfig(shadow)).toEqual(config);
    expect(statsConfig({ ...shadow, VERCEL_ENV: "preview" })).toBeNull();
    expect(statsConfig({ ...shadow, VERCEL_ENV: "production", SITE_STATS: "off" })).toBeNull();
    expect(statsConfig({ VERCEL_ENV: "production" })).toBeNull();
  });

  it("can count with a key of its own, while online booking stays off", () => {
    const statsOnly = { SHADOW_API_URL: "https://shadow.example", SHADOW_STATS_KEY: "sck_stats", VERCEL_ENV: "production" };
    expect(statsConfig(statsOnly)).toEqual({ apiUrl: "https://shadow.example", key: "sck_stats" });
    expect(onlineBookingConfigured(statsOnly)).toBe(false);
    expect(statsConfig({ ...statsOnly, SHADOW_INQUIRY_KEY: "sck_inquiries" })?.key).toBe("sck_stats");
    expect(statsConfig({ SHADOW_STATS_KEY: "sck_stats" })).toBeNull();
  });
});
