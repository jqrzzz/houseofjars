import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TURN_HALF_MS, TURN_OUT_EASING, TURN_PERSPECTIVE_PX, TURN_SHADE, turnCard } from "./turn";

/*
 * The menu card's motion (docs/DESIGN.md §10.14): the phone's turn is /menu's
 * one signature move and the steam over the cup its one phrase. Both rest
 * under Still and reduced motion, no light changes faster than 400 ms, and
 * nothing a guest reads a price from ever moves.
 */
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const sheets = ["components/menu/MenuCard.module.css", "components/menu/MenuFaces.module.css"];
const globals = read("app/globals.css");

/** The stylesheet as rules: each selector with its declarations and the at-rules it sits in. */
function rules(css: string) {
  const found: { selector: string; at: string[]; declarations: [string, string][] }[] = [];
  const at: string[] = [];
  let prelude = "";
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === "{") {
      const head = prelude.trim().replace(/\s+/g, " ");
      prelude = "";
      if (head.startsWith("@")) {
        at.push(head);
        continue;
      }
      const end = text.indexOf("}", i);
      const declarations = text
        .slice(i + 1, end)
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => [part.slice(0, part.indexOf(":")).trim(), part.slice(part.indexOf(":") + 1).trim()] as [string, string]);
      found.push({ selector: head, at: [...at], declarations });
      i = end;
    } else if (c === "}") {
      at.pop();
      prelude = "";
    } else {
      prelude += c;
    }
  }
  return found;
}

/** A token's value in app/globals.css (its Day value, the first one). */
const token = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(globals)?.[1]?.trim() ?? "";

/** Milliseconds from "960ms", "0.6s" or var(--dur-*). */
function ms(value: string): number {
  const named = /^var\((--[a-z-]+)\)$/.exec(value);
  if (named) return ms(token(named[1]!));
  const [, amount = "NaN", unit] = /^([\d.]+)(ms|s)$/.exec(value) ?? [];
  return Number(amount) * (unit === "s" ? 1000 : 1);
}

const moving = (declarations: [string, string][]) => declarations.filter(([property]) => /^(?:animation|transition)(?:-name|-duration)?$/.test(property));

describe("the menu card's stylesheets", () => {
  for (const file of sheets) {
    const all = rules(read(file));

    it(`${file}: moves only where motion is allowed, under Full and without reduced motion`, () => {
      const animated = all.filter((rule) => moving(rule.declarations).length > 0);
      expect(animated.length).toBeGreaterThan(0);
      for (const rule of animated) {
        expect(rule.at, rule.selector).toContain("@media (prefers-reduced-motion: no-preference)");
        expect(rule.selector).toMatch(/^:global\(:root:not\(\[data-motion="still"\]\)\) /);
      }
    });

    it(`${file}: never moves a price, a row or a table cell`, () => {
      for (const rule of all.filter((candidate) => moving(candidate.declarations).length > 0)) {
        expect(rule.selector).not.toMatch(/price|row|list|drinks|cell|\b(?:td|th|tr|table|tbody|thead)\b/i);
      }
    });

    it(`${file}: changes no light faster than 400 ms`, () => {
      for (const rule of all) {
        for (const [, value] of rule.declarations.filter(([property]) => property === "transition")) {
          for (const part of value.split(/,(?![^(]*\))/)) {
            const [property = "", duration = ""] = part.trim().split(/\s+/);
            if (/opacity|color|background|filter|fill|stroke|shadow/.test(property)) expect(ms(duration), `${rule.selector}: ${part}`).toBeGreaterThanOrEqual(400);
          }
        }
      }
    });
  }

  it("keeps the eye where turn.ts expects it", () => {
    const turning = rules(read(sheets[0]!)).find((rule) => rule.selector === ".card[data-turning]");
    expect(turning?.declarations).toContainEqual(["perspective", `${TURN_PERSPECTIVE_PX}px`]);
  });
});

describe("the turn's timing", () => {
  it("takes --dur-section, a half each way", () => {
    expect(ms(token("--dur-section"))).toBe(960);
    expect(2 * TURN_HALF_MS).toBe(ms(token("--dur-section")));
  });

  it("shades a side no darker than 16% ink, over at least 400 ms", () => {
    expect(TURN_SHADE).toBeLessThanOrEqual(0.16);
    expect(TURN_HALF_MS).toBeGreaterThanOrEqual(400);
  });

  it("lets the steam wait for the turn to end before it rises", () => {
    const wisp = rules(read(sheets[1]!)).find((rule) => rule.selector === ".wisp");
    const delay = wisp?.declarations.find(([property]) => property === "--wisp-delay")?.[1] ?? "";
    expect(ms(delay)).toBeGreaterThanOrEqual(TURN_HALF_MS + 160);
  });
});

/** A stand-in for an element and its Web Animations, enough for turn.ts. */
class FakeAnimation {
  onfinish: (() => void) | null = null;
  done = false;
  constructor(
    readonly keyframes: Record<string, unknown>,
    readonly options: KeyframeAnimationOptions,
  ) {}
  finish() {
    this.done = true;
  }
  /** What the browser does when the animation reaches its end: it finishes, and fires its finish event. */
  end() {
    this.done = true;
    this.onfinish?.();
  }
}

class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly animations: FakeAnimation[] = [];
  readonly style = { perspectiveOrigin: "" };
  constructor(readonly shade: FakeElement | null = null) {}
  getBoundingClientRect() {
    return { left: 16, top: -300 };
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
  querySelector(selector: string) {
    return selector === ":scope > [data-shade]" ? this.shade : null;
  }
  animate(keyframes: Record<string, unknown>, options: KeyframeAnimationOptions) {
    const animation = new FakeAnimation(keyframes, options);
    this.animations.push(animation);
    return animation;
  }
}

describe("turning the card", () => {
  const easeOut = token("--ease-out");
  let card: FakeElement;
  let from: FakeElement;
  let to: FakeElement;
  let steps: string[];
  const turn = (leftwards: boolean) =>
    turnCard(
      card as unknown as HTMLElement,
      from as unknown as HTMLElement,
      to as unknown as HTMLElement,
      leftwards,
      () => steps.push(`swap ${card.attributes.has("data-turning")}`),
      () => steps.push(`done ${card.attributes.has("data-turning")}`),
    );

  beforeEach(() => {
    card = new FakeElement();
    from = new FakeElement(new FakeElement());
    to = new FakeElement(new FakeElement());
    steps = [];
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 844);
    vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: (name: string) => (name === "--ease-out" ? ` ${easeOut}` : "") }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("folds the side away leftwards towards the café, shading it, then unfolds the café on --ease-out", () => {
    turn(true);
    // The eye looks from the middle of the screen, in the card's coordinates.
    expect(card.attributes.has("data-turning")).toBe(true);
    expect(card.style.perspectiveOrigin).toBe("179px 722px");
    const [foldAway, darken] = [from.animations[0]!, from.shade!.animations[0]!];
    expect(foldAway.keyframes).toEqual({ transform: ["rotateY(0deg)", "rotateY(-90deg)"] });
    expect(foldAway.options).toEqual({ duration: TURN_HALF_MS, easing: TURN_OUT_EASING, fill: "none" });
    expect(darken.keyframes).toEqual({ opacity: [0, TURN_SHADE] });
    expect(darken.options).toEqual(foldAway.options);
    expect(to.animations).toEqual([]);
    expect(steps).toEqual([]);

    // Edge-on: the sides swap unseen, and the café unfolds from the other edge.
    foldAway.end();
    expect(steps).toEqual(["swap true"]);
    const [unfold, lighten] = [to.animations[0]!, to.shade!.animations[0]!];
    expect(unfold.keyframes).toEqual({ transform: ["rotateY(90deg)", "rotateY(0deg)"] });
    expect(unfold.options).toEqual({ duration: TURN_HALF_MS, easing: easeOut, fill: "none" });
    expect(easeOut).toBe("cubic-bezier(0.16, 1, 0.3, 1)");
    expect(lighten.keyframes).toEqual({ opacity: [TURN_SHADE, 0] });

    unfold.end();
    expect(steps).toEqual(["swap true", "done false"]);
    expect(card.style.perspectiveOrigin).toBe("");
    expect([...from.animations, ...to.animations, from.shade!.animations[0], to.shade!.animations[0]].every((animation) => animation!.done)).toBe(true);
  });

  it("turns rightwards back to breakfast", () => {
    turn(false);
    expect(from.animations[0]!.keyframes).toEqual({ transform: ["rotateY(0deg)", "rotateY(90deg)"] });
    from.animations[0]!.end();
    expect(to.animations[0]!.keyframes).toEqual({ transform: ["rotateY(-90deg)", "rotateY(0deg)"] });
  });

  it("lands at once when asked, in its own order, and ignores the finish events that follow", () => {
    const running = turn(true);
    from.animations[0]!.end();
    running.finish();
    expect(steps).toEqual(["swap true", "done false"]);
    expect(to.animations.every((animation) => animation.done && animation.onfinish === null)).toBe(true);
    running.finish();
    to.animations[0]!.end();
    expect(steps).toEqual(["swap true", "done false"]);

    // Asked before the edge-on moment, it still swaps first, then lands.
    steps = [];
    const early = turn(false);
    early.finish();
    expect(steps).toEqual(["swap true", "done false"]);
  });
});
