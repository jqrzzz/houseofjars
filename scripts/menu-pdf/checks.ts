import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "playwright-core";
import { kip } from "../../content/menu";
import { mappedCharacters, woff2Tables } from "../../lib/fonts/woff2";
import { cardPrices, cardText, menuCard, type Side } from "../../lib/menu/card";
import { EDITIONS, SAFE_MM, type Edition } from "../../lib/menu/print-spec";
import { PRINT_FAMILY, PRINT_WEIGHTS, printFontFile } from "./page";
import { PALETTE } from "./pdf-checks";

/*
 * The checks the print engine (npm run menu:pdf) runs on the card's page in
 * Chromium, in print media, before it prints: what a PDF can no longer show
 * plainly. The page measures itself (MEASURE, below); the rules are here:
 *
 * a. fonts: the static Figtree at 400 to 700 is the one in use (each weight's
 *    probe measures what Figtree measures, which no fallback does);
 * b. glyphs: Figtree draws every character on the sheets (the kip sign, a thin
 *    space, a tick or an arrow would fall back to another font);
 * c. tabular figures: every digit is as wide as the next in the price style;
 * d. fit: each sheet is its page, nothing overflows, every line sits at least
 *    SAFE_MM inside the trim, and no two lines overlap;
 * e. type: nothing under 10.5 pt, titles at 40 pt and up;
 * f. contrast: 4.5:1 for every word against what is really behind it (3:1 only
 *    for large type), and white on jar orange only at 32 px and up, the title;
 * g. the mark: at least 10 mm tall, white on the front and jar orange on the
 *    back, with no word within a quarter of its width;
 * h. flat: no opacity, filter, mask, gradient, transform or blend inside the
 *    sheets, and no shadow but the board's solid edge, so Chromium writes no
 *    transparency;
 * i. palette: every colour is one of the card's nine;
 * j. facts: each sheet reads, line by line, as cardText() writes it, and its
 *    prices are cardPrices(), so the PDF can only print the menu's own words.
 */

export interface PageProblem {
  /** 1 for the front, 2 for the back; none for the page as a whole. */
  readonly page?: number;
  readonly text: string;
}

/** What the probe line measures in the static Figtree at 64 px, per weight (Chromium 141); the system's fallback measures 923.94, 923.94, 971.16, 971.16. */
const PROBE = { text: "Breakfast, coffee and tea 26,000", px: 64, widths: [942.8, 949.83, 959.11, 969.73], tolerance: 0.5 } as const;

/** Two prices of different digits, equally wide with tabular figures: 67.81 px each at 600 and 20 px. */
const TABULAR = { texts: ["11,111", "88,888"], px: 20, width: 67.81, tolerance: 0.5 } as const;

const PX_PER_MM = 96 / 25.4;
const PX_PER_PT = 96 / 72;

/** What the page reports about itself: each sheet, its lines and prices, its words' boxes and colours, its styles. */
interface Measured {
  readonly fontsReady: boolean[];
  readonly probe: number[];
  readonly tabular: number[];
  readonly sheets: {
    readonly side: Side;
    readonly box: { x: number; y: number; width: number; height: number };
    readonly lines: string[];
    readonly prices: string[];
    readonly characters: string;
    readonly words: { text: string; size: number; weight: number; title: boolean; colour: string; backdrop: string; rects: number[][] }[];
    readonly outside: { what: string; rect: number[] }[];
    readonly mark: { rect: number[]; colour: string } | null;
    readonly styles: { what: string; property: string; value: string }[];
    readonly colours: { what: string; property: string; value: string }[];
  }[];
}

/**
 * Runs in the page (as a string, like scripts/social.ts's page code, so nothing the TypeScript build adds can
 * reach it). The line algorithm is MenuFaces.test.ts's: each h2, h3, p (split at <br>), li and tr is a line,
 * .visually-hidden spans and SVGs are dropped, a row's cells are joined by a space, whitespace collapses.
 */
const MEASURE = String.raw`async ({ family, weights, probe, tabular }) => {
  const hidden = (node) => !!node.parentElement && !!node.parentElement.closest('svg, span[class="visually-hidden"]');
  const css = (el, pseudo) => getComputedStyle(el, pseudo || null);
  const rect = (r) => [r.left, r.top, r.right, r.bottom];
  const alpha = (colour) => { const m = colour.match(/[\d.]+/g) || []; return colour.startsWith("rgba") || colour.includes("/") ? Number(m[3] ?? 1) : m.length ? 1 : 0; };
  const measure = (text, font, extra) => {
    const span = document.createElement("span");
    span.textContent = text;
    span.style.cssText = "position:absolute;left:0;top:0;white-space:nowrap;font:" + font + ";" + (extra || "");
    document.body.append(span);
    const width = span.getBoundingClientRect().width;
    span.remove();
    return width;
  };
  await Promise.all(weights.map((w) => document.fonts.load(w + " 16px \"" + family + "\"")));
  await document.fonts.ready;
  const fontsReady = weights.map((w) => document.fonts.check(w + " 16px \"" + family + "\""));
  const probeWidths = weights.map((w) => measure(probe.text, w + " " + probe.px + "px \"" + family + "\""));
  const price = document.querySelector("[data-price]");
  const priceStyle = price ? css(price) : null;
  const tabularWidths = priceStyle
    ? tabular.texts.map((t) => measure(t, priceStyle.fontWeight + " " + tabular.px + "px " + priceStyle.fontFamily, "font-variant-numeric:" + priceStyle.fontVariantNumeric + ";font-kerning:" + priceStyle.fontKerning))
    : [];

  // What really lies behind a word: the first ancestor's background, or an absolute ::before field that covers it.
  const backdrop = (el, r) => {
    for (let e = el; e; e = e.parentElement) {
      const before = css(e, "::before");
      if (before.content !== "none" && before.position === "absolute" && alpha(before.backgroundColor) > 0) {
        const box = e.getBoundingClientRect();
        const own = css(e);
        const left = box.left + parseFloat(own.borderLeftWidth) + parseFloat(before.left);
        const top = box.top + parseFloat(own.borderTopWidth) + parseFloat(before.top);
        const right = box.right - parseFloat(own.borderRightWidth) - parseFloat(before.right);
        const bottom = box.bottom - parseFloat(own.borderBottomWidth) - parseFloat(before.bottom);
        if (r[0] >= left && r[1] >= top && r[2] <= right && r[3] <= bottom) return before.backgroundColor;
      }
      const bg = css(e).backgroundColor;
      if (alpha(bg) > 0) return bg;
    }
    return "rgb(255, 255, 255)";
  };

  const sheets = [...document.querySelectorAll("article[data-face]")].map((sheet) => {
    const box = sheet.getBoundingClientRect();
    const own = css(sheet);
    const padding = { top: parseFloat(own.paddingTop), right: parseFloat(own.paddingRight), bottom: parseFloat(own.paddingBottom), left: parseFloat(own.paddingLeft) };

    // Lines, as MenuFaces.test.ts and cardText() read them.
    const lines = [];
    const textOf = (node) => {
      let out = "";
      for (const child of node.childNodes) {
        if (child.nodeType === 3) out += child.textContent;
        else if (child.nodeType === 1 && !child.matches('svg, span[class="visually-hidden"]')) {
          if (child.tagName === "BR") out += "\n";
          else if (child.tagName === "TH" || child.tagName === "TD") out += " " + textOf(child);
          else out += textOf(child);
        }
      }
      return out;
    };
    for (const el of sheet.querySelectorAll("h2, h3, p, li, tr")) {
      if (el.parentElement.closest("h2, h3, p, li, tr")) continue;
      for (const part of textOf(el).split("\n")) {
        const line = part.replace(/\s+/g, " ").trim();
        if (line) lines.push(line);
      }
    }

    // Every word on the sheet: its line boxes, size, weight, colour and what is behind it.
    const words = [];
    const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim() || hidden(node)) continue;
      const el = node.parentElement;
      const style = css(el);
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0).map(rect);
      words.push({
        text: node.textContent.trim(),
        size: parseFloat(style.fontSize),
        weight: Number(style.fontWeight),
        title: !!el.closest("h2"),
        colour: style.color,
        backdrop: rects.length ? backdrop(el, rects[0]) : backdrop(el, rect(el.getBoundingClientRect())),
        rects,
      });
    }

    // Boxes outside the content box (the padding is the margin to the trim): a card too long for its page pushes its
    // foot out of it. (The sheet's own scroll size can't tell: the print shop's orange runs past it on purpose.)
    const content = [box.left + padding.left, box.top + padding.top, box.right - padding.right, box.bottom - padding.bottom];
    const outside = [];
    for (const el of sheet.querySelectorAll("*")) {
      if (el.closest('span[class="visually-hidden"]') || (el.closest("svg") && el.tagName.toLowerCase() !== "svg")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.left < content[0] - 0.5 || r.top < content[1] - 0.5 || r.right > content[2] + 0.5 || r.bottom > content[3] + 0.5) {
        outside.push({ what: el.tagName.toLowerCase() + " " + JSON.stringify((el.textContent || "").trim().slice(0, 40)), rect: rect(r) });
      }
    }

    const markEl = sheet.querySelector(":scope > header > svg");
    const mark = markEl ? { rect: rect(markEl.getBoundingClientRect()), colour: css(markEl).color } : null;

    // Styles that would make Chromium write transparency, and every colour, on each element and its ::before and ::after.
    const styles = [];
    const colours = [];
    const board = sheet.querySelector(":scope > div");
    const SHAPES = new Set(["path", "rect", "circle", "ellipse", "polygon", "polyline"]);
    for (const el of [sheet, ...sheet.querySelectorAll("*")]) {
      for (const pseudo of [null, "::before", "::after"]) {
        const s = css(el, pseudo);
        if (pseudo && s.content === "none") continue;
        const classes = (el.getAttribute("class") || "").trim();
        const what = el.tagName.toLowerCase() + (classes ? "." + classes.split(/\s+/).join(".") : "") + (pseudo || "");
        const flat = {
          opacity: s.opacity === "1" ? null : s.opacity,
          "fill-opacity": s.fillOpacity === "1" ? null : s.fillOpacity,
          "stroke-opacity": s.strokeOpacity === "1" ? null : s.strokeOpacity,
          filter: s.filter === "none" ? null : s.filter,
          "backdrop-filter": s.backdropFilter === "none" ? null : s.backdropFilter,
          "mask-image": s.maskImage === "none" || s.maskImage === undefined ? null : s.maskImage,
          "-webkit-mask-image": s.webkitMaskImage === "none" || s.webkitMaskImage === undefined ? null : s.webkitMaskImage,
          "background-image": s.backgroundImage === "none" ? null : s.backgroundImage,
          transform: s.transform === "none" ? null : s.transform,
          translate: s.translate === "none" ? null : s.translate,
          rotate: s.rotate === "none" ? null : s.rotate,
          scale: s.scale === "none" ? null : s.scale,
          "mix-blend-mode": s.mixBlendMode === "normal" ? null : s.mixBlendMode,
          "text-shadow": s.textShadow === "none" ? null : s.textShadow,
          "box-shadow": s.boxShadow === "none" || (el === board && !pseudo && /^rgb\([^)]*\) [\d.]+px [\d.]+px 0px 0px$/.test(s.boxShadow)) ? null : s.boxShadow,
        };
        for (const [property, value] of Object.entries(flat)) if (value !== null) styles.push({ what, property, value });

        const add = (property, value) => { if (value && alpha(value) > 0) colours.push({ what, property, value }); };
        add("color", s.color);
        add("background-color", s.backgroundColor);
        for (const side of ["Top", "Right", "Bottom", "Left"]) if (parseFloat(s["border" + side + "Width"]) > 0 && s["border" + side + "Style"] !== "none") add("border-" + side.toLowerCase() + "-color", s["border" + side + "Color"]);
        if (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) add("outline-color", s.outlineColor);
        if (s.textDecorationLine !== "none") add("text-decoration-color", s.textDecorationColor);
        if (s.boxShadow !== "none") for (const shadow of s.boxShadow.match(/rgba?\([^)]*\)|color\([^)]*\)/g) || []) add("box-shadow", shadow);
        if (!pseudo && SHAPES.has(el.tagName.toLowerCase()) && s.fill !== "none") add("fill", s.fill);
        if (!pseudo && s.stroke !== "none" && parseFloat(s.strokeWidth) > 0) add("stroke", s.stroke);
      }
    }

    return {
      side: sheet.dataset.face,
      box: { x: box.left, y: box.top, width: box.width, height: box.height },
      lines,
      prices: [...sheet.querySelectorAll("[data-price]")].map((el) => el.dataset.price),
      characters: sheet.textContent,
      words,
      outside,
      mark,
      styles,
      colours,
    };
  });
  return { fontsReady, probe: probeWidths, tabular: tabularWidths, sheets };
}`;

/** "rgb(231, 110, 67)", "rgba(…)" or "color(srgb 0.9 0.43 0.26)" as #e76e43. */
export function hex(colour: string): string {
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(colour);
  const parts = srgb ? srgb.slice(1, 4).map((v) => Number(v) * 255) : (colour.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  return `#${parts.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

/** The WCAG contrast ratio of two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const luminance = (colour: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** The characters every static Figtree weight the card uses can draw. */
function figtreeCharacters(root: string): Set<number> {
  const sets = PRINT_WEIGHTS.map((weight) => mappedCharacters(woff2Tables(readFileSync(join(root, printFontFile(weight)))).get("cmap")!));
  return new Set([...sets[0]!].filter((c) => sets.every((set) => set.has(c))));
}

const overlap = (a: number[], b: number[]) => Math.min(a[2]!, b[2]!) - Math.max(a[0]!, b[0]!) > 0.5 && Math.min(a[3]!, b[3]!) - Math.max(a[1]!, b[1]!) > 0.5;

/** Every problem the card's page has in print media, for one edition. The page must have loaded its fonts. */
export async function pageProblems(page: Page, edition: Edition, root = process.cwd()): Promise<PageProblem[]> {
  const measured = (await page.evaluate(`(${MEASURE})(${JSON.stringify({ family: PRINT_FAMILY, weights: PRINT_WEIGHTS, probe: PROBE, tabular: TABULAR })})`)) as Measured;
  const problems: PageProblem[] = [];
  const add = (text: string, sheet?: number) => problems.push(sheet === undefined ? { text } : { page: sheet, text });
  const card = menuCard();

  // a. Fonts.
  PRINT_WEIGHTS.forEach((weight, i) => {
    if (!measured.fontsReady[i]) add(`"${PRINT_FAMILY}" ${weight} isn't loaded (document.fonts.check).`);
    const width = measured.probe[i]!;
    if (Math.abs(width - PROBE.widths[i]!) > PROBE.tolerance) {
      add(`"${PROBE.text}" at ${PROBE.px} px, weight ${weight}, measures ${width.toFixed(2)} px, not ${PROBE.widths[i]} ± ${PROBE.tolerance}: is another font standing in for Figtree?`);
    }
  });
  // c. Tabular figures, in the price style.
  const [ones, eights] = measured.tabular;
  if (ones === undefined || eights === undefined) add("No price on the page to measure the tabular figures by.");
  else if (Math.abs(ones - eights) > 0.01 || Math.abs(ones - TABULAR.width) > TABULAR.tolerance) {
    add(`"${TABULAR.texts[0]}" and "${TABULAR.texts[1]}" measure ${ones.toFixed(2)} and ${eights.toFixed(2)} px in the price style: not tabular figures ${TABULAR.width} px wide.`);
  }

  const sides: Side[] = ["front", "back"];
  if (measured.sheets.map((sheet) => sheet.side).join() !== sides.join()) add(`The sheets are ${measured.sheets.map((sheet) => sheet.side).join(", ") || "missing"}, not front and back.`);
  const glyphs = figtreeCharacters(root);
  const catalogue = new Set([...cardText("front"), ...cardText("back")].join(" ").match(/\d[\d,.:]*\d|\d/g) ?? []);
  const { pageMm, bleedMm } = EDITIONS[edition];
  const safe = SAFE_MM * PX_PER_MM;

  measured.sheets.forEach((sheet, index) => {
    const n = index + 1;
    const side = sides[index] ?? "front";
    const at = (r: number[]) => r.map((v, i) => (v - (i % 2 ? sheet.box.y : sheet.box.x)) / PX_PER_MM).map((v) => v.toFixed(1)).join(", ");

    // b. Glyphs.
    const missing = [...new Set(sheet.characters)].filter((c) => !/\s/.test(c) && !glyphs.has(c.codePointAt(0)!));
    if (missing.length) add(`static Figtree has no glyph for ${missing.map((c) => `"${c}" (U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`).join(", ")}.`, n);

    // d. Fit.
    const [width, height] = [pageMm.width * PX_PER_MM, pageMm.height * PX_PER_MM];
    if (Math.abs(sheet.box.width - width) > 0.5 || Math.abs(sheet.box.height - height) > 0.5) {
      add(`the sheet is ${sheet.box.width.toFixed(2)} × ${sheet.box.height.toFixed(2)} px, not its page's ${width.toFixed(2)} × ${height.toFixed(2)} (${pageMm.width} × ${pageMm.height} mm).`, n);
    }
    for (const { what, rect } of sheet.outside) add(`${what} leaves the sheet's content box (at ${at(rect)} mm): the card no longer fits its page.`, n);
    const trim = [sheet.box.x + bleedMm * PX_PER_MM, sheet.box.y + bleedMm * PX_PER_MM, sheet.box.x + sheet.box.width - bleedMm * PX_PER_MM, sheet.box.y + sheet.box.height - bleedMm * PX_PER_MM];
    const rects = sheet.words.flatMap((word) => word.rects.map((r) => ({ word, r })));
    for (const { word, r } of rects) {
      const gaps = [r[0]! - trim[0]!, r[1]! - trim[1]!, trim[2]! - r[2]!, trim[3]! - r[3]!];
      if (Math.min(...gaps) < safe) add(`"${word.text}" is ${(Math.min(...gaps) / PX_PER_MM).toFixed(1)} mm from the trim, under ${SAFE_MM} mm (at ${at(r)} mm).`, n);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (overlap(rects[i]!.r, rects[j]!.r)) add(`"${rects[i]!.word.text}" and "${rects[j]!.word.text}" overlap (at ${at(rects[i]!.r)} and ${at(rects[j]!.r)} mm).`, n);
      }
    }

    // e. Type, f. contrast.
    for (const word of sheet.words) {
      const pt = word.size / PX_PER_PT;
      if (pt < 10.5 - 1e-6) add(`"${word.text}" is set at ${pt.toFixed(2)} pt, under 10.5.`, n);
      if (word.title && pt < 40 - 1e-6) add(`the title "${word.text}" is set at ${pt.toFixed(2)} pt, under 40.`, n);
      const [fg, bg] = [hex(word.colour), hex(word.backdrop)];
      const ratio = contrast(fg, bg);
      const large = word.size >= 24 || (word.weight >= 700 && word.size >= 18.66);
      if (ratio < (large ? 3 : 4.5)) add(`"${word.text}" (${fg} on ${bg}, ${word.size.toFixed(1)} px, ${word.weight}) has a contrast of ${ratio.toFixed(2)}:1, under ${large ? 3 : 4.5}:1.`, n);
      if (fg === "#ffffff" && bg === "#e76e43" && word.size < 32) add(`"${word.text}" is white on jar orange at ${word.size.toFixed(1)} px: only the title may be, at 32 px and up.`, n);
    }

    // g. The mark.
    if (!sheet.mark) add("the mark is missing.", n);
    else {
      const [x0, y0, x1, y1] = sheet.mark.rect as [number, number, number, number];
      const want = side === "front" ? "#ffffff" : "#e76e43";
      if (y1 - y0 < 10 * PX_PER_MM - 0.5) add(`the mark is ${((y1 - y0) / PX_PER_MM).toFixed(1)} mm tall, under 10.`, n);
      if (hex(sheet.mark.colour) !== want) add(`the mark is ${hex(sheet.mark.colour)}, not ${want}.`, n);
      const clear = (x1 - x0) / 4;
      for (const { word, r } of rects) {
        if (overlap(r, [x0 - clear, y0 - clear, x1 + clear, y1 + clear])) add(`"${word.text}" is within a quarter of the mark's width of it.`, n);
      }
    }

    // h. Flat, i. palette.
    for (const { what, property, value } of sheet.styles) add(`${what} has ${property}: ${value}; the printed card is flat.`, n);
    for (const { what, property, value } of sheet.colours) {
      if (!(PALETTE as readonly string[]).includes(hex(value))) add(`${what} has ${property} ${hex(value)} (${value}), not one of the card's colours.`, n);
    }

    // j. Facts.
    const expected = cardText(side);
    const title = side === "front" ? card.front.title : card.back.title;
    for (let i = 0; i < Math.max(expected.length, sheet.lines.length); i++) {
      if (sheet.lines[i] !== expected[i]) {
        add(`${title}, line ${i + 1} reads ${JSON.stringify(sheet.lines[i] ?? "(nothing)")}, where the card says ${JSON.stringify(expected[i] ?? "(nothing)")}.`, n);
        break;
      }
    }
    const strangers = [...new Set(sheet.lines.join(" ").match(/\d[\d,.:]*\d|\d/g) ?? [])].filter((number) => !catalogue.has(number));
    if (strangers.length) add(`${title} shows ${strangers.join(", ")}, which the menu doesn't have.`, n);
    const prices = sheet.prices.map(Number);
    const want = cardPrices(side);
    if (prices.join() !== want.join()) add(`${title}'s prices are ${prices.map(kip).join(", ")}, not the card's ${want.map(kip).join(", ")}.`, n);
  });
  return problems;
}
