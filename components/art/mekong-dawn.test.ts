import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MekongDawn } from "@/components/home/MekongDawn";
import { GROUND, JARS, LAND_SHARE, SCENE, SUN } from "./mekong-dawn";
import { mekongDawnSvg } from "./mekong-dawn-svg";

describe("Mekong dawn", () => {
  it("stands every jar on the bank, in front of the river", () => {
    for (const jar of JARS) {
      expect(jar.y).toBeGreaterThan(GROUND);
      expect(jar.y).toBeLessThan(SCENE.height);
    }
  });

  it("keeps every jar's foot in the part of the scene a phone shows", () => {
    // Phones show the rightmost 700 units (the CSS sizes the scene so the cluster spans the screen).
    for (const jar of JARS) expect(jar.x - (jar.spec.w / 2) * 1.05).toBeGreaterThan(SCENE.width - 700);
  });

  it("puts the sun behind the big jar, low over the far bank", () => {
    const big = JARS.reduce((a, b) => (b.spec.h > a.spec.h ? b : a));
    expect(Math.abs(SUN.cx - big.x)).toBeLessThan(big.spec.w / 2 + SUN.r);
    expect(SUN.cy - SUN.r).toBeLessThan(big.y - big.spec.h * 0.6);
  });

  it("leaves room under the hero's words for the river, with the share the CSS uses", () => {
    const css = readFileSync(join(process.cwd(), "components/home/Hero.module.css"), "utf8");
    expect(css).toContain(`calc(var(--scene-height) * ${LAND_SHARE.toFixed(3)} +`);
  });

  it("stays within the inline SVG budget", () => {
    const markup = renderToStaticMarkup(createElement(MekongDawn));
    // The whole page's inline SVG should stay near 20 kB; the hero takes at most half.
    expect(Buffer.byteLength(markup)).toBeLessThan(10_000);
    expect(markup).not.toContain("<filter");
  });

  it("draws the same scene for the Open Graph cards, with the sun's gradient once", () => {
    const svg = mekongDawnSvg(-400);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-400 0 2000 760">')).toBe(true);
    expect(svg.match(/#ff6b35/g)).toHaveLength(1);
    for (const jar of JARS) expect(svg).toContain(`clip-${jar.id}`);
  });
});
