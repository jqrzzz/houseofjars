import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { houseIcons } from "../ui/house-icons";
import { ARCH_OUTLINE, MARK_PARTS, MARK_PATH, MARK_VIEWBOX } from "./mark-shape";

const root = process.cwd();

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

  it("carries every icon in brand/icons, path for path, and no other", () => {
    const files = readdirSync(join(root, "brand/icons")).filter((name) => name.endsWith(".svg"));
    expect(Object.keys(houseIcons).sort()).toEqual(files.map((name) => name.replace(/\.svg$/, "")).sort());
    for (const file of files) {
      const paths = [...readFileSync(join(root, "brand/icons", file), "utf8").matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]);
      expect(houseIcons[file.replace(/\.svg$/, "") as keyof typeof houseIcons], file).toEqual(paths);
    }
  });

  it("splits the mark into its five blocks, which together are the whole mark", () => {
    expect(MARK_PARTS).toHaveLength(5);
    expect(MARK_PARTS.join("")).toBe(MARK_PATH);
  });
});

describe("the curtain weave", () => {
  const css = readFileSync(join(process.cwd(), "components/brand/WovenBand.module.css"), "utf8");
  const viewBox = (file: string) => readFileSync(join(process.cwd(), "public/brand", file), "utf8").match(/viewBox="([^"]+)"/)?.[1];

  it("has a thread tile and a heart tile of the same size for every motif, so the two layers line up", () => {
    for (const motif of ["diamond", "lozenge", "hooks"]) {
      expect(css).toContain(`url("/brand/weave-${motif}.svg")`);
      expect(css).toContain(`url("/brand/weave-${motif}-heart.svg")`);
      expect(viewBox(`weave-${motif}.svg`), motif).toBeTruthy();
      expect(viewBox(`weave-${motif}-heart.svg`), motif).toBe(viewBox(`weave-${motif}.svg`));
    }
  });
});
