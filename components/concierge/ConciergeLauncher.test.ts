import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ConciergeLauncher } from "./ConciergeLauncher";
import { shadowDock } from "./mascot";

const dock = renderToStaticMarkup(createElement(ConciergeLauncher));
const css = readFileSync(join(process.cwd(), "components/concierge/ConciergeLauncher.module.css"), "utf8");
const file = (src: string) => join(process.cwd(), "public", src);

/** The CSS from a selector's first appearance to the end of its block. */
const block = (selector: string) => {
  const start = css.indexOf(selector);
  expect(start, `${selector} is in the stylesheet`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
};

describe("ConciergeLauncher", () => {
  it("shows the 3D Shadow, whole, as a decorative picture in two sharpnesses", () => {
    const img = /<img [^>]*>/.exec(dock)?.[0] ?? "";
    expect(img).toContain(`src="${shadowDock.src}"`);
    expect(img).toContain(`srcSet="${shadowDock.src} 1x, ${shadowDock.src2x} 2x"`);
    expect(img).toContain(`width="${shadowDock.width}"`);
    expect(img).toContain(`height="${shadowDock.height}"`);
    // The button carries his name; the picture adds nothing for a screen reader.
    expect(img).toContain('alt=""');
    // An ambient animation, so StageLife can pause it.
    expect(img).toMatch(/class="[^"]*\bamb\b/);
    // The flat bust in its arch tile is gone from the dock.
    expect(dock).not.toContain("<svg");
  });

  it("keeps the button a named control that opens Shadow's window, with Book direct beside it", () => {
    expect(dock).toContain('aria-label="Ask Shadow, our AI concierge"');
    expect(dock).toContain('aria-haspopup="dialog"');
    expect(dock).toContain('aria-expanded="false"');
    expect(dock).toMatch(/<span class="[^"]+" aria-hidden="true">Ask Shadow<\/span>/);
    expect(dock).toMatch(/<a [^>]*href="\/book"[^>]*>Book direct<\/a>/);
  });

  it("is a stage of its own, so his float waits while the tab is hidden", () => {
    expect(dock).toMatch(/<aside aria-label="Ask Shadow" class="[^"]+" data-stage=""/);
  });

  it("serves files that match their declared sizes and stay tiny", async () => {
    const one = await sharp(file(shadowDock.src)).metadata();
    const two = await sharp(file(shadowDock.src2x)).metadata();
    expect([one.width, one.height]).toEqual([shadowDock.width, shadowDock.height]);
    expect([two.width, two.height]).toEqual([shadowDock.width * 2, shadowDock.height * 2]);
    expect(one.hasAlpha && two.hasAlpha).toBe(true);
    expect(statSync(file(shadowDock.src)).size + statSync(file(shadowDock.src2x)).size).toBeLessThan(12_000);
  });
});

describe("Shadow's float", () => {
  it("only floats when motion is allowed, and comes to rest at his base style", () => {
    const gated = /@media \(prefers-reduced-motion: no-preference\) \{\s*:global\(:root:not\(\[data-motion="still"\]\)\) \.figure \{\s*animation: shadow-float/;
    expect(css).toMatch(gated);
    // Declared once, inside that gate.
    expect(css.match(/animation: shadow-float/g)).toHaveLength(1);
    // Up and back: the first and last frames are his base style, so nothing jumps when it stops.
    expect(block("@keyframes shadow-float")).not.toMatch(/\b(0|100)%/);
  });

  it("stays within the house's ambient limits: slow, and a few pixels at most", () => {
    const [, seconds] = /animation: shadow-float ([\d.]+)s/.exec(css) ?? [];
    expect(Number(seconds)).toBeGreaterThanOrEqual(5);
    const rises = [...css.matchAll(/--float-rise: (-?\d+)px/g)].map((match) => Math.abs(Number(match[1])));
    expect(rises.length).toBeGreaterThan(0);
    for (const rise of rises) expect(rise).toBeLessThanOrEqual(6);
    // The lift to the pointer or focus stays within the same 6 px (0.375rem).
    const lifts = [...css.matchAll(/--float-lift: (-?[\d.]+)rem/g)].map((match) => Math.abs(Number(match[1])));
    expect(lifts.length).toBeGreaterThan(0);
    for (const lift of lifts) expect(lift).toBeLessThanOrEqual(0.375);
  });

  it("waits whenever the dock or his button steps aside", () => {
    expect(css).toContain("animation-play-state: var(--float-state, running);");
    for (const selector of [
      '.dock[data-hidden="true"] {',
      '.dock[data-hidden="ask"] .launcher {',
      '.dock:not([data-header="false"]) {',
      ":global(html:has(dialog[open])) .dock {",
      '  .dock[data-hidden="ask"] {',
    ]) {
      expect(block(selector), selector).toContain("--float-state: paused;");
    }
  });
});
