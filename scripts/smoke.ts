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
 * dates and guests, and tries the booking form. Without API keys Shadow and
 * the form must fall back to the team's contact details, and /book must offer
 * only the booking sites and the message form. Against the fake Shadow
 * Check-in it walks online booking on a phone and a desktop (dates by
 * keyboard, beds, details, review, confirmation), then beds taken while
 * booking (409), booking closed (503) and a busy line (429), and sends the
 * message form. Against a real Shadow Check-in nothing is sent (no test
 * bookings or inquiries reach the team). Screenshots are saved to
 * ./screenshots.
 *
 * Uses the Chromium at CHROMIUM_PATH (default /opt/pw-browsers/chromium)
 * and never downloads a browser.
 */
import { mkdir } from "node:fs/promises";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { content } from "../content";
import { isFirm } from "../content/certainty";
import { addDays, houseToday } from "../lib/dates";
import { dateWindow } from "../lib/inquiry/dates";
import { collectFacts, factsMentionedIn } from "../lib/content-audit";
import { allPages, metaTitle } from "../lib/pages";
import { siteUrl } from "../lib/site";
import { FAKE_ROOMS, FAKE_SHADOW_KEY, startFakeShadow, type FakeShadow } from "../test/fake-shadow";
import { typesOf, isA, validateJsonLd } from "../test/schema-org";

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const executablePath = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const outDir = "screenshots";
const fakeShadowPort = process.env.FAKE_SHADOW_PORT ? Number(process.env.FAKE_SHADOW_PORT) : null;

const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const;
type Viewport = (typeof viewports)[number];
const schemes = ["light", "dark"] as const;
type Scheme = (typeof schemes)[number];

const routes = [
  ...allPages.map((page) => ({
    name: page.path === "/" ? "home" : page.path.slice(1).replaceAll("/", "-"),
    path: page.path,
    title: metaTitle(page),
    status: 200,
  })),
  { name: "not-found", path: "/this-page-does-not-exist", title: null, status: 404 },
];

const softFacts = collectFacts(content, "content").filter((found) => !isFirm(found.fact));

const failures: string[] = [];
let checks = 0;
function check(ok: boolean, label: string) {
  checks++;
  if (!ok) failures.push(label);
}

const trimSlash = (url: string | null) => url?.replace(/\/+$/, "") ?? null;

let visitor = 0;

/**
 * Opens a page and records console errors, except responses the test expects
 * (e.g. a 503 from an API). Each visitor comes from its own address (the site
 * reads X-Forwarded-For when no proxy sets it), so the site's limits per
 * client apply to each walk on its own.
 */
async function open(browser: Browser, viewport: Viewport, scheme: Scheme) {
  visitor += 1;
  const context = await browser.newContext({
    viewport,
    colorScheme: scheme,
    extraHTTPHeaders: { "x-forwarded-for": `198.51.${100 + Math.floor(visitor / 250)}.${visitor % 250}` },
  });
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

async function visit(browser: Browser, route: (typeof routes)[number], viewport: Viewport, scheme: Scheme) {
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
  }));

  // The browser logs the 404 response of the not-found page itself.
  const unexpected = errors.filter((error) => !(route.status === 404 && error.includes("404")));
  check(unexpected.length === 0, `${label}: console errors: ${unexpected.join(" | ")}`);
  check(found.h1 === 1, `${label}: ${found.h1} h1 elements, expected 1`);
  check(found.overflow <= 0, `${label}: scrolls sideways by ${found.overflow}px`);
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

/** A /book link fills in the message form, as llms.txt tells assistants; the form is named for them. */
async function bookingLink(browser: Browser) {
  const { context, page, errors } = await open(browser, viewports[0], "light");
  const { earliest } = dateWindow();
  const day = (offset: number) => new Date(Date.parse(`${earliest}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
  const [checkIn, checkOut] = [day(10), day(13)];
  await page.goto(`${base}/book?check_in=${checkIn}&check_out=${checkOut}&guests=2#message`, { waitUntil: "networkidle" });
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

/** The message form: sent to the fake Shadow Check-in, or its fallback without one; never sent to a real one. */
async function bookingForm(browser: Browser, viewport: Viewport, mode: BookingMode, fake: FakeShadow | null) {
  const { context, page, errors } = await open(browser, viewport, "light");
  const label = `message form (${viewport.name})`;
  if (mode === "live") {
    console.log(`${label}: Shadow Check-in is configured, so the form is not submitted.`);
    await context.close();
    return;
  }

  await page.goto(`${base}/book`, { waitUntil: "networkidle" });
  const form = page.getByRole("form", { name: "Send the team a message" });
  await form.getByLabel("Your name").fill("Smoke Test");
  await form.getByRole("textbox", { name: "Email" }).fill("smoke@example.com");
  await form.getByLabel("Your message").fill("Checking the form works.");
  await form.getByLabel(/I agree to the privacy notice/).check();
  const sent = fake?.inquiries.size ?? 0;
  await form.getByRole("button", { name: "Send message" }).click();
  if (mode === "fake") {
    await page.getByText("Your message is with the team").waitFor();
    check(fake?.inquiries.size === sent + 1, `${label}: the fake Shadow Check-in received ${(fake?.inquiries.size ?? 0) - sent} inquiries, expected 1`);
  } else {
    const problem = page.getByRole("alert").filter({ hasText: "contact the team directly" });
    await problem.waitFor({ state: "visible" });
    check(await problem.getByText("Open WhatsApp").isVisible(), `${label}: no contact details after a failed send`);
    await problem.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${outDir}/book-form-unavailable-${viewport.width}.png` });
  }
  const unexpected = errors.filter((error) => !(mode === "off" && error.includes("503")));
  check(unexpected.length === 0, `${label}: console errors: ${unexpected.join(" | ")}`);
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
    check(!online && h1 === "Prices and booking", `/book without Shadow Check-in: online booking ${online ? "shown" : "hidden"}, h1 "${h1}"`);
  } else {
    check(
      online && h1 === "Book a bed",
      `/book with Shadow Check-in: online booking ${online ? "shown" : "missing: was the site built with SHADOW_API_URL and SHADOW_INQUIRY_KEY?"}, h1 "${h1}"`,
    );
  }
  for (const site of ["Booking.com", "Agoda"]) {
    check(await page.locator("#online").getByRole("link", { name: new RegExp(`^${site}`) }).isVisible(), `/book: no ${site} link`);
  }
  check(await page.getByRole("form", { name: "Send the team a message" }).isVisible(), "/book: no message form");

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const card = page.locator('form[aria-labelledby="booking-card-title"]');
  const [action, button] = [await card.getAttribute("action"), (await card.getByRole("button").textContent())?.trim()];
  const expected = mode === "off" ? ["/book#message", "Ask the team"] : ["/book", "See free beds"];
  check(action === expected[0] && button === expected[1], `booking card: "${button}" to ${action}, expected "${expected[1]}" to ${expected[0]}`);
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
  await shot("1-dates");
  await flow.getByRole("button", { name: "See free beds" }).click();

  await flow.getByRole("heading", { name: "Choose your beds" }).waitFor();
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

async function files(context: BrowserContext) {
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
    const mode = await bookingMode(context, fake);
    console.log(
      {
        off: "Online booking: off (no Shadow Check-in), checking the message form's fallback.",
        fake: `Online booking: on, against the fake Shadow Check-in at ${fake?.url}.`,
        live: "Online booking: on, against a real Shadow Check-in, so nothing is booked or sent.",
      }[mode],
    );
    await context.close();

    for (const route of routes) {
      for (const viewport of viewports) {
        for (const scheme of schemes) await visit(browser, route, viewport, scheme);
      }
    }
    await skipLink(browser);
    await bookingLink(browser);
    await concierge(browser, viewports[0], "light");
    await concierge(browser, viewports[1], "dark");
    await bookingPages(browser, mode);
    if (mode === "fake" && fake) {
      await bookingWalk(browser, viewports[0], "light", fake, 10);
      await bookingWalk(browser, viewports[1], "light", fake, 12);
      await bookingWalk(browser, viewports[0], "dark", fake, 14);
      await bookingTaken(browser, fake);
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
