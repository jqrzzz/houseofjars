import { brotliDecompressSync } from "node:zlib";

/*
 * A small WOFF2 reader, enough to see which characters a font can draw: the
 * Lao subset's test (app/fonts/lao-subset.test.ts) reads the subset cut for the
 * site, and the menu card's checks (lib/menu/card.test.ts and npm run menu:pdf)
 * read the static Figtree files the printed card embeds, so a character the
 * font lacks (the kip sign, a thin space, a tick) can never fall back to another font.
 * Node only (node:zlib), and no dependency.
 */

/** WOFF2's table tags, by the index its table directory uses for them (63: the tag follows). Trailing spaces trimmed. */
const KNOWN_TAGS = [
  ...["cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt", "fpgm", "glyf", "loca", "prep", "CFF", "VORG", "EBDT"],
  ...["EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH"],
  ...["CBDT", "CBLC", "COLR", "CPAL", "SVG", "sbix", "acnt", "avar", "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar"],
  ...["gvar", "hsty", "just", "lcar", "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat", "Gloc", "Feat", "Sill"],
];

/** The tables of a WOFF2 font (one font, not a collection), decompressed. A transformed glyf or loca stays transformed. */
export function woff2Tables(file: Buffer): Map<string, Buffer> {
  if (file.toString("latin1", 0, 4) !== "wOF2") throw new Error("Not a WOFF2 font: it doesn't start with wOF2");
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
    if (tag === undefined) throw new Error(`Unknown WOFF2 table index ${flags & 0x3f}`);
    const version = flags >> 6;
    const length = base128();
    // glyf and loca are transformed unless their version is 3; any other table only when its version isn't 0.
    const transformed = tag === "glyf" || tag === "loca" ? version !== 3 : version !== 0;
    entries.push({ tag: tag.trim(), length: transformed ? base128() : length });
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
export function mappedCharacters(cmap: Buffer): Set<number> {
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
