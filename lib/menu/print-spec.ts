/*
 * The printed menu card's two PDFs: what each one is, where it is served and
 * the bounds the print engine (npm run menu:pdf) holds them to. The engine,
 * its CI test, the menu page's "Print the menu card" panel and the smoke run
 * all read these, so a file name or a limit is written once. No imports:
 * the browser, Node and the tests take it alike.
 */

/** The two editions: "office" for any printer, "shop" for a print shop. */
export type Edition = "office" | "shop";

export interface EditionSpec {
  readonly edition: Edition;
  /** The file in public/menu/. */
  readonly file: string;
  /** Where the site serves it (Next serves public/ as is: no route). */
  readonly url: string;
  /** The page, bleed included, in millimetres: what Chromium is asked for (@page size). */
  readonly pageMm: { readonly width: number; readonly height: number };
  /** How far the page runs past the A4 trim on every side: the bleed print shops ask for. */
  readonly bleedMm: number;
  /** The white border between the paper's edge and the orange side, for printers that can't print to the edge. */
  readonly matMm: number;
  /** The PDF's Subject. */
  readonly subject: string;
}

/** The trim, A4, in millimetres: the card once cut. */
export const TRIM_MM = { width: 210, height: 297 } as const;

export const EDITIONS: Readonly<Record<Edition, EditionSpec>> = {
  office: {
    edition: "office",
    file: "house-of-jars-menu-a4.pdf",
    url: "/menu/house-of-jars-menu-a4.pdf",
    pageMm: { width: 210, height: 297 },
    bleedMm: 0,
    matMm: 8,
    subject: "Café menu card: A4, front and back",
  },
  shop: {
    edition: "shop",
    file: "house-of-jars-menu-a4-bleed.pdf",
    url: "/menu/house-of-jars-menu-a4-bleed.pdf",
    pageMm: { width: 216, height: 303 },
    bleedMm: 3,
    matMm: 0,
    subject: "Café menu card: A4 trim with 3 mm bleed, front and back",
  },
};

/** Both editions, office first. */
export const EDITION_LIST: readonly EditionSpec[] = [EDITIONS.office, EDITIONS.shop];

/** Where the card's words sit, measured from the trim: the same in both editions, so every line breaks the same way. */
export const CONTENT_MARGIN_MM = { top: 20, side: 20, bottom: 16 } as const;

/** No line of text comes closer to the trim than this (the design keeps 20 mm, and 16 mm at the foot). */
export const SAFE_MM = 15;

/** Points in a millimetre: PDF boxes are in points (1/72 inch). */
export const PT_PER_MM = 72 / 25.4;

/** The PDFs' Title and Author. */
export const PDF_TITLE = "House of Jars café menu";
export const PDF_AUTHOR = "House of Jars";

/** Each PDF stays under this many bytes (150 kB). */
export const MAX_PDF_BYTES = 150_000;

/** Each PDF's Keywords: this, then the sha256 of the card's sources (scripts/menu-pdf/fingerprint.ts). */
export const FACTS_PREFIX = "menu-facts:";
