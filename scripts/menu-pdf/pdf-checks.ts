import { cardText, menuCard, type Side } from "../../lib/menu/card";
import { EDITIONS, FACTS_PREFIX, MAX_PDF_BYTES, PDF_AUTHOR, PDF_TITLE, PT_PER_MM, TRIM_MM, type Edition } from "../../lib/menu/print-spec";
import { Name, readPdf, Ref, Stream, type Pdf, type XrefEntry } from "./pdf";

/*
 * What a finished menu PDF must be, read from its bytes alone (pdf.ts), so the
 * print engine (npm run menu:pdf), the CI test on the committed files
 * (menu-pdf.test.ts) and the smoke run all hold it to the same things: two
 * pages of the right size, the print shop's boxes, the static Figtree embedded
 * as real fonts and nothing else, flat solid colour from the card's palette
 * with no image, mask or transparency, the card's own words on each page,
 * tags, a Lang and an outline, the Info the finisher writes, and its size.
 */

export interface PdfProblem {
  /** 1 or 2 for a problem on a page. */
  readonly page?: number;
  /** "text" when a page doesn't say what the card says: the file is out of date. */
  readonly kind: "text" | "file";
  readonly text: string;
}

/** The card's colours in print: jar orange, white, ink, brand-text, ink-soft, and the four mixed from them. */
export const PALETTE = ["#e76e43", "#ffffff", "#171713", "#bf4a1b", "#6b5645", "#a2a2a1", "#e3e3e3", "#a95435", "#c26540"] as const;

/** The sides, in page order, with their titles: page 2 (Café). */
export const PAGE_SIDES: readonly Side[] = ["front", "back"];
export const sideTitle = (side: Side) => menuCard()[side].title;

/** What no menu PDF may show: what a broken build prints, the kip sign the card's font can't draw, and a lost glyph. */
const NEVER: readonly [string, string][] = [
  ["undefined", '"undefined"'],
  ["NaN", '"NaN"'],
  ["\u20ad", "the kip sign (U+20AD)"],
  ["\ufffd", "U+FFFD, a glyph with no text behind it"],
];

/** Skia's own black and white (0 0 0 and 1 1 1), which it may set for its defaults whatever the card's colours. */
const SKIA = ["#000000", "#ffffff"];

const FONT_NAME = /^[A-Z]{6}\+FigtreeLight-(Regular|Medium|SemiBold|Bold)$/;

const STRUCTURE = ["H2", "H3", "Table", "TH", "TD", "L", "LI"];

const close = (a: number, b: number, within: number) => Math.abs(a - b) <= within;
const size = (box: readonly number[]) => [box[2]! - box[0]!, box[3]! - box[1]!] as const;
const pt = (value: number) => Number(value.toFixed(2));

/**
 * Where a page's words part from the card's, as a line of each: what the PDF says (its own spacing, with "+ 10,000"
 * read as "+10,000") and what the card now says. The card's lines are matched in the PDF's text with whitespace
 * removed: the first line that differs runs, in the PDF, to wherever the next line the PDF still has begins.
 */
export function staleLine(pageText: string, side: Side): { says: string; now: string } | null {
  const lines = cardText(side);
  const compact = (text: string) => text.replace(/\s+/g, "");
  const pdf = compact(pageText);
  if (pdf === lines.map(compact).join("")) return null;
  // Where each character of the PDF's text without whitespace sits in its spaced text.
  const spaced: number[] = [];
  for (let i = 0; i < pageText.length; i++) if (!/\s/.test(pageText[i]!)) spaced.push(i);
  let at = 0;
  for (const [i, line] of lines.entries()) {
    const want = compact(line);
    if (pdf.startsWith(want, at)) {
      at += want.length;
      continue;
    }
    let end = pdf.length;
    for (const next of lines.slice(i + 1)) {
      const found = pdf.indexOf(compact(next), at);
      if (next && found >= at) {
        end = found;
        break;
      }
    }
    const says = at < end ? pageText.slice(spaced[at], spaced[end - 1]! + 1) : "";
    return { says: says.replace(/\s+/g, " ").replace(/\+ (?=\d)/g, "+").trim(), now: line };
  }
  return { says: pageText.slice(spaced[at] ?? pageText.length).trim(), now: "" };
}

/** Every problem a finished menu PDF has, for its edition. An empty list is a PDF the engine would write. */
export function pdfProblems(bytes: Uint8Array, edition: Edition): PdfProblem[] {
  const problems: PdfProblem[] = [];
  const add = (text: string, page?: number, kind: PdfProblem["kind"] = "file") => problems.push({ ...(page ? { page } : {}), kind, text });
  let pdf: Pdf;
  try {
    pdf = readPdf(bytes);
  } catch (error) {
    return [{ kind: "file", text: `it can't be read: ${error instanceof Error ? error.message : String(error)}` }];
  }
  const { pageMm } = EDITIONS[edition];

  // Every offset in every xref section lands on its object, and every object reads (no object or xref streams).
  for (const section of pdf.sections) {
    for (const entry of section.entries.filter((e) => e.inUse)) {
      if (!pdf.bytes.toString("latin1", entry.offset, entry.offset + 24).startsWith(`${entry.num} ${entry.gen} obj`)) {
        add(`the xref section at byte ${section.offset} puts object ${entry.num} at byte ${entry.offset}, which isn't "${entry.num} ${entry.gen} obj".`);
      }
    }
  }
  // Every object the file holds now: each number's newest entry, across the sections.
  const current = new Map<number, XrefEntry>();
  for (const section of pdf.sections) for (const entry of section.entries) if (!current.has(entry.num)) current.set(entry.num, entry);
  let images = 0;
  let masks = 0;
  for (const entry of [...current.values()].filter((e) => e.inUse)) {
    try {
      const value = pdf.get(new Ref(entry.num, entry.gen));
      const dict = value instanceof Stream ? value.dict : value instanceof Map ? value : undefined;
      if (dict?.get("Subtype") instanceof Name && (dict.get("Subtype") as Name).name === "Image") images++;
      if (dict?.has("SMask") && !(dict.get("SMask") instanceof Name && (dict.get("SMask") as Name).name === "None")) masks++;
    } catch (error) {
      add(`object ${entry.num} can't be read: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (images) add(`it has ${images} image${images === 1 ? "" : "s"}: the card is all vector.`);
  if (masks) add(`it has ${masks} soft mask${masks === 1 ? "" : "s"}: the card is flat.`);

  if (pdf.pages.length !== 2) add(`it has ${pdf.pages.length} pages, not 2 (front, then back).`);
  const [width, height] = [pageMm.width * PT_PER_MM, pageMm.height * PT_PER_MM];
  pdf.pages.forEach((page, index) => {
    const n = index + 1;
    const media = page.boxes.MediaBox;
    if (!media) return add("it has no MediaBox.", n);
    const [w, h] = size(media);
    if (!close(w, width, 0.5) || !close(h, height, 0.5)) add(`its MediaBox is ${pt(w)} × ${pt(h)} pt, not ${pt(width)} × ${pt(height)} (± 0.5).`, n);
    // The print shop's trim and bleed; the office edition has neither.
    const { TrimBox: trim, BleedBox: bleed } = page.boxes;
    if (edition === "office") {
      if (trim || bleed) add("the office edition has a TrimBox or a BleedBox: it is printed as it is, to the paper's edge.", n);
    } else if (!trim) add("it has no TrimBox.", n);
    else {
      const [tw, th] = size(trim);
      const inset = EDITIONS.shop.bleedMm * PT_PER_MM;
      if (!close(tw, TRIM_MM.width * PT_PER_MM, 0.01) || !close(th, TRIM_MM.height * PT_PER_MM, 0.01)) add(`its TrimBox is ${pt(tw)} × ${pt(th)} pt, not A4's 595.28 × 841.89.`, n);
      if (!close(trim[0]! - media[0]!, inset, 0.01) || !close(media[3]! - trim[3]!, inset, 0.01)) {
        add(`its TrimBox [${trim.join(" ")}] isn't ${pt(inset)} pt in from the left and the top of [${media.join(" ")}].`, n);
      }
      if (!bleed || bleed.join() !== media.join()) add(`its BleedBox [${bleed?.join(" ") ?? ""}] isn't its MediaBox [${media.join(" ")}].`, n);
    }

    // Fonts: the static Figtree, embedded whole as TrueType outlines, readable as text, and nothing else.
    for (const font of page.fonts) {
      const named = `${font.resource} (${font.baseFont})`;
      if (font.subtype !== "Type0" || font.descendant?.subtype !== "CIDFontType2") add(`font ${named} is ${font.subtype}${font.descendant ? `/${font.descendant.subtype}` : ""}, not Type0/CIDFontType2.`, n);
      else if (!font.descendant.fontFile2) add(`font ${named} has no FontFile2: it isn't embedded.`, n);
      if (!font.toUnicode) add(`font ${named} has no ToUnicode: its words can't be copied or searched.`, n);
      if (!FONT_NAME.test(font.baseFont) || (font.descendant && !FONT_NAME.test(font.descendant.baseFont))) add(`font ${named} isn't a subset of the static Figtree (FigtreeLight-Regular, Medium, SemiBold or Bold).`, n);
    }

    // Flat and vector: no image, no transparency, no blend, solid colours from the palette.
    if (page.images) add(`it draws ${page.images} image${page.images === 1 ? "" : "s"}.`, n);
    for (const state of page.extGStates) {
      const ca = state.get("ca") ?? 1;
      const CA = state.get("CA") ?? 1;
      const blend = state.get("BM");
      if (ca !== 1 || CA !== 1) add(`an ExtGState sets ca ${String(ca)} and CA ${String(CA)}: the card has no transparency.`, n);
      if (blend !== undefined && !(blend instanceof Name && blend.name === "Normal")) add("an ExtGState sets a blend mode other than Normal.", n);
      if (state.has("SMask") && !(state.get("SMask") instanceof Name)) add("an ExtGState sets a soft mask.", n);
    }
    for (const colour of page.colours) if (![...PALETTE, ...SKIA].includes(colour as (typeof PALETTE)[number])) add(`it paints in ${colour}, not one of the card's colours.`, n);
    if (page.otherColourOps.length) add(`it sets colour with ${[...new Set(page.otherColourOps)].join(", ")}: the card is plain sRGB (rg and RG only), with no shading.`, n);

    // The words: the card's, line for line, with nothing a broken build would print.
    const side = PAGE_SIDES[index];
    if (side) {
      const stale = staleLine(page.text, side);
      if (stale) add(`(${sideTitle(side)}) says ${JSON.stringify(stale.says)} where the menu now says ${JSON.stringify(stale.now)}`, n, "text");
    }
    for (const [never, what] of NEVER) if (page.text.includes(never)) add(`its text has ${what}.`, n);
  });

  // Tags, language and outline: a reader can find its way, and a screen reader read it.
  if (!pdf.marked) add("it isn't tagged (/MarkInfo /Marked true).");
  const missing = STRUCTURE.filter((type) => !pdf.structTypes.has(type));
  if (missing.length) add(`its structure tree has no ${missing.join(", ")}.`);
  if (pdf.lang !== "en-GB") add(`its /Lang is ${pdf.lang ?? "missing"}, not en-GB.`);
  const outline = pdf.outline.map((item) => item.title);
  const titles = PAGE_SIDES.map(sideTitle);
  if (outline.join("|") !== titles.join("|")) add(`its outline is ${outline.join(", ") || "empty"}, not ${titles.join(", ")}.`);

  // The Info the finisher writes.
  const info = pdf.info;
  const want: Record<string, string> = { Title: PDF_TITLE, Author: PDF_AUTHOR, Subject: EDITIONS[edition].subject, Creator: "npm run menu:pdf" };
  for (const [key, value] of Object.entries(want)) if (info[key] !== value) add(`its Info ${key} is ${JSON.stringify(info[key] ?? null)}, not ${JSON.stringify(value)}.`);
  if (!new RegExp(`^${FACTS_PREFIX}[0-9a-f]{64}$`).test(info.Keywords ?? "")) add(`its Info Keywords is ${JSON.stringify(info.Keywords ?? null)}, not ${FACTS_PREFIX} and the card's fingerprint.`);
  if (!info.Producer) add("its Info has no Producer.");
  if (!/^D:\d{8}000000\+00'00'$/.test(info.CreationDate ?? "") || info.ModDate !== info.CreationDate) {
    add(`its Info dates are ${info.CreationDate ?? "missing"} and ${info.ModDate ?? "missing"}, not the menu's date twice.`);
  }

  if (pdf.bytes.length > MAX_PDF_BYTES) add(`it is ${pdf.bytes.length.toLocaleString("en-US")} bytes, over ${MAX_PDF_BYTES.toLocaleString("en-US")}.`);
  return problems;
}

/** The fingerprint a finished PDF carries in its Keywords, or undefined. */
export function pdfFingerprint(bytes: Uint8Array): string | undefined {
  const keywords = readPdf(bytes).info.Keywords ?? "";
  return keywords.startsWith(FACTS_PREFIX) ? keywords.slice(FACTS_PREFIX.length) : undefined;
}
