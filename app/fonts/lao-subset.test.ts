import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { laoNumeral } from "@/content/text";
import { mappedCharacters, woff2Tables } from "@/lib/fonts/woff2";

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
