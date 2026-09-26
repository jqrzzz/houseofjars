import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { JAR_BODY, JAR_CARVE, JAR_PATH } from "./jar-shape";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("brand assets stay in sync", () => {
  it("draws the same jar in the component, the public mark and the favicon", () => {
    expect(JAR_PATH).toBe(JAR_BODY + JAR_CARVE);
    // SVG files may put spaces between subpaths; compare the path data itself.
    const squash = (path: string) => path.replace(/\s+(?=[MZ])/g, "");
    const pathIn = (svg: string) => squash(/<path[^>]*\sd="([^"]+)"/.exec(svg)?.[1] ?? "");
    expect(pathIn(read("public/brand/jar.svg"))).toBe(JAR_PATH);
    expect(pathIn(read("app/icon.svg"))).toBe(JAR_PATH);
  });

  it("draws each woven band at its tile's own height, keeping its proportions", () => {
    const css = read("components/brand/TextileBand.module.css");
    // Tiles scale with the band's height, so their proportions hold.
    expect(css).toContain("auto 100% repeat-x");
    for (const pattern of ["diamond", "lozenge", "hooks"]) {
      const tile = read(`public/brand/textile-${pattern}.svg`);
      const [, , , tileHeight] = (/viewBox="([^"]+)"/.exec(tile)?.[1] ?? "").split(" ").map(Number);
      const rule = new RegExp(`\\.${pattern} \\{[^}]*--band-height: (\\d+)px[^}]*--band-tile: url\\("/brand/textile-${pattern}\\.svg"\\)`);
      const height = Number(rule.exec(css)?.[1]);
      // One tile unit per pixel keeps the warp's hairlines crisp.
      expect(height).toBe(tileHeight);
    }
  });
});
