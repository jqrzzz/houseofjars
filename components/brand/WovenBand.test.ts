import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WovenBand } from "./WovenBand";

const css = readFileSync(join(process.cwd(), "components/brand/WovenBand.module.css"), "utf8");

/** The CSS outside every @keyframes block: the band's base style, which is its rest frame. */
const outsideKeyframes = css.replace(/@keyframes[\s\S]*?\n}\n/g, "");

/** The body of one @keyframes block. */
const keyframes = (name: string) => css.match(new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n}\\n`))?.[1] ?? "";

/** The declarations of the rule whose selector is exactly `selector`. */
const rule = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`(?:^|\\n)\\s*${escaped} \\{([^}]*)\\}`))?.[1] ?? "";
};

describe("the woven band", () => {
  it("draws the thread and the hearts as two layers, hidden from screen readers", () => {
    const html = renderToStaticMarkup(createElement(WovenBand, { pattern: "diamond" }));
    expect(html).toMatch(/^<div aria-hidden="true" class="_band_[0-9a-f]+ _diamond_[0-9a-f]+"><span class="_thread_[0-9a-f]+"><\/span><span class="_heart_[0-9a-f]+"><\/span><\/div>$/);
  });

  it("weaves in only when asked", () => {
    expect(renderToStaticMarkup(createElement(WovenBand, { pattern: "hooks", weave: true }))).toMatch(/_weave_/);
    expect(renderToStaticMarkup(createElement(WovenBand, { pattern: "hooks" }))).not.toMatch(/_weave_/);
  });
});

describe("the weave (docs/DESIGN.md §10.13)", () => {
  it("draws the motif in behind a soft edge, never a hard wipe", () => {
    expect(css).not.toContain("clip-path");
    const motif = keyframes("weave-motif");
    expect(motif).toContain("mask-image: linear-gradient(to left, var(--feather))");
    expect(motif).toContain("mask-position: 100% 0");
    expect(motif).toContain("mask-position: 0 0");
  });

  it("eases the soft edge, the same ramp both ways, so the sheet over the motif is the edge's exact inverse", () => {
    const feather = css.match(/--feather:([^;]+);/)?.[1] ?? "";
    const stops = [...feather.matchAll(/(#000|transparent|rgb\(0 0 0 \/ ([\d.]+)\)) ([\d.]+)%/g)].map((stop) => ({
      alpha: stop[1] === "#000" ? 1 : stop[1] === "transparent" ? 0 : Number(stop[2]),
      at: Number(stop[3]),
    }));
    expect(stops.length).toBeGreaterThanOrEqual(5);
    expect(stops[0]).toEqual({ alpha: 1, at: 41.67 });
    expect(stops.at(-1)).toEqual({ alpha: 0, at: 58.33 });
    // 240% wide: twice the band plus an edge 40% of it, which starts off the band's left end and ends past its right.
    expect(motifSize()).toBe("240% 100%");
    for (let i = 0; i < stops.length; i++) {
      const mirror = stops[stops.length - 1 - i]!;
      expect(stops[i]!.alpha + mirror.alpha).toBeCloseTo(1, 2);
      expect(stops[i]!.at + mirror.at).toBeCloseTo(100, 1);
      if (i > 0) expect(stops[i]!.alpha).toBeLessThan(stops[i - 1]!.alpha);
    }
  });

  it("keeps the cloth, so a band caught halfway still shows its cloth and selvedges", () => {
    // The ground (::before) and the thread layer never animate; only the sheet over the motif and the hearts do.
    expect(css).not.toMatch(/\.weave::before[^{]*\{[^}]*animation/);
    expect(css).not.toMatch(/\.weave \.thread[^{]*\{[^}]*animation/);
    for (const motif of ["diamond", "lozenge", "hooks"]) expect(rule(`.${motif}`)).toMatch(/--selvedge: calc\([\d.]+ \/ \d+ \* 100%\)/);
    expect(rule(".weave::after")).toContain("inset: var(--selvedge) 0");
  });

  it("warms the hearts in behind the thread, not ahead of it", () => {
    const range = (selector: string) => rule(selector).match(/animation-range: cover (\d+)% cover (\d+)%/)!.slice(1).map(Number);
    const [motifFrom, motifTo] = range(".weave::after");
    const [heartsFrom, heartsTo] = range(".weave .heart");
    expect(heartsFrom).toBeGreaterThan(motifFrom!);
    expect(heartsTo).toBeGreaterThan(motifTo!);
    expect(keyframes("weave-hearts")).toMatch(/from \{\s*opacity: 0;/);
  });

  it("drives every part from the band's own view timeline, at the scroll's length", () => {
    expect(rule(".weave")).toContain("view-timeline: --weave");
    for (const selector of [".weave::after", ".weave .heart"]) {
      const body = rule(selector);
      expect(body, selector).toContain("animation-timeline: --weave");
      // After the shorthand, whose 0s would otherwise end the animation at once.
      expect(body.indexOf("animation-duration: auto"), selector).toBeGreaterThan(body.indexOf("animation:"));
      expect(body, selector).toMatch(/animation: [\w-]+ linear both/);
    }
  });

  it("rests woven: the sheet, its mask and the glow exist only while the weave runs", () => {
    const motion = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"));
    expect(motion).toMatch(/^@media \(prefers-reduced-motion: no-preference\) \{\s*@supports \(animation-timeline: view\(\)\) \{/);
    expect(outsideKeyframes).not.toMatch(/mask-image|mask-position|opacity|filter|background-color/);
  });
});

function motifSize() {
  return keyframes("weave-motif").match(/\n\s*mask-size: ([^;]+);/)?.[1];
}
