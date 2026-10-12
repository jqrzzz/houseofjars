import { inflateSync } from "node:zlib";

/*
 * A small PDF reader for the menu card's PDFs, so the print engine (npm run
 * menu:pdf), its CI test (menu-pdf.test.ts) and the smoke run can hold the
 * files to the card without a PDF library. It reads what Chromium writes, and
 * what the finisher (finish.ts) adds: classic xref tables, following /Prev so
 * the newest section wins; the objects they point at; FlateDecode streams; the
 * page tree and its boxes; each page's fonts (Type0 down to the FontFile2, with
 * ToUnicode), ExtGStates and XObjects (forms are read through); the colours
 * its content sets; its text, through ToUnicode (Tj and TJ, with a space at BT
 * and ET); the structure tree's types, /Lang, /MarkInfo and the outline's
 * titles; and the newest Info. What it doesn't know (xref streams, object
 * streams, other filters) it refuses rather than misreads.
 */

export class Name {
  constructor(readonly name: string) {}
}

export class Ref {
  constructor(
    readonly num: number,
    readonly gen: number,
  ) {}
}

/** A string's bytes. Its text is UTF-16BE after a byte order mark, otherwise Latin-1 (PDFDocEncoding, for ASCII). */
export class Str {
  constructor(readonly bytes: Buffer) {}
  get text(): string {
    if (this.bytes[0] !== 0xfe || this.bytes[1] !== 0xff) return this.bytes.toString("latin1");
    return String.fromCharCode(...Array.from({ length: (this.bytes.length - 2) >> 1 }, (_, i) => this.bytes.readUInt16BE(2 + 2 * i)));
  }
}

export type Dict = Map<string, Value>;

export class Stream {
  constructor(
    readonly dict: Dict,
    readonly raw: Buffer,
  ) {}
  /** The stream's bytes, decoded: FlateDecode or none. */
  get data(): Buffer {
    const filter = this.dict.get("Filter");
    const names = (Array.isArray(filter) ? filter : filter ? [filter] : []).map((f) => (f instanceof Name ? f.name : "?"));
    if (names.length === 0) return this.raw;
    if (names.join() !== "FlateDecode" || this.dict.has("DecodeParms")) throw new Error(`Unsupported stream filter: ${names.join(", ")}`);
    return inflateSync(this.raw);
  }
}

/** An operator in a content stream, or a keyword (obj, R, stream) in the file. */
class Op {
  constructor(readonly op: string) {}
}

export type Value = null | boolean | number | Name | Str | Ref | Value[] | Dict | Stream;

const SPACE = new Set([0, 9, 10, 12, 13, 32].map((c) => String.fromCharCode(c)));
const DELIMITER = new Set("()<>[]{}/%");
const ESCAPES: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" };

/** Tokens and objects from PDF syntax, in the file or in a content stream (read as Latin-1, one character a byte). */
class Lexer {
  constructor(
    readonly s: string,
    public at = 0,
  ) {}

  private skip() {
    for (let c = this.s[this.at]; c !== undefined; c = this.s[this.at]) {
      if (SPACE.has(c)) this.at++;
      else if (c === "%") while (this.at < this.s.length && this.s[this.at] !== "\n" && this.s[this.at] !== "\r") this.at++;
      else return;
    }
  }

  private word(): string {
    const start = this.at;
    while (this.at < this.s.length && !SPACE.has(this.s[this.at]!) && !DELIMITER.has(this.s[this.at]!)) this.at++;
    return this.s.slice(start, this.at);
  }

  /** The next object, an operator or keyword (Op), or undefined at the end. `num gen R` is read as a Ref. */
  next(): Value | Op | undefined {
    this.skip();
    const c = this.s[this.at];
    if (c === undefined) return undefined;
    if (c === "/") {
      this.at++;
      return new Name(this.word().replace(/#([0-9a-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))));
    }
    if (c === "<" && this.s[this.at + 1] === "<") {
      this.at += 2;
      const dict: Dict = new Map();
      for (let key = this.next(); !(key instanceof Op && key.op === ">>"); key = this.next()) {
        if (!(key instanceof Name)) throw new Error(`A dictionary key that isn't a name at byte ${this.at}`);
        dict.set(key.name, this.value());
      }
      return dict;
    }
    if (c === ">" && this.s[this.at + 1] === ">") return (this.at += 2), new Op(">>");
    if (c === "<") {
      const end = this.s.indexOf(">", this.at);
      const hex = this.s.slice(this.at + 1, end).replace(/\s+/g, "");
      this.at = end + 1;
      return new Str(Buffer.from(hex.length % 2 ? `${hex}0` : hex, "hex"));
    }
    if (c === "(") return new Str(Buffer.from(this.literal(), "latin1"));
    if (c === "[") {
      this.at++;
      const list: Value[] = [];
      for (let item = this.next(); !(item instanceof Op && item.op === "]"); item = this.next()) {
        if (item === undefined || item instanceof Op) throw new Error(`An unclosed array at byte ${this.at}`);
        list.push(item);
      }
      return list;
    }
    if (c === "]" || c === "{" || c === "}") return (this.at++, new Op(c));
    const word = this.word() || (this.at++, c);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) {
      // An integer may start a reference: num gen R.
      const after = this.at;
      const ref = /^\s+(\d+)\s+R(?=[\s/<>[\]()%]|$)/.exec(this.s.slice(after, after + 24));
      if (/^\d+$/.test(word) && ref) {
        this.at = after + ref[0].length;
        return new Ref(Number(word), Number(ref[1]));
      }
      return Number(word);
    }
    return word === "true" ? true : word === "false" ? false : word === "null" ? null : new Op(word);
  }

  /** The next token, which must be an object. */
  value(): Value {
    const token = this.next();
    if (token === undefined || token instanceof Op) throw new Error(`Expected an object at byte ${this.at}, found ${token instanceof Op ? token.op : "the end"}`);
    return token;
  }

  private literal(): string {
    let out = "";
    let depth = 0;
    for (this.at++; this.at < this.s.length; this.at++) {
      const c = this.s[this.at]!;
      if (c === "\\") {
        const e = this.s[++this.at]!;
        const octal = /^[0-7]{1,3}/.exec(this.s.slice(this.at, this.at + 3));
        if (octal) {
          out += String.fromCharCode(parseInt(octal[0], 8) & 0xff);
          this.at += octal[0].length - 1;
        } else if (e === "\r" || e === "\n") this.at += e === "\r" && this.s[this.at + 1] === "\n" ? 1 : 0;
        else out += ESCAPES[e] ?? e;
      } else if (c === ")" && depth === 0) {
        this.at++;
        return out;
      } else {
        depth += c === "(" ? 1 : c === ")" ? -1 : 0;
        out += c;
      }
    }
    throw new Error("An unclosed string");
  }
}

export interface XrefEntry {
  readonly num: number;
  readonly gen: number;
  readonly offset: number;
  readonly inUse: boolean;
}

/** One xref section and its trailer, at the byte offset its startxref (or the next section's /Prev) names. */
export interface XrefSection {
  readonly offset: number;
  readonly entries: readonly XrefEntry[];
  readonly trailer: Dict;
}

export interface Font {
  /** Its name in the page's resources (F4). */
  readonly resource: string;
  readonly subtype: string;
  readonly baseFont: string;
  /** For a Type0 font, its descendant: CIDFontType2 with a FontFile2 for an embedded TrueType font. */
  readonly descendant?: { readonly subtype: string; readonly baseFont: string; readonly fontFile2: boolean };
  readonly toUnicode: boolean;
}

export interface Page {
  readonly ref: Ref;
  readonly dict: Dict;
  readonly boxes: Readonly<Partial<Record<"MediaBox" | "CropBox" | "TrimBox" | "BleedBox" | "ArtBox", number[]>>>;
  readonly fonts: readonly Font[];
  /** Each ExtGState in its resources (and its forms'), as written: ca, CA, BM, SMask. */
  readonly extGStates: readonly Dict[];
  /** The colours its content sets with rg and RG, as hex: Skia writes jar orange as .9059 .4314 .2627, #e76e43. */
  readonly colours: readonly string[];
  /** Any other colour operator (g, k, cs, scn…), and any shading (sh): a flat sRGB card has none. */
  readonly otherColourOps: readonly string[];
  /** Images drawn: XObjects and inline images. */
  readonly images: number;
  /** Its text, through ToUnicode, with a space at each BT and ET, whitespace collapsed. */
  readonly text: string;
}

export interface OutlineItem {
  readonly title: string;
  readonly children: readonly OutlineItem[];
}

export interface Pdf {
  readonly bytes: Buffer;
  /** The version in the header: "1.4". */
  readonly version: string;
  /** Newest first. */
  readonly sections: readonly XrefSection[];
  /** The object an xref entry points at (the newest), resolved through references. */
  get(value: Value | undefined): Value | undefined;
  readonly catalog: Dict;
  readonly pages: readonly Page[];
  /** The newest Info, its strings as text. */
  readonly info: Readonly<Record<string, string>>;
  /** The types in the structure tree (H2, Table, LI…). */
  readonly structTypes: ReadonlySet<string>;
  readonly lang?: string;
  readonly marked: boolean;
  readonly outline: readonly OutlineItem[];
}

const isDict = (v: Value | undefined): v is Dict => v instanceof Map;
const name = (v: Value | undefined) => (v instanceof Name ? v.name : undefined);

/** A ToUnicode CMap: each code (bfchar and bfrange) to its text. */
function toUnicode(cmap: string): Map<number, string> {
  const map = new Map<number, string>();
  const utf16 = (hex: string) => new Str(Buffer.from(`feff${hex}`, "hex")).text;
  for (const [, block] of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const [, code, text] of block!.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) map.set(parseInt(code!, 16), utf16(text!));
  }
  for (const [, block] of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const [, lo, hi, rest] of block!.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]*>|\[[^\]]*\])/g)) {
      const [from, to] = [parseInt(lo!, 16), parseInt(hi!, 16)];
      const list = rest!.startsWith("[") ? [...rest!.matchAll(/<([0-9a-fA-F]*)>/g)].map((m) => utf16(m[1]!)) : undefined;
      const first = rest!.slice(1, -1);
      for (let code = from; code <= to; code++) {
        if (list) map.set(code, list[code - from] ?? "\ufffd");
        else map.set(code, utf16(first.slice(0, -4) + (parseInt(first.slice(-4), 16) + code - from).toString(16).padStart(4, "0")));
      }
    }
  }
  return map;
}

/** Reads a PDF with classic xref tables. Throws on anything else, or on a file it can't follow. */
export function readPdf(input: Uint8Array): Pdf {
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  const s = bytes.toString("latin1");
  const version = /^%PDF-(\d\.\d)/.exec(s)?.[1];
  if (!version) throw new Error("Not a PDF: it doesn't start with %PDF-");
  const startxref = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(s.slice(-64));
  if (!startxref) throw new Error("No startxref and %%EOF at the end of the file");

  const sections: XrefSection[] = [];
  for (let at: number | undefined = Number(startxref[1]); at !== undefined; ) {
    if (sections.some((section) => section.offset === at)) throw new Error(`The xref sections loop back to byte ${at}`);
    const lexer: Lexer = new Lexer(s, at);
    const keyword = lexer.next();
    if (!(keyword instanceof Op && keyword.op === "xref")) throw new Error(`No classic xref table at byte ${at} (an xref stream?)`);
    const entries: XrefEntry[] = [];
    for (let token = lexer.next(); typeof token === "number"; token = lexer.next()) {
      const count = lexer.value() as number;
      for (let i = 0; i < count; i++) {
        const [offset, gen, kind] = [lexer.value(), lexer.value(), lexer.next()];
        entries.push({ num: token + i, gen: gen as number, offset: offset as number, inUse: kind instanceof Op && kind.op === "n" });
      }
    }
    const trailer: Value = lexer.value();
    if (!isDict(trailer)) throw new Error(`No trailer after the xref table at byte ${at}`);
    if (trailer.has("XRefStm") || trailer.has("Encrypt")) throw new Error("A hybrid or encrypted file");
    sections.push({ offset: at, entries, trailer });
    const prev: Value | undefined = trailer.get("Prev");
    at = typeof prev === "number" ? prev : undefined;
  }
  const where = new Map<number, XrefEntry>();
  for (const section of sections) for (const entry of section.entries) if (!where.has(entry.num)) where.set(entry.num, entry);

  const cache = new Map<number, Value>();
  const object = (num: number): Value => {
    if (cache.has(num)) return cache.get(num)!;
    const entry = where.get(num);
    if (!entry?.inUse) return null;
    const lexer = new Lexer(s, entry.offset);
    const [n, , keyword] = [lexer.next(), lexer.next(), lexer.next()];
    if (n !== num || !(keyword instanceof Op && keyword.op === "obj")) throw new Error(`Object ${num}'s xref offset ${entry.offset} doesn't land on "${num} ${entry.gen} obj"`);
    let value = lexer.value();
    const after = lexer.at;
    const keywordAfter = lexer.next();
    if (keywordAfter instanceof Op && keywordAfter.op === "stream" && isDict(value)) {
      const start = lexer.at + (s[lexer.at] === "\r" ? 2 : 1);
      const length = get(value.get("Length"));
      if (typeof length !== "number") throw new Error(`Stream ${num} has no length`);
      value = new Stream(value, bytes.subarray(start, start + length));
      if (!/^\s*endstream/.test(s.slice(start + length, start + length + 16))) throw new Error(`Stream ${num} doesn't end where its /Length says`);
    } else lexer.at = after;
    const type = name((value instanceof Stream ? value.dict : isDict(value) ? value : new Map()).get("Type"));
    if (type === "ObjStm" || type === "XRef") throw new Error(`Object ${num} is an ${type === "XRef" ? "xref" : "object"} stream`);
    cache.set(num, value);
    return value;
  };
  const get = (value: Value | undefined): Value | undefined => (value instanceof Ref ? object(value.num) : value);
  const dict = (value: Value | undefined): Dict => {
    const found = get(value);
    return isDict(found) ? found : found instanceof Stream ? found.dict : new Map();
  };

  const trailer = sections[0]!.trailer;
  const catalog = dict(trailer.get("Root"));
  if (name(catalog.get("Type")) !== "Catalog") throw new Error("The trailer's /Root is not a catalog");

  // Fonts, colours, images and text: the page's content, and each form XObject it draws, in order.
  const fontCache = new Map<unknown, { font: Font; codes: Map<number, string>; wide: boolean }>();
  const fontOf = (resource: string, ref: Value | undefined) => {
    const key = ref instanceof Ref ? ref.num : (ref ?? resource);
    if (!fontCache.has(key)) {
      const f = dict(ref);
      const descendant = dict((get(f.get("DescendantFonts")) as Value[] | undefined)?.[0]);
      const unicode = get(f.get("ToUnicode"));
      const subtype = name(f.get("Subtype")) ?? "?";
      fontCache.set(key, {
        font: {
          resource,
          subtype,
          baseFont: name(f.get("BaseFont")) ?? "?",
          ...(subtype === "Type0"
            ? { descendant: { subtype: name(descendant.get("Subtype")) ?? "?", baseFont: name(descendant.get("BaseFont")) ?? "?", fontFile2: dict(descendant.get("FontDescriptor")).has("FontFile2") } }
            : {}),
          toUnicode: unicode instanceof Stream,
        },
        codes: unicode instanceof Stream ? toUnicode(unicode.data.toString("latin1")) : new Map(),
        wide: subtype === "Type0",
      });
    }
    return fontCache.get(key)!;
  };
  const pageOf = (ref: Ref, pageDict: Dict, inherited: Dict): Page => {
    const fonts = new Map<string, Font>();
    const states: Dict[] = [];
    const colours = new Set<string>();
    const other: string[] = [];
    let images = 0;
    let text = "";
    const run = (content: Buffer, resources: Dict, depth: number) => {
      if (depth > 8) throw new Error("Forms nested too deep");
      const fontDict = dict(resources.get("Font"));
      for (const [key, value] of fontDict) fonts.set(key, fontOf(key, value).font);
      for (const value of dict(resources.get("ExtGState")).values()) if (!states.includes(dict(value))) states.push(dict(value));
      const lexer = new Lexer(content.toString("latin1"));
      let operands: Value[] = [];
      let current: ReturnType<typeof fontOf> | undefined;
      const show = (value: Value | undefined) => {
        if (!(value instanceof Str) || !current) return;
        const { codes, wide } = current;
        for (let i = 0; i + (wide ? 1 : 0) < value.bytes.length; i += wide ? 2 : 1) text += codes.get(wide ? value.bytes.readUInt16BE(i) : value.bytes[i]!) ?? "\ufffd";
      };
      for (let token = lexer.next(); token !== undefined; token = lexer.next()) {
        if (!(token instanceof Op)) {
          operands.push(token);
          continue;
        }
        const op = token.op;
        if (op === "BT" || op === "ET") text += " ";
        else if (op === "Tf") {
          const key = name(operands[0]) ?? "";
          current = fontOf(key, fontDict.get(key));
        } else if (op === "Tj" || op === "'" || op === '"') show(operands.at(-1));
        else if (op === "TJ") for (const part of (operands[0] as Value[] | undefined) ?? []) show(part);
        else if ((op === "rg" || op === "RG") && operands.length === 3 && operands.every((v) => typeof v === "number"))
          colours.add(`#${operands.map((v) => Math.round(Number(v) * 255).toString(16).padStart(2, "0")).join("")}`);
        else if (op === "rg" || op === "RG") other.push(op);
        else if (["g", "G", "k", "K", "cs", "CS", "sc", "SC", "scn", "SCN", "sh"].includes(op)) other.push(op);
        else if (op === "Do") {
          const xobject = get(dict(resources.get("XObject")).get(name(operands[0]) ?? ""));
          if (xobject instanceof Stream && name(xobject.dict.get("Subtype")) === "Form") run(xobject.data, xobject.dict.has("Resources") ? dict(xobject.dict.get("Resources")) : resources, depth + 1);
          else images++;
        } else if (op === "ID") {
          // An inline image: its data runs to EI.
          const end = /\sEI(?=\s|$)/g;
          end.lastIndex = lexer.at;
          lexer.at = end.exec(lexer.s) ? end.lastIndex : lexer.s.length;
          images++;
        }
        operands = [];
      }
    };
    const resources = dict(pageDict.get("Resources") ?? inherited.get("Resources"));
    const contents = get(pageDict.get("Contents"));
    for (const part of Array.isArray(contents) ? contents : [contents]) {
      const stream = get(part);
      if (stream instanceof Stream) run(stream.data, resources, 0);
    }
    const boxes: Page["boxes"] = Object.fromEntries(
      (["MediaBox", "CropBox", "TrimBox", "BleedBox", "ArtBox"] as const).flatMap((key) => {
        const box = get(pageDict.get(key) ?? (key === "MediaBox" || key === "CropBox" ? inherited.get(key) : undefined));
        return Array.isArray(box) ? [[key, box.map((v) => Number(get(v)))]] : [];
      }),
    );
    return { ref, dict: pageDict, boxes, fonts: [...fonts.values()], extGStates: states, colours: [...colours], otherColourOps: other, images, text: text.replace(/\s+/g, " ").trim() };
  };
  const pages: Page[] = [];
  const walk = (ref: Value | undefined, inherited: Dict, depth: number) => {
    const node = dict(ref);
    if (depth > 16) throw new Error("The page tree is too deep");
    const own: Dict = new Map(inherited);
    for (const key of ["Resources", "MediaBox", "CropBox"]) if (node.has(key)) own.set(key, node.get(key)!);
    if (name(node.get("Type")) === "Pages") for (const kid of (get(node.get("Kids")) as Value[] | undefined) ?? []) walk(kid, own, depth + 1);
    else if (ref instanceof Ref) pages.push(pageOf(ref, node, own));
  };
  walk(catalog.get("Pages"), new Map(), 0);

  const structTypes = new Set<string>();
  const struct = (value: Value | undefined, depth: number) => {
    const node = get(value);
    if (depth > 64) return;
    if (Array.isArray(node)) for (const kid of node) struct(kid, depth + 1);
    else if (isDict(node)) {
      const type = name(node.get("S"));
      if (type) structTypes.add(type);
      struct(node.get("K"), depth + 1);
    }
  };
  struct(dict(catalog.get("StructTreeRoot")).get("K"), 0);

  const outline = (first: Value | undefined, depth: number): OutlineItem[] => {
    const items: OutlineItem[] = [];
    for (let item = dict(first), n = 0; item.size && n < 256; item = dict(item.get("Next")), n++) {
      const title = get(item.get("Title"));
      items.push({ title: title instanceof Str ? title.text : "", children: depth < 8 ? outline(item.get("First"), depth + 1) : [] });
      if (!item.has("Next")) break;
    }
    return items;
  };

  const info = Object.fromEntries(
    [...dict(trailer.get("Info"))].map(([key, value]) => {
      const found = get(value);
      return [key, found instanceof Str ? found.text : found instanceof Name ? found.name : String(found)];
    }),
  );
  const lang = get(catalog.get("Lang"));
  return {
    bytes,
    version,
    sections,
    get,
    catalog,
    pages,
    info,
    structTypes,
    ...(lang instanceof Str ? { lang: lang.text } : {}),
    marked: dict(catalog.get("MarkInfo")).get("Marked") === true,
    outline: outline(dict(catalog.get("Outlines")).get("First"), 0),
  };
}
