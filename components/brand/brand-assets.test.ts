import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ARCH_OUTLINE, MARK_PATH, MARK_VIEWBOX } from "./mark-shape";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const pathIn = (svg: string) => /<path[^>]*\sd="([^"]+)"/.exec(svg)?.[1] ?? "";

describe("brand assets stay in sync", () => {
  it("draws the same arch in the component, the brand kit, the public mark and the favicon", () => {
    for (const file of ["brand/logos/mark-orange.svg", "brand/logos/mark-ink.svg", "brand/logos/mark-white.svg", "public/brand/mark.svg"]) {
      expect(pathIn(read(file)), file).toBe(MARK_PATH);
      expect(read(file), file).toContain(`viewBox="${MARK_VIEWBOX}"`);
    }
    expect(pathIn(read("app/icon.svg"))).toBe(MARK_PATH);
    expect(pathIn(read("brand/logos/app-icon.svg"))).toBe(MARK_PATH);
  });

  it("keeps the mark on its 2:3 grid, and the frame's outline inside a unit box", () => {
    const [, , width, height] = MARK_VIEWBOX.split(" ").map(Number);
    expect(width! / height!).toBeCloseTo(2 / 3, 6);
    const numbers = ARCH_OUTLINE.match(/\d+(\.\d+)?/g)!.map(Number);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(1);
  });

  it("paints the favicon in the house's orange with a white mark", () => {
    const icon = read("app/icon.svg");
    expect(icon).toContain('fill="#e76e43"');
    expect(icon).toContain('fill="#ffffff"');
  });
});
