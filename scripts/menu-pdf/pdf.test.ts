import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { finishPdf, pdfDate, pdfString, trimBox } from "./finish";
import { readPdf } from "./pdf";

/*
 * The PDF reader and the finisher, on a small PDF written here by hand in the
 * shape Chromium writes (PDF 1.4, one classic xref table, a FlateDecode page,
 * a Type0 font with a ToUnicode map, tags, an outline and dated Info), so they
 * are tested without Chromium.
 */

const FINGERPRINT = "0123456789abcdef".repeat(4);

/** A ToUnicode map: code 1 is "C", 2 to 4 are "a" to "c" (a range), 5 is "é", 6 is a space. */
const CMAP = `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
3 beginbfchar
<0001> <0043>
<0005> <00E9>
<0006> <0020>
endbfchar
1 beginbfrange
<0002> <0004> <0061>
endbfrange
endcmap
CMapName currentdict /CMap defineresource pop
end
end`;

/** "Café" on page 1 in jar orange over a white field; "abc" on page 2 in a TJ array. */
const PAGE_1 = "1 1 1 rg 0 0 612 858.95996 re f .9059 .4314 .2627 rg /G1 gs BT /F1 12 Tf 1 0 0 -1 20 40 Tm <0001> Tj 7 0 Td <0002> Tj 6 0 Td <0004> Tj ET BT <0005> Tj ET";
const PAGE_2 = "BT /F1 12 Tf 20 40 Td [<0002> -20 <0003> 15 <00060004>] TJ ET";

/** Objects in the order Chromium writes them, Info first; a Buffer is a stream's data. */
function chromiumLike(objects: Readonly<Record<number, string | { dict: string; data: Buffer }>>, size: number, extraTrailer = ""): Buffer {
  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n%\xd3\xeb\xe9\xe1\n", "latin1")];
  let at = parts[0]!.length;
  const offsets = new Map<number, number>();
  for (const [num, body] of Object.entries(objects)) {
    offsets.set(Number(num), at);
    const part =
      typeof body === "string"
        ? Buffer.from(`${num} 0 obj\n${body}\nendobj\n`, "latin1")
        : Buffer.concat([Buffer.from(`${num} 0 obj\n<<${body.dict}\n/Length ${body.data.length}>> stream\n`, "latin1"), body.data, Buffer.from("\nendstream\nendobj\n", "latin1")]);
    parts.push(part);
    at += part.length;
  }
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let num = 1; num < size; num++) xref += offsets.has(num) ? `${String(offsets.get(num)).padStart(10, "0")} 00000 n \n` : "0000000000 65535 f \n";
  parts.push(Buffer.from(`${xref}trailer\n<</Size ${size}\n/Root 2 0 R\n/Info 1 0 R${extraTrailer}>>\nstartxref\n${at}\n%%EOF\n`, "latin1"));
  return Buffer.concat(parts);
}

const OBJECTS = {
  1: "<</Title <FEFF0043006100660065>\n/Creator (HeadlessChrome)\n/Producer (Skia/PDF m141)\n/CreationDate (D:20261011153000+00'00')\n/ModDate (D:20261011153000+00'00')>>",
  2: "<</Type /Catalog\n/Pages 3 0 R\n/MarkInfo <</Type /MarkInfo\n/Marked true>>\n/StructTreeRoot 12 0 R\n/Outlines 15 0 R\n/Lang (en-GB)>>",
  3: "<</Type /Pages\n/Count 2\n/Kids [4 0 R 5 0 R]>>",
  4: "<</Type /Page\n/Resources <</Font <</F1 6 0 R>>\n/ExtGState <</G1 11 0 R>>>>\n/MediaBox [0 0 612 858.95996]\n/Contents 9 0 R\n/Parent 3 0 R>>",
  5: "<</Type /Page\n/Resources <</Font <</F1 6 0 R>>>>\n/MediaBox [0 0 612 858.95996]\n/Contents 10 0 R\n/Parent 3 0 R>>",
  6: "<</Type /Font\n/Subtype /Type0\n/BaseFont /AAAAAA+FigtreeLight-Bold\n/Encoding /Identity-H\n/DescendantFonts [7 0 R]\n/ToUnicode 8 0 R>>",
  7: "<</Type /Font\n/Subtype /CIDFontType2\n/BaseFont /AAAAAA+FigtreeLight-Bold\n/FontDescriptor 18 0 R>>",
  8: { dict: "", data: Buffer.from(CMAP, "latin1") },
  9: { dict: "/Filter /FlateDecode", data: deflateSync(Buffer.from(PAGE_1, "latin1")) },
  10: { dict: "", data: Buffer.from(PAGE_2, "latin1") },
  11: "<</ca 1\n/BM /Normal>>",
  12: "<</Type /StructTreeRoot\n/K 13 0 R>>",
  13: "<</Type /StructElem\n/S /Document\n/K [14 0 R]>>",
  14: "<</Type /StructElem\n/S /H2\n/P 13 0 R\n/K 0>>",
  15: "<</Type /Outlines\n/First 16 0 R\n/Last 17 0 R>>",
  16: "<</Title (Breakfast)\n/Parent 15 0 R\n/Next 17 0 R>>",
  17: "<</Title <FEFF00430061006600E9>\n/Parent 15 0 R\n/Prev 16 0 R>>",
  18: "<</Type /FontDescriptor\n/FontName /AAAAAA+FigtreeLight-Bold\n/FontFile2 19 0 R>>",
  19: { dict: "/Length1 4", data: Buffer.from("true", "latin1") },
};

const raw = chromiumLike(OBJECTS, 20);

describe("the PDF reader", () => {
  it("finds the pages, their boxes, fonts, colours and text, the tags, the outline and the Info", () => {
    const pdf = readPdf(raw);
    expect(pdf.version).toBe("1.4");
    expect(pdf.sections).toHaveLength(1);
    expect(pdf.pages).toHaveLength(2);
    expect(pdf.pages[0]!.boxes).toEqual({ MediaBox: [0, 0, 612, 858.95996] });
    expect(pdf.pages[0]!.fonts).toEqual([
      { resource: "F1", subtype: "Type0", baseFont: "AAAAAA+FigtreeLight-Bold", descendant: { subtype: "CIDFontType2", baseFont: "AAAAAA+FigtreeLight-Bold", fontFile2: true }, toUnicode: true },
    ]);
    expect(pdf.pages[0]!.colours).toEqual(["#ffffff", "#e76e43"]);
    expect(pdf.pages[0]!.extGStates.map((state) => state.get("ca"))).toEqual([1]);
    expect(pdf.pages[0]!.otherColourOps).toEqual([]);
    expect(pdf.pages[0]!.images).toBe(0);
    // Through ToUnicode (bfchar and bfrange), a space at each BT and ET, whitespace collapsed; TJ's numbers add nothing.
    expect(pdf.pages[0]!.text).toBe("Cac é");
    expect(pdf.pages[1]!.text).toBe("ab c");
    expect(pdf.info).toMatchObject({ Title: "Cafe", Producer: "Skia/PDF m141", CreationDate: "D:20261011153000+00'00'" });
    expect(pdf.marked).toBe(true);
    expect(pdf.lang).toBe("en-GB");
    expect([...pdf.structTypes].sort()).toEqual(["Document", "H2"]);
    expect(pdf.outline).toEqual([
      { title: "Breakfast", children: [] },
      { title: "Café", children: [] },
    ]);
  });

  it("refuses what it can't read rather than misread it", () => {
    expect(() => readPdf(Buffer.from("<html>"))).toThrow(/Not a PDF/);
    expect(() => readPdf(raw.subarray(0, raw.length - 20))).toThrow(/startxref/);
    const pointsElsewhere = Buffer.from(raw.toString("latin1").replace(/startxref\n\d+/, "startxref\n9"), "latin1");
    expect(() => readPdf(pointsElsewhere)).toThrow(/No classic xref table/);
  });
});

describe("the finisher", () => {
  const office = finishPdf(raw, { edition: "office", date: "2026-10-04", fingerprint: FINGERPRINT });
  const shop = finishPdf(raw, { edition: "shop", date: "2026-10-04", fingerprint: FINGERPRINT });

  it("rewrites Chromium's dates as the menu's, in place, at the same length", () => {
    expect(pdfDate("2026-10-04")).toBe("D:20261004000000+00'00'");
    const dated = raw.toString("latin1").replaceAll("D:20261011153000+00'00'", "D:20261004000000+00'00'");
    expect(dated.length).toBe(raw.length);
    for (const file of [office, shop]) expect(file.subarray(0, raw.length).toString("latin1")).toBe(dated);
  });

  it("leaves every byte before its update as it was, but the dates", () => {
    const dates = [...raw.toString("latin1").matchAll(/\(D:\d{14}\+00'00'\)/g)].map((m) => [m.index, m.index + m[0].length] as const);
    expect(dates).toHaveLength(2);
    for (const file of [office, shop]) {
      const changed = [...file.subarray(0, raw.length)].flatMap((byte, i) => (byte === raw[i] ? [] : [i]));
      expect(changed.length).toBeGreaterThan(0);
      expect(changed.filter((i) => !dates.some(([from, to]) => i >= from && i < to))).toEqual([]);
      expect(file.subarray(raw.length).toString("latin1")).toMatch(/^\d+ 0 obj\n/);
    }
  });

  it("appends the print shop's pages with their TrimBox and BleedBox, and a new Info, for both editions", () => {
    expect(trimBox([0, 0, 612, 858.95996])).toEqual([8.504, 8.566, 603.78, 850.456]);
    const pdf = readPdf(shop);
    for (const page of pdf.pages) {
      expect(page.boxes.TrimBox).toEqual([8.504, 8.566, 603.78, 850.456]);
      expect(page.boxes.BleedBox).toEqual(page.boxes.MediaBox);
    }
    // The text and fonts are still there, through the rewritten pages.
    expect(pdf.pages.map((page) => page.text)).toEqual(["Cac é", "ab c"]);
    expect(readPdf(office).pages.map((page) => page.boxes)).toEqual([{ MediaBox: [0, 0, 612, 858.95996] }, { MediaBox: [0, 0, 612, 858.95996] }]);
    for (const [file, subject] of [
      [office, "Café menu card: A4, front and back"],
      [shop, "Café menu card: A4 trim with 3 mm bleed, front and back"],
    ] as const) {
      expect(readPdf(file).info).toEqual({
        Title: "House of Jars café menu",
        Author: "House of Jars",
        Subject: subject,
        Keywords: `menu-facts:${FINGERPRINT}`,
        Creator: "npm run menu:pdf",
        Producer: "Skia/PDF m141",
        CreationDate: "D:20261004000000+00'00'",
        ModDate: "D:20261004000000+00'00'",
      });
    }
    // Text with an accent is UTF-16BE after a byte order mark; plain ASCII stays readable.
    expect(pdfString("Café")).toBe("<FEFF00430061006600E9>");
    expect(pdfString("npm run (menu:pdf)")).toBe("(npm run \\(menu:pdf\\))");
  });

  it("writes an xref section the reader follows back through /Prev, every offset landing on its object", () => {
    const pdf = readPdf(shop);
    expect(pdf.sections).toHaveLength(2);
    expect(pdf.sections[0]!.trailer.get("Prev")).toBe(pdf.sections[1]!.offset);
    expect(pdf.sections[0]!.trailer.get("Size")).toBe(21);
    // One subsection per run: the two pages (4 and 5) together, the Info (20) on its own.
    expect(shop.toString("latin1", pdf.sections[0]!.offset)).toMatch(/^xref\n4 2\n\d{10} 00000 n \n\d{10} 00000 n \n20 1\n\d{10} 00000 n \ntrailer\n/);
    for (const section of pdf.sections) {
      for (const entry of section.entries.filter((e) => e.inUse)) expect(shop.toString("latin1", entry.offset, entry.offset + 12)).toMatch(new RegExp(`^${entry.num} ${entry.gen} obj`));
    }
    // Each entry is 20 bytes.
    expect(shop.toString("latin1").match(/\n(\d{10} \d{5} [nf] \n)/g)!.every((line) => line.length === 21)).toBe(true);
  });

  it("refuses anything that isn't Chromium's usual shape", () => {
    const withObjectStream = chromiumLike({ ...OBJECTS, 20: { dict: "/Type /ObjStm\n/N 0\n/First 0", data: Buffer.alloc(0) } }, 21);
    expect(() => finishPdf(withObjectStream, { edition: "office", date: "2026-10-04", fingerprint: FINGERPRINT })).toThrow(/object stream/);
    expect(() => finishPdf(office, { edition: "office", date: "2026-10-04", fingerprint: FINGERPRINT })).toThrow(/single xref table/);
    expect(() => finishPdf(chromiumLike(OBJECTS, 20, "\n/Encrypt 1 0 R"), { edition: "office", date: "2026-10-04", fingerprint: FINGERPRINT })).toThrow(/encrypted/);
    expect(() => finishPdf(Buffer.from(raw.toString("latin1").replace("%PDF-1.4", "%PDF-1.7"), "latin1"), { edition: "office", date: "2026-10-04", fingerprint: FINGERPRINT })).toThrow(/PDF 1.4/);
    expect(() => finishPdf(raw, { edition: "office", date: "4 October", fingerprint: FINGERPRINT })).toThrow(/Not a date/);
    expect(() => finishPdf(raw, { edition: "office", date: "2026-10-04", fingerprint: "menu" })).toThrow(/Not a fingerprint/);
  });
});
