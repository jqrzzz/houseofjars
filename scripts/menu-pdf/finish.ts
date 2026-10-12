import { EDITIONS, FACTS_PREFIX, PDF_AUTHOR, PDF_TITLE, PT_PER_MM, TRIM_MM, type Edition } from "../../lib/menu/print-spec";
import { readPdf, Ref } from "./pdf";

/*
 * The last touches on the PDF Chromium prints, with no PDF library (npm run
 * menu:pdf). Chromium writes neither a print shop's boxes nor the card's
 * properties, and dates each file the moment it prints it, so two builds would
 * never match. The finisher:
 *
 * 1. rewrites each date in Chromium's Info, in place, as the menu's own date
 *    (menu.asOf, the day the prices were read), at the same length, so every
 *    byte after it stays where the xref table says it is;
 * 2. appends one incremental update, leaving every byte before it untouched:
 *    for the print shop, each page again with its TrimBox (the A4 trim, 3 mm in
 *    from the left and the top, as Chromium lays the page out from its top
 *    left) and its BleedBox (the whole page); for both editions, a new Info
 *    (Title, Author, Subject, Keywords with the fingerprint of the card's
 *    sources, Creator, Chromium's Producer, the menu's date); then the xref
 *    section for those objects and a trailer pointing back to Chromium's.
 *
 * It refuses any file that isn't Chromium's usual shape, rather than guess:
 * PDF 1.4, one classic xref table and trailer, no object streams, no xref
 * streams and no encryption.
 */

/** The menu's date as a PDF date, in UTC: "2026-10-04" is D:20261004000000+00'00'. */
export function pdfDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error(`Not a date: ${isoDate}`);
  return `D:${isoDate.replace(/-/g, "")}000000+00'00'`;
}

/** A number as PDF boxes write it: at most three decimals, no trailing zeros. */
const num = (value: number) => String(Number(value.toFixed(3)));

/**
 * The print shop's trim, in points, on a page whose MediaBox is `media`: the A4 trim, its bleed in from the left
 * and from the top (Chromium lays the page out from its top left, and may round its size by a fraction of a
 * point, so the box is measured from the top: [b, H − b − 841.89, b + 595.28, H − b]).
 */
export function trimBox(media: readonly number[], bleedMm = EDITIONS.shop.bleedMm): number[] {
  const [x0, , , y1] = media as [number, number, number, number];
  const bleed = bleedMm * PT_PER_MM;
  const [width, height] = [TRIM_MM.width * PT_PER_MM, TRIM_MM.height * PT_PER_MM];
  return [x0 + bleed, y1 - bleed - height, x0 + bleed + width, y1 - bleed].map((v) => Number(v.toFixed(3)));
}

/** Text as a PDF string: plain ASCII in parentheses, anything else UTF-16BE after a byte order mark. */
export function pdfString(text: string): string {
  if (/^[\x20-\x7e]*$/.test(text)) return `(${text.replace(/[\\()]/g, (c) => `\\${c}`)})`;
  return `<FEFF${[...text].map((c) => c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")).join("")}>`;
}

export interface FinishOptions {
  readonly edition: Edition;
  /** The menu's date, YYYY-MM-DD (menu.asOf). */
  readonly date: string;
  /** The card's fingerprint (fingerprint.ts), 64 hex digits: the PDF's Keywords. */
  readonly fingerprint: string;
}

/** Chromium's PDF, finished: dated, boxed for its edition and described. Throws on a file of any other shape. */
export function finishPdf(raw: Uint8Array, { edition, date, fingerprint }: FinishOptions): Buffer {
  if (!/^[0-9a-f]{64}$/.test(fingerprint)) throw new Error(`Not a fingerprint: ${fingerprint}`);
  // The reader refuses xref streams, a hybrid file's /XRefStm and /Encrypt; reading every object it lists refuses
  // object streams too, and proves each offset.
  const original = readPdf(raw);
  const text = original.bytes.toString("latin1");
  if (!/^%PDF-1\.4[\r\n]/.test(text)) throw new Error("Not Chromium's PDF 1.4: the header differs");
  if (original.sections.length !== 1) throw new Error(`Not Chromium's single xref table: ${original.sections.length} sections`);
  const [section] = original.sections;
  for (const entry of section!.entries) if (entry.inUse) original.get(new Ref(entry.num, entry.gen));
  const trailer = section!.trailer;
  const root = trailer.get("Root");
  const infoRef = trailer.get("Info");
  const size = trailer.get("Size");
  if (!(root instanceof Ref) || !(infoRef instanceof Ref) || typeof size !== "number") throw new Error("Chromium's trailer lacks /Root, /Info or /Size");

  // 1. The dates, in place, in Chromium's Info object.
  const when = pdfDate(date);
  const entry = section!.entries.find((e) => e.num === infoRef.num && e.inUse);
  if (!entry) throw new Error("Chromium's Info isn't in its xref table");
  const end = text.indexOf("endobj", entry.offset);
  const before = text.slice(entry.offset, end);
  let dates = 0;
  const after = before.replace(/\(D:\d{14}[^)]*\)/g, (found) => {
    dates++;
    const next = `(${when})`;
    if (next.length !== found.length) throw new Error(`Chromium's date ${found} isn't ${next.length} bytes long: run it with TZ=UTC`);
    return next;
  });
  if (dates === 0) throw new Error("Chromium's Info has no dates");
  const dated = Buffer.concat([original.bytes.subarray(0, entry.offset), Buffer.from(after, "latin1"), original.bytes.subarray(entry.offset + before.length)]);

  // 2. One incremental update, appended.
  const objects: { num: number; gen: number; body: string }[] = [];
  if (edition === "shop") {
    for (const page of original.pages) {
      const media = page.boxes.MediaBox;
      if (!media) throw new Error("A page without a MediaBox");
      if (page.dict.has("TrimBox") || page.dict.has("BleedBox")) throw new Error("Chromium's page already has a TrimBox or BleedBox");
      const at = section!.entries.find((e) => e.num === page.ref.num && e.inUse)!.offset;
      const body = text.slice(text.indexOf("obj", at) + 3, text.indexOf("endobj", at)).trim();
      if (!body.startsWith("<<") || !body.endsWith(">>")) throw new Error(`Page ${page.ref.num} isn't a plain dictionary`);
      // The BleedBox is the MediaBox, number for number as Chromium wrote it.
      const box = (values: readonly number[], write: (value: number) => string) => `[${values.map(write).join(" ")}]`;
      objects.push({ num: page.ref.num, gen: page.ref.gen, body: `${body.slice(0, -2)}\n/TrimBox ${box(trimBox(media), num)}\n/BleedBox ${box(media, String)}>>` });
    }
  }
  const producer = original.info.Producer;
  const info: [string, string][] = [
    ["Title", PDF_TITLE],
    ["Author", PDF_AUTHOR],
    ["Subject", EDITIONS[edition].subject],
    ["Keywords", `${FACTS_PREFIX}${fingerprint}`],
    ["Creator", "npm run menu:pdf"],
    ...(producer ? [["Producer", producer] as [string, string]] : []),
    ["CreationDate", when],
    ["ModDate", when],
  ];
  objects.push({ num: size, gen: 0, body: `<<${info.map(([key, value]) => `/${key} ${pdfString(value)}`).join("\n")}>>` });

  let at = dated.length + (dated[dated.length - 1] === 0x0a ? 0 : 1);
  let update = dated[dated.length - 1] === 0x0a ? "" : "\n";
  const offsets = new Map<number, { at: number; gen: number }>();
  for (const { num: n, gen, body } of objects) {
    const written = `${n} ${gen} obj\n${body}\nendobj\n`;
    offsets.set(n, { at, gen });
    update += written;
    at += Buffer.byteLength(written, "latin1");
  }
  // One subsection per run of consecutive object numbers, each entry 20 bytes.
  const numbers = [...offsets.keys()].sort((a, b) => a - b);
  let xref = "xref\n";
  for (let i = 0; i < numbers.length; ) {
    let j = i;
    while (j + 1 < numbers.length && numbers[j + 1] === numbers[j]! + 1) j++;
    xref += `${numbers[i]} ${j - i + 1}\n`;
    for (let k = i; k <= j; k++) {
      const { at: offset, gen } = offsets.get(numbers[k]!)!;
      xref += `${String(offset).padStart(10, "0")} ${String(gen).padStart(5, "0")} n \n`;
    }
    i = j + 1;
  }
  update += `${xref}trailer\n<</Size ${size + 1}\n/Root ${root.num} ${root.gen} R\n/Info ${size} 0 R\n/Prev ${section!.offset}>>\nstartxref\n${at}\n%%EOF\n`;
  return Buffer.concat([dated, Buffer.from(update, "latin1")]);
}
