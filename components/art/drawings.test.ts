import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { drawings } from "./drawings";

describe("the illustration set", () => {
  for (const [name, drawing] of Object.entries(drawings)) {
    it(`${name}: the size the page reserves is the drawing's own, so nothing shifts as it loads`, () => {
      const svg = readFileSync(join(process.cwd(), "public", drawing.src), "utf8");
      const [, , width, height] = (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? "").split(" ").map(Number);
      expect(width! / height!).toBeCloseTo(drawing.width / drawing.height, 3);
      expect(svg).toContain(`width="${drawing.width}" height="${drawing.height}"`);
    });

    it(`${name}: carries its own night colours and draws no filters`, () => {
      const svg = readFileSync(join(process.cwd(), "public", drawing.src), "utf8");
      expect(svg).toContain("@media (prefers-color-scheme:dark)");
      expect(svg).not.toContain("<filter");
    });
  }
});
