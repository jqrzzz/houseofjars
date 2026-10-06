import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { brotliDecompressSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { laoNumeral } from "@/content/text";

/** WOFF2's table tags, by the index its table directory uses for them (63: the tag follows). Trailing spaces trimmed. */
const KNOWN_TAGS = [
  ...["cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt", "fpgm", "glyf", "loca", "prep", "CFF", "VORG", "EBDT"],
  ...["EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH"],
  ...["CBDT", "CBLC", "COLR", "CPAL", "SVG", "sbix", "acnt", "avar", "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar"],
  ...["gvar", "hsty", "just", "lcar", "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat", "Gloc", "Feat", "Sill"],
];

/** The tables of a WOFF2 font (one font, not a collection), decompressed. A transformed glyf or loca stays transformed. */
function woff2Tables(file: Buffer): Map<string, Buffer> {
  expect(file.toString("latin1", 0, 4)).toBe("wOF2");
  const numTables = file.readUInt16BE(12);
  const compressedLength = file.readUInt32BE(20);
  let at = 48;
  const base128 = () => {
    let value = 0;
    for (let i = 0; i < 5; i++) {
      const byte = file[at++]!;
      value = value * 128 + (byte & 0x7f);
      if (!(byte & 0x80)) return value;
    }
    throw new Error("Not a UIntBase128");
  };
  const entries: { tag: string; length: number }[] = [];
  for (let i = 0; i < numTables; i++) {
    const flags = file[at++]!;
    let tag = KNOWN_TAGS[flags & 0x3f];
    if ((flags & 0x3f) === 0x3f) {
      tag = file.toString("latin1", at, at + 4);
      at += 4;
    }
    const version = flags >> 6;
    const length = base128();
    // glyf and loca are transformed unless their version is 3; any other table only when its version isn't 0.
    const transformed = tag === "glyf" || tag === "loca" ? version !== 3 : version !== 0;
    entries.push({ tag: tag!.trim(), length: transformed ? base128() : length });
  }
  const data = brotliDecompressSync(file.subarray(at, at + compressedLength));
  const tables = new Map<string, Buffer>();
  let offset = 0;
  for (const { tag, length } of entries) {
    tables.set(tag, data.subarray(offset, offset + length));
    offset += length;
  }
  return tables;
}

/** Every character a cmap table maps to a glyph, from its format 4 and format 12 subtables. */
function mappedCharacters(cmap: Buffer): Set<number> {
  const chars = new Set<number>();
  const subtables = cmap.readUInt16BE(2);
  for (let i = 0; i < subtables; i++) {
    const at = cmap.readUInt32BE(4 + i * 8 + 4);
    const format = cmap.readUInt16BE(at);
    if (format === 4) {
      const segments = cmap.readUInt16BE(at + 6) / 2;
      const ends = at + 14;
      const starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2;
      const ranges = deltas + segments * 2;
      for (let s = 0; s < segments; s++) {
        const [start, end] = [cmap.readUInt16BE(starts + s * 2), cmap.readUInt16BE(ends + s * 2)];
        const [delta, range] = [cmap.readInt16BE(deltas + s * 2), cmap.readUInt16BE(ranges + s * 2)];
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const index = range === 0 ? c : cmap.readUInt16BE(ranges + s * 2 + range + (c - start) * 2);
          if (index !== 0 && ((index + delta) & 0xffff) !== 0) chars.add(c);
        }
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(at + 12);
      for (let g = 0; g < groups; g++) {
        const [start, end] = [cmap.readUInt32BE(at + 16 + g * 12), cmap.readUInt32BE(at + 20 + g * 12)];
        const glyph = cmap.readUInt32BE(at + 24 + g * 12);
        for (let c = start; c <= end; c++) if (glyph + (c - start) !== 0) chars.add(c);
      }
    }
  }
  return chars;
}

/** Every Lao character (U+0E80–U+0EFF) written in the site's code and content. */
function laoInSources(): Set<number> {
  const found = new Set<number>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(ts|tsx|css|json)$/.test(entry.name)) {
        for (const [ch] of readFileSync(path, "utf8").matchAll(/[\u0E80-\u0EFF]/g)) found.add(ch.codePointAt(0)!);
      }
    }
  };
  for (const root of ["app", "components", "content", "lib"]) walk(join(process.cwd(), root));
  return found;
}

const hex = (c: number) => `U+${c.toString(16).toUpperCase().padStart(4, "0")} ${String.fromCodePoint(c)}`;

describe("the Lao font subset (app/fonts.ts)", () => {
  const tables = woff2Tables(readFileSync(join(process.cwd(), "app/fonts/noto-sans-lao-subset.woff2")));

  it("keeps every weight, and the marks' positioning", () => {
    expect([...tables.keys()]).toEqual(expect.arrayContaining(["cmap", "fvar", "gvar", "GPOS"]));
  });

  it("has every Lao character the site writes, and every Lao digit a section number can use", () => {
    const needed = laoInSources();
    // The greeting, ສະບາຍດີ, is found where it is written.
    expect(needed.has(0x0eaa)).toBe(true);
    for (const digit of laoNumeral(1234567890)) needed.add(digit.codePointAt(0)!);
    const mapped = mappedCharacters(tables.get("cmap")!);
    const missing = [...needed].filter((c) => !mapped.has(c)).sort((a, b) => a - b);
    expect(missing.map(hex), "Cut the subset again with these characters too (the command is in app/fonts.ts)").toEqual([]);
  });
});
