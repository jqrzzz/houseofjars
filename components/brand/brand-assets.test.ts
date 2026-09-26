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

  it("sizes the textile band in the tile's proportions", () => {
    const tile = read("public/brand/textile.svg");
    const [, , width, height] = (/viewBox="([^"]+)"/.exec(tile)?.[1] ?? "").split(" ").map(Number);
    const css = read("components/brand/TextileBand.module.css");
    expect(css).toContain(`mask-size: ${width}px ${height}px`);
    // The small band keeps the same ratio.
    const small = /\.s \{[^}]*mask-size: ([\d.]+)px ([\d.]+)px/.exec(css);
    expect(Number(small?.[1]) / Number(small?.[2])).toBeCloseTo(width! / height!, 2);
  });
});
