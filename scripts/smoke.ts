/**
 * Smoke test against a running production build:
 *
 *   npm run build && npm run start -- -p 3000     # in one terminal
 *   BASE_URL=http://localhost:3000 npm run smoke  # in another
 *
 * Visits every page on a phone (390 x 844) and a desktop (1440 x 900), in
 * light and dark, and checks the HTTP status, console errors, exactly one
 * h1, JSON-LD that parses, canonical and Open Graph tags, and sideways
 * scrolling, plus the security headers and that the API routes refuse
 * cross-site posts. Then it opens Shadow's window and tries the booking form.
 * Without API keys both must fall back to the team's contact details; if
 * Shadow Check-in is configured, the form is not submitted (no test
 * inquiries reach the team). Screenshots are saved to ./screenshots.
 *
 * Uses the Chromium at CHROMIUM_PATH (default /opt/pw-browsers/chromium)
 * and never downloads a browser.
 */
import { mkdir } from "node:fs/promises";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { pages, siteUrl } from "../lib/site";

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const executablePath = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const outDir = "screenshots";

const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const;
type Viewport = (typeof viewports)[number];
const schemes = ["light", "dark"] as const;
type Scheme = (typeof schemes)[number];

const routes = [
  ...Object.entries(pages).map(([name, page]) => ({ name, path: page.path, status: 200 })),
  { name: "not-found", path: "/this-page-does-not-exist", status: 404 },
];

const failures: string[] = [];
let checks = 0;
function check(ok: boolean, label: string) {
  checks++;
  if (!ok) failures.push(label);
}

const trimSlash = (url: string | null) => url?.replace(/\/+$/, "") ?? null;

/** Opens a page and records console errors, except responses the test expects (e.g. a 503 from an API). */
async function open(browser: Browser, viewport: Viewport, scheme: Scheme) {
  const context = await browser.newContext({ viewport, colorScheme: scheme });
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
  check(
    found.jsonLd.length > 0 &&
      found.jsonLd.every((text) => {
        try {
          return typeof JSON.parse(text) === "object";
        } catch {
          return false;
        }
      }),
    `${label}: JSON-LD missing or invalid`,
  );
  check(found.overflow <= 0, `${label}: scrolls sideways by ${found.overflow}px`);
  if (route.status === 200) {
    const expected = trimSlash(new URL(route.path, `${siteUrl}/`).toString());
    check(trimSlash(found.canonical) === expected, `${label}: canonical ${found.canonical}, expected ${expected}`);
    check(Boolean(found.ogImage), `${label}: no og:image`);
  }

  await page.screenshot({ path: `${outDir}/${route.name}-${viewport.width}-${scheme}.png`, fullPage: true });
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

async function bookingForm(browser: Browser, viewport: Viewport) {
  const { context, page, errors } = await open(browser, viewport, "light");
  const label = `booking form (${viewport.name})`;
  const probe = await page.request.post(`${base}/api/inquiry`, { data: {} });
  if (probe.status() !== 503) {
    console.log(`${label}: Shadow Check-in is configured, so the form is not submitted.`);
    await context.close();
    return;
  }

  await page.goto(`${base}/book`, { waitUntil: "networkidle" });
  await page.getByLabel("Your name").fill("Smoke Test");
  await page.getByLabel("Email").fill("smoke@example.com");
  await page.getByLabel("Your message").fill("Checking the form works.");
  await page.getByLabel(/I agree to the privacy notice/).check();
  await page.getByRole("button", { name: "Send message" }).click();
  const problem = page.getByRole("alert").filter({ hasText: "contact the team directly" });
  await problem.waitFor({ state: "visible" });
  check(await problem.getByText("Open WhatsApp").isVisible(), `${label}: no contact details after a failed send`);
  await problem.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${outDir}/book-form-unavailable-${viewport.width}.png` });
  const unexpected = errors.filter((error) => !error.includes("503"));
  check(unexpected.length === 0, `${label}: console errors: ${unexpected.join(" | ")}`);
  await context.close();
}

async function files(context: BrowserContext) {
  const expectations = [
    { path: "/robots.txt", type: "text/plain", contains: "Sitemap:" },
    { path: "/sitemap.xml", type: "xml", contains: "<urlset" },
    { path: "/llms.txt", type: "text/plain", contains: "# House of Jars" },
    { path: "/icon.svg", type: "image/svg+xml" },
    { path: "/apple-icon", type: "image/png" },
    ...Object.values(pages).map((page) => ({
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
  for (const api of ["/api/inquiry", "/api/concierge", "/api/concierge/send"]) {
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
  const browser = await chromium.launch({ executablePath });
  try {
    const context = await browser.newContext();
    await files(context);
    await security(context);
    await context.close();

    for (const route of routes) {
      for (const viewport of viewports) {
        for (const scheme of schemes) await visit(browser, route, viewport, scheme);
      }
    }
    await skipLink(browser);
    await concierge(browser, viewports[0], "light");
    await concierge(browser, viewports[1], "dark");
    for (const viewport of viewports) await bookingForm(browser, viewport);
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} of ${checks} checks failed:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`All ${checks} checks passed against ${base}. Screenshots are in ./${outDir}.`);
}

await main();
