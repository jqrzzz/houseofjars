/**
 * Makes the café menu card's two PDFs from the card the menu page draws (MenuFace, components/menu/MenuFaces.tsx,
 * in medium "print"), in Chromium, with no server, no route and no new dependency, and holds them to the card:
 *
 *   npm run menu:pdf                    # both editions: build, check, then write public/menu/ and the review sheets
 *   npm run menu:pdf -- --only shop     # one edition: office or shop
 *   npm run menu:pdf -- --check         # build and check the same way, then compare with the committed files
 *
 * The editions are lib/menu/print-spec.ts's: the office one (A4, front and back, the orange inside a white mat) and
 * the print shop's (A4 with 3 mm of bleed, its TrimBox and BleedBox set). For each, it:
 *
 * 1. renders the card's page (scripts/menu-pdf/page.ts) and opens it from a string in a fresh Chromium context,
 *    where any request but a data: URL, any console error and any page error fails the run, and shows it once
 *    every node is numbered, so the tagged PDF's names for them are the same in every build;
 * 2. waits for the static Figtree at 400 to 700, turns to print media and runs the page's checks (checks.ts);
 * 3. prints it (tagged, with an outline) and finishes it (finish.ts): the menu's date, the print shop's boxes, and
 *    an Info whose Keywords carry the fingerprint of the card's sources (fingerprint.ts);
 * 4. checks the PDF from its bytes (pdf-checks.ts), then its pixels in Chromium's own PDF viewer (raster.ts);
 * 5. builds it again in a fresh context, which must give the same bytes.
 *
 * Only when everything passes does it write the files to public/menu/ (Next serves them as they are at
 * /menu/<file>) and the review sheets to film-frames/menu/ (each page at 150 dpi, and compare.png: the new card
 * beside the team's photographs of today's), then print one line per file. Otherwise it exits 1, listing every
 * problem as "menu:pdf: <edition> page <n>: <problem>", and leaves the build in a temporary folder to look at.
 *
 * --check writes nothing to public/: the committed files must carry today's fingerprint, and the same bytes when
 * the same Chromium made them (another Chromium makes other bytes from the same card, which it only warns about).
 *
 * Settings: CHROMIUM_PATH (default /opt/pw-browsers/chromium), a full Chromium or Chrome: the headless shell has
 * no PDF viewer. Chromium runs with TZ=UTC, so the dates it writes are as long as the menu's.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { chromium, type Browser } from "playwright-core";
import { menu } from "../content/menu";
import { EDITION_LIST, EDITIONS, FACTS_PREFIX, type Edition, type EditionSpec } from "../lib/menu/print-spec";
import { pageProblems } from "./menu-pdf/checks";
import { finishPdf } from "./menu-pdf/finish";
import { menuFingerprint } from "./menu-pdf/fingerprint";
import { cardPage, PRINT_FAMILY, PRINT_WEIGHTS } from "./menu-pdf/page";
import { readPdf } from "./menu-pdf/pdf";
import { pdfFingerprint, pdfProblems } from "./menu-pdf/pdf-checks";
import { compareSheet, rasterise } from "./menu-pdf/raster";

// The card's components import their CSS Modules: hand them class maps (scripts/social/css-hook.mjs). page.ts
// imports them only when it builds its first page, after this.
register("./social/css-hook.mjs", import.meta.url);

const executablePath = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const root = process.cwd();
const PUBLIC = join(root, "public/menu");
const REVIEW = join(root, "film-frames/menu");
const RUN_AGAIN = "Run npm run menu:pdf and commit public/menu/.";

interface Problem {
  readonly edition: Edition;
  readonly page?: number;
  readonly text: string;
}

function args(): { editions: readonly EditionSpec[]; check: boolean } {
  const list = process.argv.slice(2);
  const only = list.includes("--only") ? list[list.indexOf("--only") + 1] : undefined;
  const unknown = list.filter((a, i) => a !== "--check" && a !== "--only" && list[i - 1] !== "--only");
  if (unknown.length || (list.includes("--only") && !(only === "office" || only === "shop"))) {
    throw new Error(`Usage: npm run menu:pdf [-- --only office|shop] [-- --check]${unknown.length ? ` (not ${unknown.join(" ")})` : ""}`);
  }
  return { editions: only ? [EDITIONS[only as Edition]] : EDITION_LIST, check: list.includes("--check") };
}

const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const pt = (value: number) => Number(value.toFixed(2));

/**
 * Prints the card's page in a fresh context: from a string, every request but a data: URL refused, the fonts
 * loaded, in print media. With `check`, the page's own checks run first.
 */
async function print(browser: Browser, html: string, edition: Edition, check: boolean): Promise<{ pdf: Buffer; problems: Omit<Problem, "edition">[] }> {
  const context = await browser.newContext({ viewport: { width: 1000, height: 1200 } });
  const errors: string[] = [];
  try {
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console error: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`page error: ${error.message}`));
    await page.route("**/*", (route) => {
      errors.push(`the page asked for ${route.request().url()}: it may ask for nothing but data: URLs.`);
      return route.abort();
    });
    await page.setContent(html, { waitUntil: "load" });
    // Every node numbered in document order while the body is still hidden (page.ts), then the card shown.
    const cdp = await context.newCDPSession(page);
    await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
    await cdp.detach();
    await page.evaluate("document.body.hidden = false");
    await page.evaluate(`Promise.all(${JSON.stringify(PRINT_WEIGHTS)}.map((w) => document.fonts.load(w + ' 16px "${PRINT_FAMILY}"'))).then(() => document.fonts.ready)`);
    await page.emulateMedia({ media: "print" });
    const problems = check ? await pageProblems(page, edition, root) : [];
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    return { pdf, problems: [...errors.map((text) => ({ text })), ...problems] };
  } finally {
    await context.close();
  }
}

/** One line for a written file: its pages, boxes, fonts, size, sha256 and fingerprint. */
function summary(spec: EditionSpec, bytes: Buffer): string {
  const pdf = readPdf(bytes);
  const boxes = pdf.pages[0]?.boxes ?? {};
  const size = (box?: number[]) => (box ? `${pt(box[2]! - box[0]!)} × ${pt(box[3]! - box[1]!)} pt` : "none");
  const fonts = [...new Set(pdf.pages.flatMap((page) => page.fonts.map((font) => font.baseFont.replace(/^[A-Z]{6}\+/, ""))))].sort();
  return [
    `menu:pdf: ${spec.edition} public/menu/${spec.file}:`,
    `${pdf.pages.length} pages,`,
    `MediaBox ${size(boxes.MediaBox)},`,
    `TrimBox ${boxes.TrimBox ? `${size(boxes.TrimBox)} [${boxes.TrimBox.join(" ")}]` : "none"},`,
    `fonts ${fonts.join(", ")},`,
    `${bytes.length.toLocaleString("en-US")} bytes,`,
    `sha256 ${sha(bytes)},`,
    `${pdf.info.Keywords?.slice(0, FACTS_PREFIX.length + 12) ?? "no fingerprint"}`,
  ].join(" ");
}

async function main() {
  const { editions, check } = args();
  if (!existsSync(executablePath)) throw new Error(`Chromium not found at ${executablePath}: set CHROMIUM_PATH to a full Chromium or Chrome`);
  const fingerprint = menuFingerprint(root);
  const work = mkdtempSync(join(tmpdir(), "menu-pdf-"));
  const problems: Problem[] = [];
  const warnings: string[] = [];
  const built: { spec: EditionSpec; bytes: Buffer; pages: string[] }[] = [];
  const browser = await chromium.launch({ executablePath, env: { ...process.env, TZ: "UTC" } });
  try {
    for (const spec of editions) {
      const { edition } = spec;
      const report = (list: readonly { page?: number; text: string }[]) => problems.push(...list.map((p) => ({ edition, ...p })));
      const html = await cardPage(edition);
      writeFileSync(join(work, `${edition}.html`), html);
      const finish = (pdf: Buffer) => finishPdf(pdf, { edition, date: menu.asOf.value, fingerprint });

      const first = await print(browser, html, edition, true);
      report(first.problems);
      const bytes = finish(first.pdf);
      writeFileSync(join(work, spec.file), bytes);
      report(pdfProblems(bytes, edition));
      const raster = await rasterise(browser, bytes, edition, work);
      report(raster.problems);

      // The same card, printed again from scratch, must come out byte for byte the same.
      const again = finish((await print(browser, html, edition, false)).pdf);
      if (!again.equals(bytes)) {
        writeFileSync(join(work, `again-${spec.file}`), again);
        report([{ text: `a second build came out differently (sha256 ${sha(again).slice(0, 12)}, not ${sha(bytes).slice(0, 12)}): the PDF isn't deterministic.` }]);
      }

      if (check) {
        const committed = join(PUBLIC, spec.file);
        if (!existsSync(committed)) report([{ text: `public/menu/${spec.file} is missing. ${RUN_AGAIN}` }]);
        else {
          const old = readFileSync(committed);
          const theirs = pdfFingerprint(old);
          if (theirs !== fingerprint) {
            report([{ text: `public/menu/${spec.file} was built from other card sources (${FACTS_PREFIX}${theirs?.slice(0, 12) ?? "none"} in the file, ${fingerprint.slice(0, 12)} now). ${RUN_AGAIN}` }]);
          }
          if (!old.equals(bytes)) {
            const [was, now] = [readPdf(old).info.Producer, readPdf(bytes).info.Producer];
            if (was === now) report([{ text: `public/menu/${spec.file} isn't what ${now} makes of today's card: its bytes differ from a fresh build. ${RUN_AGAIN}` }]);
            else warnings.push(`menu:pdf: ${edition}: public/menu/${spec.file} was made by ${was ?? "an unknown producer"}, and this Chromium is ${now}: its bytes differ, its card is the same.`);
          }
        }
      }
      built.push({ spec, bytes, pages: raster.pages });
    }
  } finally {
    await browser.close();
  }

  for (const warning of warnings) console.warn(warning);
  if (problems.length) {
    for (const p of problems) console.error(`menu:pdf: ${p.edition}${p.page ? ` page ${p.page}` : ""}: ${p.text}`);
    console.error(`menu:pdf: ${problems.length} problem${problems.length === 1 ? "" : "s"}; nothing written. This build is in ${work}.`);
    process.exit(1);
  }

  mkdirSync(REVIEW, { recursive: true });
  for (const { spec, bytes, pages } of built) {
    if (!check) {
      mkdirSync(PUBLIC, { recursive: true });
      writeFileSync(join(PUBLIC, spec.file), bytes);
    }
    for (const page of pages) copyFileSync(page, join(REVIEW, basename(page)));
    console.log(summary(spec, bytes));
  }
  const office = built.find(({ spec }) => spec.edition === "office");
  if (office) await compareSheet(office.pages[0]!, office.pages[1]!, join(REVIEW, "compare.png"), root);
  rmSync(work, { recursive: true, force: true });
  console.log(`menu:pdf: ${check ? "checked against public/menu/; nothing written there" : "wrote public/menu/"}; review sheets in film-frames/menu/.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
