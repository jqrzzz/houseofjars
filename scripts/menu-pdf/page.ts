/**
 * The printed menu card as one page of HTML, for the print engine (npm run
 * menu:pdf): the two sides the menu page draws (MenuFace,
 * components/menu/MenuFaces.tsx), in medium "print", front then back, so the
 * PDFs show exactly the words and prices the page shows. Chromium prints it
 * from a string (page.setContent): it asks for nothing, so no server and no
 * route are needed, and the engine blocks every request but a data: URL.
 *
 * Inside: the site's Day tokens and its .visually-hidden rule, read from
 * app/globals.css; the static Figtree files at 400, 500, 600 and 700 as data:
 * URLs, named "Figtree Print" and set as both --font-brand and --font-lao (the
 * face's font stack names both, and with either missing the whole stack would
 * fail and the words would fall back to a serif); the page's size; a reset that
 * matches the site's own where it reaches the card; and the faces' CSS Modules.
 * The static files embed in the PDF as real CIDFontType2 subsets, where the
 * site's variable Figtree would print as Type 3.
 *
 * The body starts hidden, and the engine shows it once Chromium has numbered
 * every node in document order (scripts/menu-pdf.ts). The tagged PDF names the
 * table's header cells by those numbers, and painting numbers some nodes early,
 * at moments that vary from run to run: numbered before anything is painted,
 * the same card always makes the same bytes.
 *
 * The components import their CSS Modules, so they are imported only when the
 * first page is built, once scripts/menu-pdf.ts has registered the hook that
 * hands them their class maps (scripts/social/css-hook.mjs).
 */
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { EDITIONS, PDF_TITLE, type Edition } from "../../lib/menu/print-spec";
import { scopeCssModule } from "../social/css-modules";
import { readTokens } from "../social/theatre";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

/** The card's typeface in print: the static Figtree files, under a name of their own so nothing else can stand in. */
export const PRINT_FAMILY = "Figtree Print";

/** The weights the card uses, and nothing else: each is its own file, embedded as its own subset. */
export const PRINT_WEIGHTS = [400, 500, 600, 700] as const;

/** A static Figtree file, Latin subset, as @fontsource ships it. */
export const printFontFile = (weight: (typeof PRINT_WEIGHTS)[number]) => `node_modules/@fontsource/figtree/files/figtree-latin-${weight}-normal.woff2`;

/** The stylesheets that draw the card: its look in both media, then its paper and print sizes. */
const MODULES = ["components/menu/MenuFaces.module.css", "components/menu/MenuSheet.module.css"];

/**
 * A CSS Module scoped as Next scopes it (scripts/social/css-modules.ts), its comments dropped first: the scoper
 * reads a comment just before an at-rule as part of a selector, and would leave the rules inside it unscoped
 * (MenuSheet.module.css's @media print, every print value, would then match nothing).
 */
const moduleCss = (path: string) => scopeCssModule(read(path).replace(/\/\*[\s\S]*?\*\//g, ""), basename(path, ".module.css")).css;

/** The declarations inside the first rule written exactly `selector {` at the start of a line. */
function rule(css: string, selector: string): string {
  const start = css.search(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{`, "m"));
  if (start < 0) throw new Error(`app/globals.css has no "${selector} {" rule.`);
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("}", open)).trim();
}

let faces: Promise<string> | undefined;

/** Both sides, with the mark's symbol they draw it from (<use href="#house-mark">), as static markup. */
function markup(): Promise<string> {
  faces ??= (async () => {
    const [{ createElement, Fragment }, { renderToStaticMarkup }, { MarkSymbol }, { MenuFace }] = await Promise.all([
      import("react"),
      import("react-dom/server"),
      import("../../components/brand/Mark"),
      import("../../components/menu/MenuFaces"),
    ]);
    return renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        createElement(MarkSymbol),
        createElement(MenuFace, { side: "front", medium: "print" }),
        createElement(MenuFace, { side: "back", medium: "print" }),
      ),
    );
  })();
  return faces;
}

/** The card's page for one edition: <html data-menu-output> picks the office or the print shop's sheet (MenuSheet.module.css). */
export async function cardPage(edition: Edition): Promise<string> {
  const { pageMm } = EDITIONS[edition];
  const globals = read("app/globals.css");
  const tokens = readTokens(globals)
    .day.map(([name, value]) => `${name}:${value};`)
    .join("");
  const fonts = PRINT_WEIGHTS.map((weight) => {
    const data = readFileSync(join(root, printFontFile(weight))).toString("base64");
    return `@font-face{font-family:"${PRINT_FAMILY}";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:${weight};font-style:normal;font-display:block}`;
  });
  const css = [
    `:root{${tokens}--font-brand:"${PRINT_FAMILY}";--font-lao:"${PRINT_FAMILY}"}`,
    ...fonts,
    `@page{size:${pageMm.width}mm ${pageMm.height}mm;margin:0}`,
    // The site's reset (app/globals.css), where it reaches the card.
    "*,*::before,*::after{box-sizing:border-box}",
    "html,body{margin:0;padding:0}",
    "body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}",
    "h2,h3,p,ul{margin:0}",
    "p,li{text-wrap:pretty}",
    "svg{display:block;max-width:100%}",
    `.visually-hidden{${rule(globals, ".visually-hidden")}}`,
    ...MODULES.map(moduleCss),
  ].join("\n");
  return [
    "<!doctype html>",
    `<html lang="en-GB" data-menu-output="${edition}">`,
    `<head><meta charset="utf-8"><title>${PDF_TITLE}</title><style>\n${css}\n</style></head>`,
    `<body hidden>${await markup()}</body>`,
    "</html>",
  ].join("\n");
}
