/**
 * Smoke test against a running production build:
 *
 *   npm run build && npm run start -- -p 3000     # in one terminal
 *   BASE_URL=http://localhost:3000 npm run smoke  # in another
 *
 * To walk the booking form too, build and start the site against a stand-in
 * for Shadow Check-in that this test runs itself (test/fake-shadow.ts):
 *
 *   export SHADOW_API_URL=http://127.0.0.1:4010 SHADOW_INQUIRY_KEY=sck_fakeShadowCheckinKeyForLocalTestsOnly000000
 *   npm run build && npm run start -- -p 3000
 *   BASE_URL=http://localhost:3000 FAKE_SHADOW_PORT=4010 npm run smoke
 *
 * Visits every page, guides included, on a phone (390 x 844) and a desktop
 * (1440 x 900), in light and dark, and checks the HTTP status, console
 * errors, exactly one h1, the title, canonical and Open Graph tags,
 * sideways scrolling, and the page's JSON-LD: one graph, valid against the
 * schema.org types the site uses (test/schema-org.ts), describing this page,
 * and stating no fact that isn't firm (content/certainty.ts). Also the
 * sitemap, robots.txt, llms.txt, llms-full.txt, the logo and the IndexNow key
 * file, the security headers, and that the API routes refuse cross-site
 * posts. Then it opens Shadow's window, checks that a /book link fills in the
 * dates and guests, and tries the booking form. Without API keys Shadow must
 * fall back to the team's contact details, and /book must offer booking
 * direct (the stay written out for WhatsApp and email), those contact
 * details and the booking sites, and no form that could never send. Against the fake Shadow
 * Check-in it walks online booking on a phone and a desktop (dates by
 * keyboard, beds, details, review, confirmation), then beds taken while
 * booking (409), a price that changes while booking (409 price_changed, then
 * the guest agrees to the new total), a request Shadow takes without holding
 * its beds, booking closed (503) and a busy line (429), and sends the message
 * form. In both, a dated /book link followed without a reload (as Next.js
 * follows the links in Shadow's replies), from another page and from /book
 * itself, must fill in the forms. With online booking, Shadow's free-beds
 * card is checked too, from a canned reply (this test doesn't fake Claude):
 * its stay, its rooms, and Book these dates opening /book at those dates.
 * Against a real Shadow Check-in nothing is sent (no test bookings or
 * inquiries reach the team). Screenshots are saved to ./screenshots.
 *
 * It also takes the acceptance evidence of docs/DESIGN.md §1, so a reviewer
 * can check the screenshots against it: the home page's HTML and script
 * budgets; the hero's first screen at 390 x 844, 1440 x 900 and a laptop's
 * 1366 x 768 (hero-*.png); the house story's shots, placed by its own cues,
 * from the street front to the curtain closed at the very end, which must
 * match the rest frame (theatre-*.png); every page with Motion: Still, with
 * no splash and nothing animating (still-*.png); and every page with the
 * site's theme chosen against the device's (light-on-dark-*.png,
 * dark-on-light-*.png).
 *
 * Start the site afresh for each run against the fake: the site's own limits
 * (per server instance, 10 booking requests at once, then one every 6
 * minutes) would still count the last run's bookings.
 *
 * Uses the Chromium at CHROMIUM_PATH (default /opt/pw-browsers/chromium)
 * and never downloads a browser.
 */
import { mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright-core";
import sharp from "sharp";
import { content } from "../content";
import { isFirm } from "../content/certainty";
import { photos } from "../content/photos";
import { policies } from "../content/stay";
import { formatMoney } from "../lib/booking/flow";
import { encodeEvent, type AvailabilityCard, type ConciergeEvent } from "../lib/concierge/protocol";
import { addDays, formatDay, houseToday, nightsBetween } from "../lib/dates";
import { dateWindow } from "../lib/inquiry/dates";
import { collectFacts, factsMentionedIn } from "../lib/content-audit";
import { MOTION_KEY } from "../lib/motion/prefs";
import { metaTitle, sitePages } from "../lib/pages";
import { siteUrl } from "../lib/site";
import { SPLASH_KEY, THEME_KEY, themeColor } from "../lib/theme";
import { FAKE_ROOMS, FAKE_SHADOW_KEY, startFakeShadow, type FakeRoom, type FakeShadow } from "../test/fake-shadow";
import { typesOf, isA, validateJsonLd } from "../test/schema-org";

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const executablePath = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const outDir = "screenshots";
const fakeShadowPort = process.env.FAKE_SHADOW_PORT ? Number(process.env.FAKE_SHADOW_PORT) : null;

interface Viewport {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}
const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const satisfies readonly Viewport[];
/** A common laptop screen, shorter than the desktop's: the hero's first screen must hold there too. */
const laptop: Viewport = { name: "laptop", width: 1366, height: 768 };
const schemes = ["light", "dark"] as const;
type Scheme = (typeof schemes)[number];

/** Acceptance budgets (docs/DESIGN.md §1.6), in bytes: the home page's HTML as served, and its scripts gzipped. */
const HOME_HTML_BUDGET = 150_000;
const HOME_JS_BUDGET = 200_000;

/** Every page as the running build names it: /book is named for online booking when the build has it. */
function routesFor(online: boolean) {
  return [
    ...sitePages(online).map((page) => ({
      name: page.path === "/" ? "home" : page.path.slice(1).replaceAll("/", "-"),
      path: page.path,
      title: metaTitle(page),
      status: 200,
    })),
    { name: "not-found", path: "/this-page-does-not-exist", title: null, status: 404 },
  ];
}
type Route = ReturnType<typeof routesFor>[number];

const softFacts = collectFacts(content, "content").filter((found) => !isFirm(found.fact));

const failures: string[] = [];
let checks = 0;
function check(ok: boolean, label: string) {
  checks++;
  if (!ok) failures.push(label);
}

const trimSlash = (url: string | null) => url?.replace(/\/+$/, "") ?? null;

let visitor = 0;

/** A visitor's own choices, kept in their browser as the site keeps them (lib/theme.ts, lib/motion/prefs.ts). */
interface Choices {
  /** Day or Evening chosen on the site, whatever the device's colour scheme. */
  theme?: Scheme;
  /** Motion: Still. */
  still?: boolean;
  /** Past the visit's first page, so no logo splash. */
  skipSplash?: boolean;
}

/**
 * Opens a page and records console errors, except responses the test expects
 * (e.g. a 503 from an API). Each visitor comes from its own address (the site
 * reads X-Forwarded-For when no proxy sets it), so the site's limits per
 * client apply to each walk on its own.
 */
async function open(browser: Browser, viewport: Viewport, scheme: Scheme, choices: Choices = {}) {
  visitor += 1;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: scheme,
    extraHTTPHeaders: { "x-forwarded-for": `198.51.${100 + Math.floor(visitor / 250)}.${visitor % 250}` },
  });
  // Before any of the site's scripts run, as if the visitor had chosen these on an earlier page.
  await context.addInitScript(
    ({ keys, theme, still, skipSplash }) => {
      try {
        if (theme) localStorage.setItem(keys.theme, theme);
        if (still) localStorage.setItem(keys.motion, "still");
        if (skipSplash) sessionStorage.setItem(keys.splash, "1");
      } catch {
        // Storage blocked: the site falls back to Auto, Full and its splash.
      }
    },
    { keys: { theme: THEME_KEY, motion: MOTION_KEY, splash: SPLASH_KEY }, ...choices },
  );
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return { context, page, errors };
}

/**
 * Scrolls through once so lazy images load, waits for them, then lets the
 * hero animation finish. Images the page doesn't show (a drawing hidden on
 * phones) never load, by design, so they are not waited for.
 */
async function settle(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    // No named functions in here: tsx would wrap them in a helper the browser doesn't have.
    const shown = [...document.images].filter((image) => !image.complete && image.checkVisibility());
    await Promise.race([
      Promise.all(shown.map((image) => image.decode().catch(() => null))),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

async function visit(browser: Browser, route: Route, viewport: Viewport, scheme: Scheme) {
  const { context, page, errors } = await open(browser, viewport, scheme);
  const label = `${route.path} (${viewport.name}, ${scheme})`;
  const response = await page.goto(base + route.path, { waitUntil: "networkidle" });
  check(response?.status() === route.status, `${label}: HTTP ${response?.status()}, expected ${route.status}`);
  await settle(page);

  const found = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelectorAll("h1").length,
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => node.textContent ?? ""),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
    ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null,
    // The house's real photographs (public/photos/), however the image optimiser spells their address.
    realPhotos: [...document.images].filter((image) => /(^|\/|%2F)photos(\/|%2F)/.test(image.currentSrc || image.src)).length,
  }));

  // The browser logs the 404 response of the not-found page itself.
  const unexpected = errors.filter((error) => !(route.status === 404 && error.includes("404")));
  check(unexpected.length === 0, `${label}: console errors: ${unexpected.join(" | ")}`);
  check(found.h1 === 1, `${label}: ${found.h1} h1 elements, expected 1`);
  check(found.overflow <= 0, `${label}: scrolls sideways by ${found.overflow}px`);
  // Every page shows the house drawn; only the booking page shows its real photographs (docs/DESIGN.md §10.5).
  if (route.path === "/book") check(found.realPhotos >= 9, `${label}: ${found.realPhotos} real photographs, expected the 9 of "Real photos"`);
  else check(found.realPhotos === 0, `${label}: ${found.realPhotos} real photographs on a page that should show only drawings`);
  if (route.status === 200) {
    const expected = trimSlash(new URL(route.path, `${siteUrl}/`).toString());
    check(found.title === route.title, `${label}: title "${found.title}", expected "${route.title}"`);
    check(trimSlash(found.canonical) === expected, `${label}: canonical ${found.canonical}, expected ${expected}`);
    check(Boolean(found.ogImage), `${label}: no og:image`);
    checkJsonLd(label, found.jsonLd, new URL(route.path, `${siteUrl}/`).toString());
  } else {
    check(found.jsonLd.length === 0, `${label}: structured data on a page that doesn't exist`);
  }

  await page.screenshot({ path: `${outDir}/${route.name}-${viewport.width}-${scheme}.png`, fullPage: true });
  await context.close();
}

/** One JSON-LD graph, valid schema.org, about this page, with no fact stated that isn't firm. */
function checkJsonLd(label: string, scripts: string[], url: string) {
  check(scripts.length === 1, `${label}: ${scripts.length} JSON-LD scripts, expected 1`);
  let data: unknown;
  try {
    data = JSON.parse(scripts[0] ?? "");
  } catch {
    check(false, `${label}: JSON-LD does not parse`);
    return;
  }
  const problems = validateJsonLd(data);
  check(problems.length === 0, `${label}: JSON-LD: ${problems.join("; ")}`);
  const graph = ((data as { "@graph"?: unknown[] })["@graph"] ?? []) as Record<string, unknown>[];
  const webpages = graph.filter((node) => typesOf(node).some((type) => isA(type, "WebPage")));
  check(webpages.length === 1 && webpages[0]!.url === url, `${label}: JSON-LD does not describe ${url}`);
  const soft = factsMentionedIn(scripts[0] ?? "", softFacts).map((found) => found.path);
  check(soft.length === 0, `${label}: JSON-LD states facts that aren't firm: ${soft.join(", ")}`);
}

/**
 * A /book link fills in the message form, as llms.txt tells assistants; the form is named for them. Without
 * online booking the link fills in booking direct instead: the stay, written out for WhatsApp and email.
 */
async function bookingLink(browser: Browser, mode: BookingMode) {
  const { context, page, errors } = await open(browser, viewports[0], "light");
  const { earliest } = dateWindow();
  const day = (offset: number) => new Date(Date.parse(`${earliest}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
  const [checkIn, checkOut] = [day(10), day(13)];
  await page.goto(`${base}/book?check_in=${checkIn}&check_out=${checkOut}&guests=2#message`, { waitUntil: "networkidle" });
  if (mode === "off") {
    const direct = page.locator("#message");
    check(await direct.getByRole("heading", { name: "Send your dates" }).isVisible(), "booking link: no Send your dates section");
    const whatsapp = (await direct.getByRole("link", { name: /^Send on WhatsApp/ }).getAttribute("href")) ?? "";
    const email = (await direct.getByRole("link", { name: "Send by email" }).getAttribute("href")) ?? "";
    const asked = `2 beds from ${formatDay(checkIn, "long")} to ${formatDay(checkOut, "long")} (3 nights)`;
    check(
      whatsapp.startsWith("https://wa.me/") && decodeURIComponent(whatsapp).includes(asked),
      `booking link: the WhatsApp request doesn't carry the stay: ${decodeURIComponent(whatsapp).slice(0, 160)}`,
    );
    check(email.startsWith("mailto:") && decodeURIComponent(email).includes(asked), "booking link: the email request doesn't carry the stay");
    check(errors.length === 0, `booking link: console errors: ${errors.join(" | ")}`);
    await context.close();
    return;
  }
  const form = page.getByRole("form", { name: "Send the team a message" });
  await form.getByLabel("Check-in").waitFor();
  await page.waitForFunction(() => (document.querySelector<HTMLInputElement>('input[name="guests"]')?.value ?? "") !== "");
  const values = [
    await form.getByLabel("Check-in").inputValue(),
    await form.getByLabel("Check-out").inputValue(),
    await form.getByLabel("Guests").inputValue(),
  ];
  check(
    values.join() === [checkIn, checkOut, "2"].join(),
    `booking link: form shows ${values.join(", ")}, expected ${checkIn}, ${checkOut}, 2`,
  );
  check(errors.length === 0, `booking link: console errors: ${errors.join(" | ")}`);
  await context.close();
}

/** Keyboard users land on the skip link first. */
async function skipLink(browser: Browser) {
  const { context, page } = await open(browser, viewports[1], "light");
  await page.goto(`${base}/the-house`, { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  const text = await page.evaluate(() => document.activeElement?.textContent?.trim());
  check(text === "Skip to content", `skip link: first Tab focused "${text}"`);
  await context.close();
}

async function concierge(browser: Browser, viewport: Viewport, scheme: Scheme) {
  const { context, page, errors } = await open(browser, viewport, scheme);
  const label = `concierge (${viewport.name}, ${scheme})`;
  await page.goto(`${base}/`, { waitUntil: "networkidle" });

  // A question on the home page opens the window, pre-filled.
  const question = page.locator("[data-ask-shadow]", { hasText: "Is breakfast included?" });
  await question.scrollIntoViewIfNeeded();
  await question.click();
  const dialog = page.getByRole("dialog", { name: "Shadow" });
  await dialog.waitFor({ state: "visible" });
  const input = dialog.getByRole("textbox", { name: "Your question for Shadow" });
  check((await input.inputValue()) === "Is breakfast included?", `${label}: question not pre-filled`);
  check(await input.evaluate((node) => node === document.activeElement), `${label}: focus not in the message box`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/concierge-${viewport.width}-${scheme}.png` });

  // Send it. Without ANTHROPIC_API_KEY, Shadow says he is offline and shows the team's details.
  const concierge = await page.request.post(`${base}/api/concierge`, { data: {} });
  const configured = concierge.status() !== 503;
  await dialog.getByRole("button", { name: "Send" }).click();
  // The status line says Shadow is writing, then announces his reply.
  await page.waitForFunction(
    () => {
      const status = (document.querySelector("dialog [aria-live='polite']")?.textContent ?? "").trim();
      return status.length > 0 && status !== "Shadow is writing…";
    },
    undefined,
    { timeout: 60_000 },
  );
  if (!configured) {
    await dialog.getByText("Open WhatsApp").waitFor({ state: "visible" });
    await page.screenshot({ path: `${outDir}/concierge-offline-${viewport.width}-${scheme}.png` });
  }

  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  const unexpected = errors.filter((error) => !(error.includes("503") && !configured));
  check(unexpected.length === 0, `${label}: console errors: ${unexpected.join(" | ")}`);
  await context.close();
}

/**
 * Free beds in Shadow's reply (check_availability). This test doesn't fake
 * Claude, so the chat window is given a canned reply in the protocol's own
 * events, carrying a card as the server builds it from Shadow Check-in's
 * answer. The card must show the stay and its rooms, and Book these dates
 * must open /book at those dates without a reload.
 */
async function conciergeCard(browser: Browser, viewport: Viewport, scheme: Scheme, offset: number) {
  const { context, page, errors } = await open(browser, viewport, scheme);
  const label = `free beds card (${viewport.name}, ${scheme})`;
  const [checkIn, checkOut] = [houseDay(offset), houseDay(offset + 2)];
  const card: AvailabilityCard = {
    check_in: checkIn,
    check_out: checkOut,
    nights: 2,
    guests: 2,
    rooms: [
      { name: FAKE_ROOMS[0]!.name, kind: "mixed_dorm", free: FAKE_ROOMS[0]!.beds },
      { name: FAKE_ROOMS[1]!.name, kind: "female_dorm", free: FAKE_ROOMS[1]!.beds },
    ],
  };
  const reply: ConciergeEvent[] = [
    { type: "availability", card },
    { type: "text", text: "Yes: beds are free for those two nights, in the mixed dorm and the female dorm. " },
    { type: "text", text: "Press Book these dates below to book them; nothing is held for you until you send the request." },
    { type: "done" },
  ];
  await page.route("**/api/concierge", (route) =>
    route.fulfill({ status: 200, contentType: "application/x-ndjson; charset=utf-8", body: reply.map(encodeEvent).join("") }),
  );

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const question = page.locator("[data-ask-shadow]", { hasText: "Is breakfast included?" });
  await question.scrollIntoViewIfNeeded();
  await question.click();
  const dialog = page.getByRole("dialog", { name: "Shadow" });
  await dialog.waitFor({ state: "visible" });
  await dialog.getByRole("textbox", { name: "Your question for Shadow" }).fill("Any beds for two of us, for two nights?");
  await dialog.getByRole("button", { name: "Send" }).click();

  const shown = dialog.getByRole("region", { name: "Free beds for your dates" });
  await shown.waitFor();
  const text = (await shown.textContent()) ?? "";
  check(
    text.includes(`${formatDay(checkIn)} to ${formatDay(checkOut)} 2 nights`) &&
      card.rooms.every((room) => text.includes(`${room.name} ${room.free} beds free every night`)),
    `${label}: shows "${text.slice(0, 160)}"`,
  );
  const book = shown.getByRole("link", { name: "Book these dates" });
  const href = await book.getAttribute("href");
  check(href === `/book?check_in=${checkIn}&check_out=${checkOut}&guests=2`, `${label}: Book these dates links to ${href}`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/concierge-card-${viewport.width}-${scheme}.png` });

  await book.click();
  await dialog.waitFor({ state: "hidden" });
  const flow = page.locator("#book-online");
  await flow.getByRole("heading", { name: "Choose your beds" }).waitFor();
  const stay = (await flow.getByRole("complementary", { name: "Your stay" }).textContent()) ?? "";
  check(
    stay.includes(formatDay(checkIn)) && stay.includes(formatDay(checkOut)),
    `${label}: /book shows "${stay.slice(0, 80)}", expected ${checkIn} to ${checkOut}`,
  );
  check(errors.length === 0, `${label}: console errors: ${errors.join(" | ")}`);
  await context.close();
}

/** The message form: sent to the fake Shadow Check-in; never sent to a real one, and not there without one. */
async function bookingForm(browser: Browser, viewport: Viewport, mode: BookingMode, fake: FakeShadow | null) {
  const label = `message form (${viewport.name})`;
  if (mode !== "fake") {
    console.log(`${label}: ${mode === "live" ? "Shadow Check-in is configured, so the form is not submitted" : "no form without Shadow Check-in"}.`);
    return;
  }
  const { context, page, errors } = await open(browser, viewport, "light");

  await page.goto(`${base}/book`, { waitUntil: "networkidle" });
  const form = page.getByRole("form", { name: "Send the team a message" });
  await form.getByLabel("Your name").fill("Smoke Test");
  await form.getByRole("textbox", { name: "Email" }).fill("smoke@example.com");
  await form.getByLabel("Your message").fill("Checking the form works.");
  await form.getByLabel(/I agree to the privacy notice/).check();
  check((await form.getByRole("link", { name: /privacy notice/ }).getAttribute("target")) === "_blank", `${label}: the privacy notice link leaves the form`);
  const sent = fake?.inquiries.size ?? 0;
  await form.getByRole("button", { name: "Send message" }).click();
  await page.getByText("Your message is with the team").waitFor();
  check(fake?.inquiries.size === sent + 1, `${label}: the fake Shadow Check-in received ${(fake?.inquiries.size ?? 0) - sent} inquiries, expected 1`);
  check(errors.length === 0, `${label}: console errors: ${errors.join(" | ")}`);
  await context.close();
}

/**
 * Online booking's switch: "off" when the site has no Shadow Check-in, "fake"
 * when it talks to this test's stand-in, "live" when it talks to a real one.
 */
type BookingMode = "off" | "fake" | "live";

/** A day at the house, counted from today in Vientiane, as the booking calendar counts. */
const houseDay = (offset: number) => addDays(houseToday(), offset);

async function bookingMode(context: BrowserContext, fake: FakeShadow | null): Promise<BookingMode> {
  const before = fake?.calls.length ?? 0;
  // Dates no earlier run asked about in the last minute, so the site's cache can't answer for Shadow.
  const from = houseDay(100 + (Date.now() % 97));
  const response = await context.request.get(`${base}/api/availability?check_in=${from}&check_out=${addDays(from, 1)}&guests=1`);
  if (fake && fake.calls.length > before) return "fake";
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return response.status() === 503 && body?.error === "not_configured" ? "off" : "live";
}

/** /book with or without online booking, and the booking card that leads there. */
async function bookingPages(browser: Browser, mode: BookingMode) {
  const { context, page, errors } = await open(browser, viewports[0], "light");
  await page.goto(`${base}/book`, { waitUntil: "networkidle" });
  const online = (await page.locator("#book-online").count()) === 1;
  const h1 = (await page.locator("h1").textContent())?.trim();
  if (mode === "off") {
    check(!online && h1 === "Book direct", `/book without Shadow Check-in: online booking ${online ? "shown" : "hidden"}, h1 "${h1}"`);
  } else {
    check(
      online && h1 === "Book a bed",
      `/book with Shadow Check-in: online booking ${online ? "shown" : "missing: was the site built with SHADOW_API_URL and SHADOW_INQUIRY_KEY?"}, h1 "${h1}"`,
    );
  }
  for (const site of ["Booking.com", "Agoda"]) {
    check(await page.locator("#online").getByRole("link", { name: new RegExp(`^${site}`) }).isVisible(), `/book: no ${site} link`);
  }
  const messageForm = await page.getByRole("form", { name: "Send the team a message" }).count();
  if (mode === "off") {
    check(messageForm === 0, "/book without Shadow Check-in: a message form that could never send");
    check(
      await page.locator("#message").getByRole("link", { name: /^Send on WhatsApp/ }).isVisible(),
      "/book without Shadow Check-in: no Send on WhatsApp at #message",
    );
    // Booking direct comes before the booking sites.
    const order = await page.evaluate(() => [...document.querySelectorAll("main section[id]")].map((section) => section.id));
    check(order.indexOf("message") < order.indexOf("online"), `/book: the booking sites come before booking direct (${order.join(", ")})`);
  } else {
    check(messageForm === 1, "/book: no message form");
  }

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  if (mode === "off") {
    const checkInDay = addDays(houseToday(), 10);
    const card = page.locator('[data-hides-launcher]').filter({ has: page.locator("#booking-card-title") });
    const whatsapp = card.getByRole("link", { name: /^Send on WhatsApp/ });
    check((await whatsapp.getAttribute("href"))?.startsWith("https://wa.me/") ?? false, "booking card: no WhatsApp link");
    check((await card.getByRole("link", { name: "Send by email" }).getAttribute("href"))?.startsWith("mailto:") ?? false, "booking card: no email link");
    // Choosing a date writes it into the request.
    await card.locator('input[type="date"]').fill(checkInDay);
    check(
      decodeURIComponent((await whatsapp.getAttribute("href")) ?? "").includes(formatDay(checkInDay, "long")),
      "booking card: the chosen date isn't in the WhatsApp request",
    );
  } else {
    const card = page.locator('form[aria-labelledby="booking-card-title"]');
    const [action, button] = [await card.getAttribute("action"), (await card.getByRole("button").textContent())?.trim()];
    check(action === "/book" && button === "See free beds", `booking card: "${button}" to ${action}, expected "See free beds" to /book`);
  }
  check(errors.length === 0, `booking pages: console errors: ${errors.join(" | ")}`);
  await context.close();
}

/** A guest's whole booking, the dates chosen by keyboard, with a screenshot of each step. */
async function bookingWalk(browser: Browser, viewport: Viewport, scheme: Scheme, fake: FakeShadow, offset: number) {
  const { context, page, errors } = await open(browser, viewport, scheme);
  const label = `booking (${viewport.name}, ${scheme})`;
  const flow = page.locator("#book-online");
  const shot = (step: string) => flow.screenshot({ path: `${outDir}/booking-${step}-${viewport.width}-${scheme}.png` });
  const [checkIn, checkOut] = [houseDay(offset), houseDay(offset + 2)];

  await page.goto(`${base}/book`, { waitUntil: "networkidle" });
  await flow.getByText("Online booking is open until").waitFor();
  // From today's day, the calendar's one tab stop: arrows to the check-in, Enter, two nights on, Enter.
  await flow.locator('[data-day][tabindex="0"]').focus();
  for (let day = 0; day < offset; day++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  const names = [
    await flow.locator(`[data-day="${checkIn}"]`).getAttribute("aria-label"),
    await flow.locator(`[data-day="${checkOut}"]`).getAttribute("aria-label"),
  ];
  check(
    Boolean(names[0]?.endsWith("check-in") && names[1]?.endsWith("check-out")),
    `${label}: the keyboard chose "${names.join('" and "')}"`,
  );
  await flow.getByRole("button", { name: "More guests" }).click();
  // Each weekday column is named in full for screen readers (F1W-10).
  check((await flow.getByRole("columnheader", { name: "Monday", exact: true }).count()) >= 1, `${label}: the calendar's columns have no names`);
  await shot("1-dates");
  await flow.getByRole("button", { name: "See free beds" }).click();

  await flow.getByRole("heading", { name: "Choose your beds" }).waitFor();
  // A private room is priced as a whole (per_room_per_night), a dorm per guest.
  const priceOf = async (room: FakeRoom) =>
    (await flow.locator("label", { has: page.getByRole("radio", { name: room.name }) }).textContent()) ?? "";
  const [dormPrice, roomPrice] = [await priceOf(FAKE_ROOMS[0]!), await priceOf(FAKE_ROOMS[2]!)];
  // The dorm's nightly rate depends on the weekday; the private room's (USD 36 a night, whole) doesn't.
  check(
    dormPrice.includes("per guest per night") &&
      !dormPrice.includes("per room") &&
      roomPrice.includes(`${formatMoney(36, "USD")}per room per night`) &&
      roomPrice.includes(`${formatMoney(72, "USD")} in all for 2 guests, 2 nights`),
    `${label}: the beds' prices read "${dormPrice.slice(-120)}" and "${roomPrice.slice(-120)}"`,
  );
  await flow.getByRole("radio", { name: FAKE_ROOMS[0]!.name }).check();
  await shot("2-beds");
  await flow.getByRole("button", { name: "Continue" }).click();

  await flow.getByRole("heading", { name: "Your details" }).waitFor();
  await flow.getByRole("textbox", { name: "Your name" }).fill("Smoke Test");
  await flow.getByRole("textbox", { name: "Email" }).fill("smoke@example.com");
  await flow.getByRole("textbox", { name: "WhatsApp or phone" }).fill("+856 20 5555 0100");
  await flow.getByRole("radio", { name: "WhatsApp" }).check();
  await flow.getByLabel("Arrival time").fill("15:30");
  await flow.getByRole("checkbox", { name: /I agree to the privacy notice/ }).check();
  // Reading the notice opens a new tab, so nothing typed here is lost (F1W-06).
  const privacy = flow.getByRole("link", { name: /privacy notice/ });
  check((await privacy.getAttribute("target")) === "_blank", `${label}: the privacy notice link leaves the form`);
  await shot("3-details");
  await flow.getByRole("button", { name: "Continue" }).click();

  await flow.getByRole("heading", { name: "Check and send" }).waitFor();
  const payment = flow.getByRole("definition").filter({ hasText: /^At the house/ });
  check((await payment.count()) === 1, `${label}: the review doesn't say the guest pays at the house`);
  await shot("4-review");
  await flow.getByRole("button", { name: "Send booking request" }).click();

  await flow.getByRole("heading", { name: "Booking request sent" }).waitFor();
  const reference = (await flow.getByText(/^[A-Z0-9]+-[A-Z0-9]{6}$/).textContent())?.trim();
  await shot("5-confirmation");
  const booked = [...fake.bookings.values()].find((booking) => booking.response.reference === reference);
  const sent = booked?.request;
  check(
    sent?.check_in === checkIn &&
      sent.check_out === checkOut &&
      sent.guests === 2 &&
      sent.room_type_id === FAKE_ROOMS[0]!.id &&
      sent.name === "Smoke Test" &&
      sent.preferred_contact === "whatsapp" &&
      sent.arrival_time === "15:30",
    `${label}: Shadow received ${JSON.stringify(sent)} for ${reference}`,
  );
  check(await flow.getByText(/Nothing to pay now/).isVisible(), `${label}: the confirmation doesn't say when to pay`);
  check(errors.length === 0, `${label}: console errors: ${errors.join(" | ")}`);
  await context.close();
}

/** Someone else takes the beds while the guest is booking (Shadow answers 409): they choose again, details kept. */
async function bookingTaken(browser: Browser, fake: FakeShadow) {
  const { context, page, errors } = await open(browser, viewports[0], "light");
  const label = "booking, beds taken (phone)";
  const flow = page.locator("#book-online");
  const [dorm, other] = [FAKE_ROOMS[0]!, FAKE_ROOMS[1]!];
  const [checkIn, checkOut] = [houseDay(20), houseDay(23)];

  // A link with dates, as an assistant would write it, goes straight to the beds.
  await page.goto(`${base}/book?check_in=${checkIn}&check_out=${checkOut}&guests=2`, { waitUntil: "networkidle" });
  await flow.getByRole("heading", { name: "Choose your beds" }).waitFor();
  await flow.getByRole("radio", { name: dorm.name }).check();
  await flow.getByRole("button", { name: "Continue" }).click();
  await flow.getByRole("textbox", { name: "Your name" }).fill("Smoke Test");
  await flow.getByRole("textbox", { name: "Email" }).fill("smoke@example.com");
  await flow.getByRole("checkbox", { name: /I agree to the privacy notice/ }).check();
  await flow.getByRole("button", { name: "Continue" }).click();
  await flow.getByRole("heading", { name: "Check and send" }).waitFor();

  fake.occupy(dorm.id, checkIn, checkOut, dorm.beds);
  await flow.getByRole("button", { name: "Send booking request" }).click();
  await flow.getByRole("alert").filter({ hasText: "those beds were taken" }).waitFor();
  await flow.getByRole("radio", { name: other.name }).waitFor();
  check(await flow.getByRole("radio", { name: dorm.name }).isDisabled(), `${label}: the full dorm can still be chosen`);
  await flow.screenshot({ path: `${outDir}/booking-taken-390-light.png` });

  await flow.getByRole("radio", { name: other.name }).check();
  await flow.getByRole("button", { name: "Continue" }).click();
  const name = await flow.getByRole("textbox", { name: "Your name" }).inputValue();
  check(name === "Smoke Test", `${label}: the guest's details were lost ("${name}")`);
  await flow.getByRole("button", { name: "Continue" }).click();
  const price = flow.locator("dl").first().getByRole("definition").filter({ hasText: /^Confirmed by the team/ });
  check((await price.count()) === 1, `${label}: a room without a rate shows a price`);
  await flow.getByRole("button", { name: "Send booking request" }).click();
  await flow.getByRole("heading", { name: "Booking request sent" }).waitFor();
  check(
    await flow.getByText(/The team confirms the price with your booking/).isVisible(),
    `${label}: the confirmation doesn't say the team confirms the price`,
  );
  const unexpected = errors.filter((error) => !error.includes("409"));
  check(unexpected.length === 0, `${label}: console errors: ${unexpected.join(" | ")}`);
  await context.close();
}

/**
 * The house changes its rate while a guest is booking: nothing is booked, the
 * review shows the new total and the guest books at it (F1W-03). Shadow also
 * takes this request without holding its beds (its hold limits), so the
 * confirmation says the team will confirm availability (F1W-01).
 */
async function bookingPriceChange(browser: Browser, fake: FakeShadow) {
  const { context, page, errors } = await open(browser, viewports[0], "light");
  const label = "booking, price changed (phone)";
  const flow = page.locator("#book-online");
  const dorm = FAKE_ROOMS[0]!;
  const [checkIn, checkOut] = [houseDay(30), houseDay(32)];
  const rate = 150_000;
  const total = rate * nightsBetween(checkIn, checkOut);
  const totalText = formatMoney(total, "LAK");
  try {
    await page.goto(`${base}/book?check_in=${checkIn}&check_out=${checkOut}&guests=1`, { waitUntil: "networkidle" });
    await flow.getByRole("radio", { name: dorm.name }).check();
    await flow.getByRole("button", { name: "Continue" }).click();
    await flow.getByRole("textbox", { name: "Your name" }).fill("Smoke Test");
    await flow.getByRole("textbox", { name: "Email" }).fill("price-change@example.com");
    await flow.getByRole("checkbox", { name: /I agree to the privacy notice/ }).check();
    await flow.getByRole("button", { name: "Continue" }).click();
    await flow.getByRole("heading", { name: "Check and send" }).waitFor();

    fake.setRate(dorm.id, { currency: "LAK", amount: rate });
    fake.state.holdsPerContact = 0;
    const before = fake.bookings.size;
    await flow.getByRole("button", { name: "Send booking request" }).click();
    const notice = flow.getByRole("alert").filter({ hasText: "The price changed while you were booking" });
    await notice.waitFor();
    check(((await notice.textContent()) ?? "").includes(totalText), `${label}: the notice doesn't give the new total ${totalText}`);
    check(fake.bookings.size === before, `${label}: Shadow booked at a price the guest hadn't seen`);
    const price = ((await flow.locator("dl").first().textContent()) ?? "").includes(totalText);
    check(price, `${label}: the review's price isn't the new total`);
    await flow.screenshot({ path: `${outDir}/booking-price-changed-390-light.png` });

    await flow.getByRole("button", { name: "Send booking request" }).click();
    await flow.getByRole("heading", { name: "Booking request sent" }).waitFor();
    const sent = [...fake.bookings.values()].at(-1)?.request;
    check(
      fake.bookings.size === before + 1 && sent?.quoted_total === total && sent.quoted_currency === "LAK",
      `${label}: Shadow received ${JSON.stringify(sent)}`,
    );
    const confirmation = (await flow.textContent()) ?? "";
    check(confirmation.includes(`The total is ${totalText}`), `${label}: the confirmation doesn't give the total agreed`);
    check(
      confirmation.includes("The team will confirm availability") && !confirmation.includes("Your beds are held for you until"),
      `${label}: a request without a hold reads as held`,
    );
    await flow.screenshot({ path: `${outDir}/booking-no-hold-390-light.png` });
  } finally {
    fake.setRate(dorm.id, dorm.rate);
    fake.state.holdsPerContact = 2;
  }
  const unexpected = errors.filter((error) => !error.includes("409"));
  check(unexpected.length === 0, `${label}: console errors: ${unexpected.join(" | ")}`);
  await context.close();
}

/**
 * A dated /book link followed without a reload, as Next.js follows the links
 * in Shadow's replies: from another page, then from /book itself. The booking
 * form (when the build has it) opens at the free beds for those dates, and
 * the message form below has them too (F1W-04).
 */
async function bookingSoftNavigation(browser: Browser, mode: BookingMode, fake: FakeShadow | null) {
  const { context, page, errors } = await open(browser, viewports[0], "light");
  const label = "dated link without a reload";
  if (mode === "off") {
    // Without online booking the link fills in booking direct: the request written out for WhatsApp.
    await page.goto(`${base}/faq`, { waitUntil: "networkidle" });
    for (const [checkIn, nights, where] of [
      [houseDay(60), 2, "from /faq"],
      [houseDay(64), 3, "on /book"],
    ] as const) {
      await page.evaluate(
        (url) => (window as unknown as { next: { router: { push(href: string): void } } }).next.router.push(url),
        `/book?check_in=${checkIn}&check_out=${addDays(checkIn, nights)}&guests=2`,
      );
      const asked = `2 beds from ${formatDay(checkIn, "long")}`;
      const carries = await page
        .waitForFunction(
          (words) => decodeURIComponent(document.querySelector<HTMLAnchorElement>('#message a[href^="https://wa.me/"]')?.href ?? "").includes(words),
          asked,
          { timeout: 10_000 },
        )
        .then(() => true, () => false);
      check(carries, `${label} (${where}): the WhatsApp request doesn't carry ${checkIn}, ${nights} nights`);
    }
    check(errors.length === 0, `${label}: console errors: ${errors.join(" | ")}`);
    await context.close();
    return;
  }
  const flow = page.locator("#book-online");
  const message = page.getByRole("form", { name: "Send the team a message" });
  const stayShown = async () => (await flow.getByRole("complementary", { name: "Your stay" }).textContent()) ?? "";
  const shows = (text: string, checkIn: string, checkOut: string) => text.includes(formatDay(checkIn)) && text.includes(formatDay(checkOut));
  await page.goto(`${base}/faq`, { waitUntil: "networkidle" });
  // Days no other walk asks about, so Shadow (or the fake) is asked about them.
  const links = [
    [houseDay(60), 2, "from /faq"],
    [houseDay(64), 3, "on /book"],
  ] as const;
  for (const [checkIn, nights, where] of links) {
    const checkOut = addDays(checkIn, nights);
    // What next/link does when a guest clicks a link in Shadow's reply.
    await page.evaluate(
      (url) => (window as unknown as { next: { router: { push(href: string): void } } }).next.router.push(url),
      `/book?check_in=${checkIn}&check_out=${checkOut}&guests=2`,
    );
    await page.waitForFunction((day) => document.querySelector<HTMLInputElement>('input[name="check_in"]')?.value === day, checkIn);
    const dates = [
      await message.getByLabel("Check-in").inputValue(),
      await message.getByLabel("Check-out").inputValue(),
      await message.getByLabel("Guests").inputValue(),
    ].join();
    check(dates === [checkIn, checkOut, "2"].join(), `${label} (${where}): the message form shows ${dates}`);
    await flow.getByRole("heading", { name: "Choose your beds" }).waitFor();
    const stay = await stayShown();
    check(shows(stay, checkIn, checkOut), `${label} (${where}): the booking form shows "${stay.slice(0, 80)}", expected ${checkIn} to ${checkOut}`);
    if (fake) {
      const asked = fake.calls.some((call) => call.path === `/api/public/availability?check_in=${checkIn}&check_out=${checkOut}&guests=2`);
      check(asked, `${label} (${where}): the free beds for the linked dates were never looked up`);
      await flow.getByRole("radio", { name: FAKE_ROOMS[0]!.name }).waitFor();
    }
  }
  await flow.screenshot({ path: `${outDir}/booking-soft-link-390-light.png` });
  // Back: the second link's dates one step back, then the first link's beds again.
  await page.goBack();
  await flow.getByRole("heading", { name: "When would you like to stay?" }).waitFor();
  await page.goBack();
  await flow.getByRole("heading", { name: "Choose your beds" }).waitFor();
  const [checkIn, nights] = links[0];
  await page.waitForFunction(
    (day) => document.querySelector("#book-online aside")?.textContent?.includes(day) ?? false,
    formatDay(checkIn),
  );
  const stay = await stayShown();
  check(shows(stay, checkIn, addDays(checkIn, nights)), `${label}: Back to the first link shows "${stay.slice(0, 80)}"`);
  check(errors.length === 0, `${label}: console errors: ${errors.join(" | ")}`);
  await context.close();
}

/** Shadow Check-in not taking bookings (503), then a busy line (429) that clears. */
async function bookingClosedAndBusy(browser: Browser, fake: FakeShadow) {
  const { context, page, errors } = await open(browser, viewports[0], "light");
  const flow = page.locator("#book-online");
  // Dates nobody asked about yet, so the site's cache doesn't answer instead.
  const link = (offset: number) => `${base}/book?check_in=${houseDay(offset)}&check_out=${houseDay(offset + 2)}&guests=3`;
  try {
    fake.state.mode = "not_configured";
    await page.goto(link(40), { waitUntil: "networkidle" });
    await flow.getByRole("heading", { name: "Online booking isn’t open just now" }).waitFor();
    check(
      (await flow.getByRole("link", { name: /^Booking\.com/ }).first().isVisible()) &&
        (await flow.getByRole("link", { name: "Send the team a message", exact: true }).isVisible()),
      "booking closed: the other ways to book are missing",
    );
    await flow.screenshot({ path: `${outDir}/booking-closed-390-light.png` });

    fake.state.mode = "rate_limited";
    await page.goto(link(50), { waitUntil: "networkidle" });
    const busy = flow.getByRole("alert").filter({ hasText: "Our booking line is busy" });
    await busy.waitFor();
    check(await busy.getByText("Open WhatsApp").isVisible(), "booking busy: no contact details");
    await flow.screenshot({ path: `${outDir}/booking-busy-390-light.png` });
    fake.state.mode = "open";
    await busy.getByRole("button", { name: "Try again" }).click();
    await flow.getByRole("radio", { name: FAKE_ROOMS[0]!.name }).waitFor();
  } finally {
    fake.state.mode = "open";
  }
  const unexpected = errors.filter((error) => !error.includes("503"));
  check(unexpected.length === 0, `booking closed and busy: console errors: ${unexpected.join(" | ")}`);
  await context.close();
}

const kB = (bytes: number) => `${(bytes / 1000).toFixed(1)} kB`;

/**
 * The budgets (docs/DESIGN.md §1.6): the home page's HTML as served, and the
 * scripts it loads, gzipped as a server sends them. The house's two longest
 * pages are reported against the same HTML figure, as warnings.
 */
async function budgets(context: BrowserContext) {
  const html = await (await context.request.get(`${base}/`)).body();
  const scripts = [...html.toString("utf8").matchAll(/<script\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => !/\snomodule\b/i.test(tag))
    .flatMap((tag) => /\ssrc="([^"]+)"/.exec(tag)?.[1]?.replaceAll("&amp;", "&") ?? []);
  let js = 0;
  for (const src of new Set(scripts)) js += gzipSync(await (await context.request.get(new URL(src, `${base}/`).toString())).body()).length;
  check(html.length <= HOME_HTML_BUDGET, `/: the HTML is ${html.length} bytes, over its budget of ${HOME_HTML_BUDGET}`);
  check(js <= HOME_JS_BUDGET, `/: its ${new Set(scripts).size} scripts are ${js} bytes gzipped, over their budget of ${HOME_JS_BUDGET}`);
  console.log(`Budgets: / HTML ${kB(html.length)} of ${kB(HOME_HTML_BUDGET)}; its scripts ${kB(js)} gzipped of ${kB(HOME_JS_BUDGET)}.`);
  for (const path of ["/the-house", "/house-rules"]) {
    const size = (await (await context.request.get(base + path)).body()).length;
    const over = size > HOME_HTML_BUDGET;
    console.log(`${over ? "Warning: " : ""}${path} HTML is ${kB(size)}${over ? `, more than the home page's budget of ${kB(HOME_HTML_BUDGET)}` : ""}.`);
  }
}

/**
 * The hero's first screen (docs/DESIGN.md §1.1, §10.5): in every viewport,
 * the h1, why to book direct, Book and Ask Shadow are on it; beside them on
 * wide screens the whole dorm drawing, down to its foot, and on phones its
 * top, under the words. The drawing is the largest paint. Seen at rest
 * (Still), where the lamps have dropped into place, and saved as
 * hero-{size}-{scheme}.png.
 */
async function hero(browser: Browser, viewport: Viewport, scheme: Scheme) {
  const { context, page, errors } = await open(browser, viewport, scheme, { theme: scheme, still: true, skipSplash: true });
  const label = `hero (${viewport.width}x${viewport.height}, ${scheme})`;
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const section = page.locator('section[aria-labelledby="hero-title"]');
  const onFirstScreen = async (name: string, locator: Locator, whole = true) => {
    const box = await locator.boundingBox();
    const [top, bottom] = box ? [Math.round(box.y), Math.round(box.y + box.height)] : [NaN, NaN];
    check(
      top >= 0 && (whole ? bottom <= viewport.height : top < viewport.height),
      `${label}: ${name} is ${whole ? "not all" : "not"} on the first screen (${box ? `y ${top} to ${bottom} of ${viewport.height}` : "not found"})`,
    );
  };
  await onFirstScreen("the h1", section.locator("h1"));
  await onFirstScreen(`"${policies.directPriceShort.value}"`, section.getByText(policies.directPriceShort.value, { exact: true }));
  await onFirstScreen("Book", section.getByRole("link", { name: /^Book/ }));
  await onFirstScreen("Ask Shadow", section.getByRole("button", { name: "Ask Shadow" }));
  // The hero sets the words beside the photo from 60rem (960 px) up.
  // Day and Evening twins share the alt text; the theme shows one of them.
  const dorm = section.getByAltText(photos.dormCorridor.drawnAlt, { exact: true }).locator("visible=true");
  await onFirstScreen("the dorm drawing", dorm, viewport.width >= 960);
  const largest = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        new PerformanceObserver((list) => {
          const element = (list.getEntries().at(-1) as (PerformanceEntry & { element?: Element | null }) | undefined)?.element;
          resolve(element instanceof HTMLImageElement ? element.alt : (element?.tagName.toLowerCase() ?? "unknown"));
        }).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => resolve("not reported"), 3_000);
      }),
  );
  check(largest === photos.dormCorridor.drawnAlt, `${label}: the largest paint is "${largest}", not the dorm drawing`);
  check(errors.length === 0, `${label}: console errors: ${errors.join(" | ")}`);
  await page.screenshot({ path: `${outDir}/hero-${viewport.width}x${viewport.height}-${scheme}.png` });
  await context.close();
}

/**
 * Two shots of one stage, compared in 4 px cells, each cell's colours
 * averaged: the hair's-breadth differences in how a moving layer's edges are
 * drawn even out, while anything a reader would see (a curtain half open, a
 * tag gone, the thread not drawn) leaves cells whose colour differs by more
 * than 96 of 255. Those are marked in red on a copy of the first shot.
 */
async function differingCells(first: string, second: string, marked: string) {
  const [a, b] = await Promise.all([first, second].map((path) => sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
  const { width, height } = a!.info;
  if (width !== b!.info.width || height !== b!.info.height) return { cells: 1, where: `${width}x${height} against ${b!.info.width}x${b!.info.height}` };
  const cell = 4;
  const found: [number, number][] = [];
  for (let top = 0; top + cell <= height; top += cell) {
    for (let left = 0; left + cell <= width; left += cell) {
      let worst = 0;
      for (let channel = 0; channel < 3; channel++) {
        let sum = 0;
        for (let y = top; y < top + cell; y++) {
          for (let x = left; x < left + cell; x++) sum += a!.data[(y * width + x) * 3 + channel]! - b!.data[(y * width + x) * 3 + channel]!;
        }
        worst = Math.max(worst, Math.abs(sum) / (cell * cell));
      }
      if (worst > 96) found.push([left, top]);
    }
  }
  if (found.length === 0) return { cells: 0, where: "" };
  const red = { create: { width: cell, height: cell, channels: 4 as const, background: { r: 255, g: 0, b: 0, alpha: 0.85 } } };
  await sharp(first)
    .composite(found.map(([left, top]) => ({ input: red, left, top })))
    .toFile(marked);
  const [xs, ys] = [found.map(([x]) => x), found.map(([, y]) => y)];
  return { cells: found.length, where: `x ${Math.min(...xs)} to ${Math.max(...xs) + cell}, y ${Math.min(...ys)} to ${Math.max(...ys) + cell}` };
}

/**
 * The house story's shots (docs/DESIGN.md §1.2), saved as
 * theatre-{width}-{scheme}-{shot}.png. Each is placed by StageDirector's own
 * cues (#theatre-cues, HouseTheatre.tsx), whose tops cross the middle of the
 * screen as their act or stop begins: the street front as Act A begins, the
 * front half gone, Floor 1 lifted with its tags as Act B ends, the thread at
 * each stop of the walk, and the end. The end is where the section's view
 * timeline ends, which takes the page's scroll padding as its inset (4.5rem
 * on phones), not where the section's foot meets the screen's. There the
 * curtain must be closed, and the end frame must match the rest frame, which
 * Still shows at the same place.
 */
async function theatre(browser: Browser, viewport: Viewport, scheme: Scheme) {
  const label = `theatre (${viewport.name}, ${scheme})`;
  const file = (shot: string) => `${outDir}/theatre-${viewport.width}-${scheme}-${shot}.png`;
  // A clip of the screen, not the element's own screenshot, which scrolls the sticky stage clear of the scroll padding first.
  const shoot = async (page: Page, shot: string) => {
    const box = await page.locator("#theatre").boundingBox();
    if (box) await page.screenshot({ path: file(shot), clip: box });
    return box !== null;
  };
  const scrollTo = (page: Page, y: number) => page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  const curtain = (page: Page) =>
    page.evaluate(() => {
      const cloth = document.querySelector("#theatre [data-cloth]");
      const transform = cloth ? getComputedStyle(cloth).transform : null;
      return transform === "none" ? "matrix(1, 0, 0, 1, 0, 0)" : transform;
    });

  const { context, page, errors } = await open(browser, viewport, scheme, { theme: scheme, skipSplash: true });
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const shots = await page.evaluate(() => {
    const section = document.getElementById("the-house-story");
    const cues = [...document.querySelectorAll<HTMLElement>("#theatre-cues > span")];
    if (!section || cues.length === 0) return null;
    const at = cues.map((cue) => ({
      act: cue.dataset.act ?? "",
      stop: Number(cue.dataset.stop ?? -1),
      y: cue.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2,
    }));
    const stops = [...section.querySelectorAll("[data-stop] h3")].map((heading) => heading.textContent?.trim() ?? "");
    const a = at.find((cue) => cue.act === "a")?.y ?? 0;
    const b = at.find((cue) => cue.act === "b")?.y ?? a;
    const walk = at.filter((cue) => cue.act === "c");
    // The view timeline's end inset: the page's scroll padding while the section leaves it at auto.
    const inset = getComputedStyle(section).getPropertyValue("view-timeline-inset").trim().split(/\s+/).at(-1) ?? "auto";
    const padding = inset === "auto" || inset === "" ? getComputedStyle(document.documentElement).scrollPaddingBottom : inset;
    const end = section.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + (parseFloat(padding) || 0);
    return [
      { shot: "1-street-front", y: a },
      // Three quarters through Act A: the front holds for its first half, so here it is half gone.
      { shot: "2-opening", y: a + (b - a) * 0.75 },
      { shot: "3-floor-1-lifted", y: (walk[0]?.y ?? b) - 2 },
      ...walk.map((cue, k) => ({
        shot: `${k + 4}-${(stops[cue.stop] ?? `stop ${cue.stop}`).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        y: cue.y + 40,
      })),
      // A pixel past it, as scrolling stops on whole pixels and the section rarely ends on one.
      { shot: "end", y: Math.ceil(end) + 1 },
    ];
  });
  if (!shots) {
    check(false, `${label}: no #the-house-story with StageDirector's cues`);
    await context.close();
    return;
  }
  for (const { shot, y } of shots) {
    await scrollTo(page, y);
    await page.waitForTimeout(600);
    if (shot === "end") {
      // Let the stage's phrases (lights, motes, a breath of wind) finish first.
      await page
        .waitForFunction(
          () =>
            document
              .getAnimations()
              .every(
                (animation) =>
                  animation.timeline !== document.timeline ||
                  animation.playState !== "running" ||
                  !(animation.effect as KeyframeEffect | null)?.target?.closest("#theatre"),
              ),
          undefined,
          { timeout: 8_000 },
        )
        .catch(() => check(false, `${label}: the stage's phrases are still playing 8 s after the story's end`));
    }
    check(await shoot(page, shot), `${label}: no #theatre to photograph at ${shot}`);
  }
  const closed = await curtain(page);
  check(errors.length === 0, `${label}: console errors: ${errors.join(" | ")}`);
  await context.close();

  // The rest frame, at the same place.
  const end = shots.at(-1)!.y;
  const still = await open(browser, viewport, scheme, { theme: scheme, still: true, skipSplash: true });
  await still.page.goto(`${base}/`, { waitUntil: "networkidle" });
  await scrollTo(still.page, end);
  await still.page.waitForTimeout(600);
  await shoot(still.page, "still");
  const resting = await curtain(still.page);
  check(closed !== null && closed === resting, `${label}: at the story's end the curtain is ${closed ?? "missing"}, at rest ${resting ?? "missing"}`);
  const differ = await differingCells(file("end"), file("still"), file("end-against-still"));
  check(differ.cells === 0, `${label}: the end frame and the rest frame (Still) differ in ${differ.cells} places (${differ.where}): see ${file("end-against-still")}`);
  await still.context.close();
}

/**
 * Motion: Still (docs/DESIGN.md §1.4, §4.5), on every page, each the first page
 * of a visit (a new tab): no splash, and nothing animating one second after
 * load, nor once the page has been scrolled through. Saved as
 * still-{page}-{width}.png.
 */
async function stillPages(browser: Browser, routes: readonly Route[], viewport: Viewport) {
  const { context, page: first } = await open(browser, viewport, "light", { still: true });
  await first.close();
  for (const route of routes) {
    const page = await context.newPage();
    const label = `${route.path} (${viewport.name}, Still)`;
    await page.goto(base + route.path, { waitUntil: "load" });
    await page.waitForTimeout(1_000);
    const atLoad = await page.evaluate(() => ({
      splash: document.documentElement.classList.contains("splash"),
      moving: document.getAnimations().map((animation) => (animation as CSSAnimation).animationName ?? animation.constructor.name),
    }));
    check(!atLoad.splash, `${label}: the splash shows`);
    check(atLoad.moving.length === 0, `${label}: ${atLoad.moving.length} animations one second after load: ${atLoad.moving.slice(0, 6).join(", ")}`);
    await settle(page);
    const moving = await page.evaluate(() => document.getAnimations().length);
    check(moving === 0, `${label}: ${moving} animations once the page has been scrolled through`);
    await page.screenshot({ path: `${outDir}/still-${route.name}-${viewport.width}.png`, fullPage: true });
    await page.close();
  }
  await context.close();
}

/**
 * The theme chosen on the site wins over the device's (docs/DESIGN.md §1.3):
 * Day on a device in dark mode, and Evening on one in light mode. Every page
 * takes the chosen theme's colours, and no art of the other theme shows (the
 * stage's layers, the drawings and the game's plans come in .for-day and
 * .for-evening twins). Saved as {theme}-on-{device}-{page}.png.
 */
async function chosenTheme(browser: Browser, routes: readonly Route[]) {
  for (const [theme, device] of [["light", "dark"], ["dark", "light"]] as const) {
    const { context, page: first } = await open(browser, viewports[1], device, { theme, still: true, skipSplash: true });
    await first.close();
    const [r, g, b] = [1, 3, 5].map((k) => parseInt(themeColor[theme].slice(k, k + 2), 16));
    for (const route of routes) {
      const page = await context.newPage();
      const label = `${route.path} (${theme === "light" ? "Day" : "Evening"} chosen, device ${device})`;
      await page.goto(base + route.path, { waitUntil: "networkidle" });
      await settle(page);
      const found = await page.evaluate((other) => ({
        page: getComputedStyle(document.body).backgroundColor,
        wrong: [...document.querySelectorAll(other)]
          .filter((element) => element.checkVisibility())
          .map((element) => element.getAttribute("src") ?? element.getAttribute("href") ?? element.tagName.toLowerCase()),
      }), theme === "light" ? ".for-evening" : ".for-day");
      check(found.page === `rgb(${r}, ${g}, ${b})`, `${label}: the page is ${found.page}, not ${themeColor[theme]}`);
      check(found.wrong.length === 0, `${label}: the other theme's art shows: ${found.wrong.slice(0, 4).join(", ")}`);
      await page.screenshot({ path: `${outDir}/${theme}-on-${device}-${route.name}.png`, fullPage: true });
      await page.close();
    }
    await context.close();
  }
}

async function files(context: BrowserContext) {
  // The same paths with or without online booking.
  const allPages = sitePages(false);
  const expectations = [
    { path: "/robots.txt", type: "text/plain", contains: "Sitemap:" },
    { path: "/sitemap.xml", type: "xml", contains: "<lastmod>" },
    { path: "/llms.txt", type: "text/plain", contains: "# House of Jars" },
    { path: "/llms-full.txt", type: "text/plain", contains: "## Questions and answers" },
    { path: "/icon.svg", type: "image/svg+xml" },
    { path: "/apple-icon", type: "image/png" },
    { path: "/logo.png", type: "image/png" },
    ...allPages.map((page) => ({
      path: `${page.path === "/" ? "" : page.path}/opengraph-image`,
      type: "image/png",
    })),
  ];
  for (const { path, type, contains } of expectations as { path: string; type: string; contains?: string }[]) {
    const response = await context.request.get(base + path);
    const ok =
      response.status() === 200 &&
      (response.headers()["content-type"] ?? "").includes(type) &&
      (!contains || (await response.text()).includes(contains));
    check(ok, `${path}: HTTP ${response.status()} ${response.headers()["content-type"]}`);
  }

  const sitemap = await (await context.request.get(`${base}/sitemap.xml`)).text();
  for (const page of allPages) {
    const url = new URL(page.path, `${siteUrl}/`).toString();
    check(sitemap.includes(`<loc>${url}</loc>`), `sitemap.xml: no ${url}`);
  }

  // Served once INDEXNOW_KEY is set on the server; until then, not found.
  const key = await context.request.get(`${base}/indexnow-key.txt`);
  const keyText = (await key.text()).trim();
  check(
    key.status() === 404 || (key.status() === 200 && /^[A-Za-z0-9-]{8,128}$/.test(keyText)),
    `/indexnow-key.txt: HTTP ${key.status()} "${keyText.slice(0, 40)}"`,
  );
}

/** Security headers on pages, files and images, and the API routes refusing requests from other sites. */
async function security(context: BrowserContext) {
  for (const path of ["/", "/book", "/robots.txt", "/opengraph-image"]) {
    const headers = (await context.request.get(base + path)).headers();
    const csp = headers["content-security-policy"] ?? "";
    for (const directive of ["default-src 'self'", "connect-src 'self'", "object-src 'none'", "frame-ancestors 'none'"]) {
      check(csp.includes(directive), `${path}: Content-Security-Policy lacks ${directive}`);
    }
    check((headers["strict-transport-security"] ?? "").startsWith("max-age="), `${path}: no Strict-Transport-Security`);
    check(headers["x-content-type-options"] === "nosniff", `${path}: no X-Content-Type-Options`);
  }
  const crossSiteLookup = await context.request.get(`${base}/api/availability?check_in=2030-01-01&check_out=2030-01-02&guests=1`, {
    headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
  });
  check(crossSiteLookup.status() === 403, `/api/availability: a cross-site GET got ${crossSiteLookup.status()}, expected 403`);
  for (const api of ["/api/inquiry", "/api/booking", "/api/concierge", "/api/concierge/send"]) {
    const crossSite = await context.request.post(base + api, {
      data: {},
      headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
    });
    check(crossSite.status() === 403, `${api}: a cross-site POST got ${crossSite.status()}, expected 403`);
    const simple = await context.request.post(base + api, { data: "{}", headers: { "content-type": "text/plain" } });
    check(simple.status() === 415, `${api}: a text/plain POST got ${simple.status()}, expected 415`);
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const fake = fakeShadowPort
    ? await startFakeShadow({ port: fakeShadowPort, key: process.env.SHADOW_INQUIRY_KEY || FAKE_SHADOW_KEY })
    : null;
  const browser = await chromium.launch({ executablePath });
  try {
    const context = await browser.newContext();
    await files(context);
    await security(context);
    await budgets(context);
    const mode = await bookingMode(context, fake);
    console.log(
      {
        off: "Online booking: off (no Shadow Check-in), checking the booking sites and the team's contact details.",
        fake: `Online booking: on, against the fake Shadow Check-in at ${fake?.url}.`,
        live: "Online booking: on, against a real Shadow Check-in, so nothing is booked or sent.",
      }[mode],
    );
    await context.close();

    const routes = routesFor(mode !== "off");
    for (const route of routes) {
      for (const viewport of viewports) {
        for (const scheme of schemes) await visit(browser, route, viewport, scheme);
      }
    }
    // The acceptance shots and checks (docs/DESIGN.md §1).
    for (const viewport of [...viewports, laptop]) {
      for (const scheme of schemes) await hero(browser, viewport, scheme);
    }
    for (const viewport of viewports) {
      for (const scheme of schemes) await theatre(browser, viewport, scheme);
    }
    for (const viewport of viewports) await stillPages(browser, routes, viewport);
    await chosenTheme(browser, routes);
    await skipLink(browser);
    await bookingLink(browser, mode);
    await concierge(browser, viewports[0], "light");
    await concierge(browser, viewports[1], "dark");
    await bookingPages(browser, mode);
    await bookingSoftNavigation(browser, mode, fake);
    // Shadow has check_availability only when the site takes bookings online.
    if (mode !== "off") {
      let offset = 80;
      for (const viewport of viewports) {
        for (const scheme of schemes) await conciergeCard(browser, viewport, scheme, (offset += 3));
      }
    }
    if (mode === "fake" && fake) {
      await bookingWalk(browser, viewports[0], "light", fake, 10);
      await bookingWalk(browser, viewports[1], "light", fake, 12);
      await bookingWalk(browser, viewports[0], "dark", fake, 14);
      await bookingTaken(browser, fake);
      await bookingPriceChange(browser, fake);
      await bookingClosedAndBusy(browser, fake);
    }
    for (const viewport of viewports) await bookingForm(browser, viewport, mode, fake);
  } finally {
    await browser.close();
    await fake?.close();
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} of ${checks} checks failed:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`All ${checks} checks passed against ${base}. Screenshots are in ./${outDir}.`);
}

await main();
