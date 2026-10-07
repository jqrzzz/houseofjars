/**
 * The site's CSS Modules, outside Next: so `npm run social` can draw the real ShadowFigure and WovenBand
 * (components/) on its pages without a route in the app or a copy of their styles.
 *
 * A module's classes become "<Basename>__<key>" (ShadowFigure.module.css's .band is .ShadowFigure__band), so two
 * modules never collide: ShadowFigure's .band (a rect of his cap) and WovenBand's .band (the whole band) are
 * different things. scripts/social/css-hook.mjs hands components the same class map when they import a module;
 * loadCssModule() gives the stylesheet to inline beside them.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

export interface CssModule {
  /** Each class in the file, as the component asks for it, to the name it carries on the page. */
  readonly classes: Readonly<Record<string, string>>;
  /** The stylesheet with its classes renamed and :global(…) unwrapped. */
  readonly css: string;
}

const IDENT_START = /[A-Za-z_]/;
const IDENT = /[\w-]/;

/** The index just past the string, comment or bracketed run that starts at i (one of ' " /* ( ). */
function skip(source: string, i: number): number {
  const c = source[i];
  if (c === "/" && source[i + 1] === "*") {
    const end = source.indexOf("*/", i + 2);
    return end < 0 ? source.length : end + 2;
  }
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < source.length && source[j] !== c) j += source[j] === "\\" ? 2 : 1;
    return j + 1;
  }
  // A bracketed run: ( … ), with strings inside it.
  let depth = 0;
  let j = i;
  while (j < source.length) {
    const d = source[j]!;
    if (d === '"' || d === "'") {
      j = skip(source, j);
      continue;
    }
    if (d === "(") depth++;
    if (d === ")" && --depth === 0) return j + 1;
    j++;
  }
  return j;
}

/** A selector list with its classes renamed: never inside strings or attribute values, and :global(x) left as x. */
function scopeSelector(prelude: string, rename: (key: string) => string): string {
  let out = "";
  let i = 0;
  while (i < prelude.length) {
    const c = prelude[i]!;
    if (prelude.startsWith(":global(", i)) {
      const end = skip(prelude, i + ":global".length);
      out += prelude.slice(i + ":global(".length, end - 1);
      i = end;
    } else if (c === '"' || c === "'" || (c === "/" && prelude[i + 1] === "*")) {
      const end = skip(prelude, i);
      out += prelude.slice(i, end);
      i = end;
    } else if (c === "[") {
      // An attribute selector: copy to its closing bracket, strings and all.
      let j = i + 1;
      while (j < prelude.length && prelude[j] !== "]") j = prelude[j] === '"' || prelude[j] === "'" ? skip(prelude, j) : j + 1;
      out += prelude.slice(i, j + 1);
      i = j + 1;
    } else if (c === "." && IDENT_START.test(prelude[i + 1] ?? "") && !IDENT.test(prelude[i - 1] ?? " ")) {
      let j = i + 1;
      while (j < prelude.length && IDENT.test(prelude[j]!)) j++;
      out += `.${rename(prelude.slice(i + 1, j))}`;
      i = j;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/**
 * Scopes a CSS Module's text as Next would, with readable names. Style rules' selectors are renamed; declarations,
 * url()s, strings, comments and at-rule preludes (@media, @supports, @keyframes and its stops) are left as written.
 */
export function scopeCssModule(source: string, name: string): CssModule {
  const classes: Record<string, string> = {};
  const rename = (key: string) => (classes[key] = `${name}__${key}`);
  let out = "";
  let prelude = "";
  // What each open block holds: rules (the sheet, @media, @supports, @keyframes) or declarations.
  const blocks: ("rules" | "declarations")[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i]!;
    const inDeclarations = blocks.at(-1) === "declarations";
    if (c === '"' || c === "'" || (c === "/" && source[i + 1] === "*") || (c === "(" && !inDeclarations)) {
      const end = skip(source, i);
      if (inDeclarations) out += source.slice(i, end);
      else prelude += source.slice(i, end);
      i = end;
      continue;
    }
    if (inDeclarations) {
      if (c === "(") {
        // url( … ) and every other function: copied whole, so nothing in it is mistaken for a brace.
        const end = skip(source, i);
        out += source.slice(i, end);
        i = end;
        continue;
      }
      if (c === "}") blocks.pop();
      out += c;
      i++;
      continue;
    }
    if (c === "{") {
      const atRule = prelude.trimStart().startsWith("@");
      out += atRule ? prelude : scopeSelector(prelude, rename);
      out += c;
      prelude = "";
      blocks.push(atRule ? "rules" : "declarations");
    } else if (c === "}" || c === ";") {
      // The end of a rules block, or an at-rule without a block (@import, @charset).
      out += prelude + c;
      prelude = "";
      if (c === "}") blocks.pop();
    } else {
      prelude += c;
    }
    i++;
  }
  return { classes, css: out + prelude };
}

/** A CSS Module from disk, named after its file: components/brand/WovenBand.module.css is "WovenBand". */
export function loadCssModule(path: string): CssModule {
  return scopeCssModule(readFileSync(path, "utf8"), basename(path, ".module.css"));
}
