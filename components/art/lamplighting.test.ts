import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroLamps } from "@/components/home/HeroLamps";
import { SPLASH_MS } from "@/lib/theme";

/*
 * The Lamplighting (HouseLamp.module.css) and the hero lamps' stutter
 * (Hero.module.css), read from the stylesheets themselves: the timings that
 * must agree with each other, with the splash, and with the rules for calm,
 * flash-free light (docs/DESIGN.md §4.1, §10.12).
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const lampCss = read("components/art/HouseLamp.module.css");
const heroCss = read("components/home/Hero.module.css");
const globals = read("app/globals.css");

const ms = (text: string) => (text.endsWith("ms") ? Number(text.slice(0, -2)) : Number(text.slice(0, -1)) * 1000);

/** The timing after an animation's name in a shorthand, up to its comma: "2560ms var(--ease-lamp) calc(...) both". */
function timingOf(css: string, name: string): string {
  const found = new RegExp(`\\b${name} `).exec(css);
  expect(found, `${name} is animated`).not.toBeNull();
  const start = found!.index + found![0].length;
  let depth = 0;
  for (let k = start; k < css.length; k++) {
    if (css[k] === "(") depth++;
    else if (css[k] === ")") depth--;
    else if (depth === 0 && (css[k] === "," || css[k] === ";")) return css.slice(start, k).trim();
  }
  throw new Error(`${name}'s timing never ends`);
}

/** A @keyframes block's body. */
function keyframes(css: string, name: string): string {
  const start = css.indexOf(`@keyframes ${name} {`);
  expect(start, `@keyframes ${name}`).toBeGreaterThan(-1);
  let depth = 0;
  for (let k = css.indexOf("{", start); k < css.length; k++) {
    if (css[k] === "{") depth++;
    if (css[k] === "}" && --depth === 0) return css.slice(css.indexOf("{", start) + 1, k);
  }
  throw new Error(`@keyframes ${name} is not closed`);
}

/** Each keyframe's offsets (0 to 1) and the value it gives one property, in order. */
function stops(body: string, property: string): [number, string][] {
  const out: [number, string][] = [];
  for (const [, selectors, block] of body.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const value = new RegExp(`${property}:\\s*([^;]+);`).exec(block!)?.[1]?.trim();
    if (!value) continue;
    for (const selector of selectors!.split(",").map((s) => s.trim())) {
      out.push([selector === "from" ? 0 : selector === "to" ? 1 : Number(selector.replace("%", "")) / 100, value]);
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
}

/** Where a cubic-bezier easing has got to at time x (0 to 1). */
function bezier([x1, y1, x2, y2]: number[], x: number): number {
  const at = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let [lo, hi] = [0, 1];
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (at(mid, x1!, x2!) < x) lo = mid;
    else hi = mid;
  }
  return at(lo, y1!, y2!);
}

const easeLamp = /--ease-lamp: cubic-bezier\(([^)]+)\)/.exec(globals)![1]!.split(",").map(Number);
const stagger = ms(/var\(--i\) \* (\d+ms)/.exec(timingOf(lampCss, "lamp-lower"))![1]!);
const splashT0 = ms(/:global\(html\.splash\) \.lamp \{\s*--t0: (\d+ms)/.exec(lampCss)![1]!);
/** When, after --t0, a bulb catches in the first phrase (--light-at's starting value). */
const lightAt = ms(/\n\.lamp \{\s*--light-at: (\d+ms);/.exec(lampCss)![1]!);
/** When, after --t0, the first phrase hands over and --light-at drops to 0. */
const hungAt = ms(/lamp-hung 0s calc\(var\(--t0\) \+ (\d+ms)\) forwards/.exec(lampCss)![1]!);
/** The latest any lamp's mote ends, after --t0, in the first phrase. */
function lastMote(): number {
  const markup = renderToStaticMarkup(createElement(HeroLamps));
  const motes = [...markup.matchAll(/--w:(\d+)ms;--d:(\d+)ms/g)].map(([, w, d]) => Number(w) + Number(d));
  expect(motes).toHaveLength(3);
  const after = ms(/--delay: calc\(var\(--t0\) \+ var\(--light-at\) \+ (\d+ms) \+ var\(--i\)/.exec(lampCss)![1]!);
  return lightAt + after + 2 * stagger + Math.max(...motes);
}

describe("the Lamplighting", () => {
  it("lets each shade down exactly as its cord pays out: one duration, one easing, one start", () => {
    expect(timingOf(lampCss, "lamp-pay-out")).toBe(timingOf(lampCss, "lamp-lower"));
    // The cord grows from nothing at the ceiling; the drawing starts its cord's length higher (its height less the 24 px shade).
    expect(keyframes(lampCss, "lamp-pay-out")).toMatch(/from \{\s*scale: 1 0;\s*\}/);
    expect(keyframes(lampCss, "lamp-lower")).toMatch(/from \{\s*translate: 0 calc\(24px - 100%\);\s*\}/);
  });

  it("lowers slowly and never past its rest: a long, gentle curve with no overshoot", () => {
    const lower = timingOf(lampCss, "lamp-lower");
    expect(ms(lower.split(" ")[0]!)).toBeGreaterThanOrEqual(2400);
    expect(lower).toContain("var(--ease-lamp)");
    // Starts from rest, and its y never leaves 0 to 1.
    expect(easeLamp[1]).toBe(0);
    expect(Math.min(easeLamp[1]!, easeLamp[3]!)).toBeGreaterThanOrEqual(0);
    expect(Math.max(easeLamp[1]!, easeLamp[3]!)).toBeLessThanOrEqual(1);
  });

  it("lights a lamp only once it hangs still, its halo with its bulb", () => {
    const light = timingOf(lampCss, "lamp-light-day");
    expect(timingOf(lampCss, "lamp-halo-day")).toBe(light);
    expect(light).toContain("calc(var(--t0) + var(--light-at) + var(--i) *");
    const lower = timingOf(lampCss, "lamp-lower");
    expect(bezier(easeLamp, lightAt / ms(lower.split(" ")[0]!))).toBeGreaterThan(0.98);
  });

  it("relights at once after a theme switch, once the first phrase has handed over", () => {
    // lamp-hung only marks the moment (HouseLamp.tsx sets [data-hung] as it ends): a property an animation sets may not time another.
    expect(keyframes(lampCss, "lamp-hung")).not.toContain("--light-at");
    expect(lampCss).toMatch(/\.lamp\[data-hung\] \{\s*--light-at: 0ms;\s*\}/);
    // Only after every mote has gone (moving the light's start mid-phrase would make it jump), and before the splash lifts.
    expect(hungAt).toBeGreaterThanOrEqual(lastMote());
    expect(splashT0 + hungAt).toBeLessThanOrEqual(SPLASH_MS - 500);
  });

  it("catches light the same way by Day and by Evening (one keyframes per theme, so a switch relights it)", () => {
    expect(keyframes(lampCss, "lamp-light-evening")).toBe(keyframes(lampCss, "lamp-light-day"));
    expect(keyframes(lampCss, "lamp-halo-evening")).toBe(keyframes(lampCss, "lamp-halo-day"));
  });

  it("warms up with two soft dips, never more than three a second, then burns steady", () => {
    const duration = ms(timingOf(lampCss, "lamp-halo-day").split(" ")[0]!);
    const opacity = stops(keyframes(lampCss, "lamp-halo-day"), "opacity").map(([at, value]) => [at * duration, Number(value)] as const);
    const dips = opacity.filter(([, value], k) => k > 0 && k < opacity.length - 1 && value < opacity[k - 1]![1] && value < opacity[k + 1]![1]);
    expect(dips).toHaveLength(2);
    for (const [at] of dips) expect(dips.filter(([other]) => Math.abs(other - at) < 1000).length).toBeLessThanOrEqual(3);
    // Each dip is soft: never back to dark, and rounded by --ease-sway.
    expect(Math.min(...dips.map(([, value]) => value))).toBeGreaterThanOrEqual(0.4);
    expect(timingOf(lampCss, "lamp-halo-day")).toContain("var(--ease-sway)");
    expect(opacity.at(-1)![1]).toBe(1);
  });

  it("has finished, the last mote too, well before the boot script lifts html.splash", () => {
    const last = (start: number, run: number) => splashT0 + start + 2 * stagger + run;
    const ends = [
      last(0, ms(timingOf(lampCss, "lamp-lower").split(" ")[0]!)),
      last(0, ms(timingOf(lampCss, "lamp-sway").split(" ")[0]!)),
      last(lightAt, ms(timingOf(lampCss, "lamp-light-day").split(" ")[0]!)),
      splashT0 + lastMote(),
    ];
    expect(Math.max(...ends)).toBeLessThanOrEqual(SPLASH_MS - 500);
  });
});

describe("the hero lamps' stutter", () => {
  const cycles = [...heroCss.matchAll(/\.hang:nth-child\((\d)\) \{\s*--cycle: (\d+)s;\s*--first: (\d+)s;/g)].map(([, n, cycle, first]) => ({
    n: Number(n),
    cycle: Number(cycle),
    first: Number(first),
  }));
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

  it("comes rarely, tens of seconds apart, each lamp on a cycle of its own, so the three never keep time", () => {
    expect(cycles.map((c) => c.n)).toEqual([1, 2, 3]);
    for (const { cycle, first } of cycles) {
      expect(cycle).toBeGreaterThanOrEqual(20);
      // Not before the Lamplighting is over, even under the splash.
      expect(first * 1000).toBeGreaterThanOrEqual(SPLASH_MS);
    }
    for (const a of cycles) for (const b of cycles) if (a !== b) expect(gcd(a.cycle, b.cycle)).toBe(1);
    expect(new Set(cycles.map((c) => c.first)).size).toBe(3);
  });

  it("is faint and brief: two dips of a few percent, within half a second, never more than three a second", () => {
    const shortest = Math.min(...cycles.map((c) => c.cycle)) * 1000;
    const longest = Math.max(...cycles.map((c) => c.cycle)) * 1000;
    for (const [name, fn] of [
      ["lamp-dim", "brightness"],
      ["lamp-fade", "opacity"],
    ] as const) {
      const levels = stops(keyframes(lampCss, name), "filter").map(([at, value]) => [at, Number(new RegExp(`${fn}\\(([\\d.]+)\\)`).exec(value)![1])] as const);
      const dips = levels.filter(([, value]) => value < 1);
      expect(dips, name).toHaveLength(2);
      expect(Math.min(...dips.map(([, value]) => value)), name).toBeGreaterThanOrEqual(0.8);
      const lastChange = Math.max(...levels.filter(([at]) => at < 1).map(([at]) => at));
      expect(lastChange * longest, name).toBeLessThanOrEqual(800);
      expect(Math.abs(dips[1]![0] - dips[0]![0]) * shortest, name).toBeGreaterThan(200);
    }
    // The shade and its halo dip together.
    const at = (name: string) => stops(keyframes(lampCss, name), "filter").map(([offset]) => offset);
    expect(at("lamp-fade")).toEqual(at("lamp-dim"));
  });

  it("dips only the light, on the cycle the hero gives it: never a lamp without one", () => {
    const dim = timingOf(lampCss, "lamp-dim");
    expect(dim).toBe("var(--cycle, 0s) var(--ease-sway) var(--first, 0s) infinite");
    expect(timingOf(lampCss, "lamp-fade")).toBe(dim);
    // The halo's stutter is a filter, so it never fights its warm-up's opacity; neither touches the rose or the cord.
    expect(keyframes(lampCss, "lamp-fade")).not.toMatch(/(^|[^-])opacity:/);
    expect(read("components/book/BookingFlow.module.css")).not.toContain("--cycle");
  });

  it("rests while the lamps are off screen or the tab is hidden, on the row StageLife watches", () => {
    expect(lampCss).toMatch(/\[data-stage\]:not\(\[data-live\]\)\) \.lamp svg \{\s*animation-play-state: running, running, paused;/);
    expect(lampCss).toMatch(/\[data-stage\]:not\(\[data-live\]\)\) \.halo \{\s*animation-play-state: running, paused;/);
    const markup = renderToStaticMarkup(createElement(HeroLamps));
    expect(markup).toMatch(/^<div class="_lamps_[0-9a-f]+" data-stage="" aria-hidden="true">/);
    expect(markup.match(/class="_hang_/g)).toHaveLength(3);
  });
});

describe("motion that stops", () => {
  /** Every animation shorthand with the blocks it sits in, outermost first. */
  function animated(css: string): { headers: string[]; declaration: string }[] {
    const out: { headers: string[]; declaration: string }[] = [];
    const stack: string[] = [];
    let start = 0;
    for (let k = 0; k < css.length; k++) {
      if (css[k] === "{") {
        stack.push(css.slice(start, k).replace(/\/\*[\s\S]*?\*\//g, "").trim());
        start = k + 1;
      } else if (css[k] === "}") {
        stack.pop();
        start = k + 1;
      } else if (css[k] === ";") {
        const declaration = css.slice(start, k).replace(/\/\*[\s\S]*?\*\//g, "").trim();
        if (/^animation(-name)?:/.test(declaration) && !stack.some((h) => h.startsWith("@keyframes"))) out.push({ headers: [...stack], declaration });
        start = k + 1;
      }
    }
    return out;
  }

  it("animates the lamps only with motion welcome: never under Still or reduced motion", () => {
    const found = [...animated(lampCss), ...animated(heroCss)];
    expect(found.length).toBeGreaterThanOrEqual(8);
    for (const { headers, declaration } of found) {
      expect(headers.some((h) => h.includes("prefers-reduced-motion: no-preference")), declaration).toBe(true);
      expect(headers.at(-1), declaration).toContain(':not([data-motion="still"])');
    }
  });
});
