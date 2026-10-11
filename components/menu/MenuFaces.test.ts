import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cardPrices, cardText, type Side } from "@/lib/menu/card";
import { MenuFace, type Medium } from "./MenuFaces";

const render = (side: Side, medium: Medium) => renderToStaticMarkup(createElement(MenuFace, { side, medium }));
const sides: readonly Side[] = ["front", "back"];
const media: readonly Medium[] = ["screen", "print"];
const count = (markup: string, pattern: RegExp) => [...markup.matchAll(new RegExp(pattern.source, "g"))].length;

const decode = (text: string) =>
  text.replace(/&(amp|lt|gt|quot|#x27|#39|nbsp);/g, (_, name: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#x27": "'", "#39": "'", nbsp: " " })[name]!);

/**
 * The words a face shows, line by line, as cardText() writes them: each
 * heading, paragraph, list row and table row is a line (a <br> starts
 * another), table cells are joined by single spaces, and what is only read
 * out (.visually-hidden) or drawn (SVG) is left out.
 */
function visibleLines(markup: string): string[] {
  const shown = markup.replace(/<span class="visually-hidden">[^<]*<\/span>/g, "").replace(/<svg[\s\S]*?<\/svg>/g, "");
  const lines: string[] = [];
  let line: string | null = null;
  let depth = 0;
  for (const [token, close, tag] of shown.matchAll(/<(\/?)([a-z0-9]+)[^>]*>|[^<]+/g)) {
    if (!tag) {
      if (line !== null) line += decode(token);
      continue;
    }
    if (["h2", "h3", "p", "li", "tr"].includes(tag)) {
      if (!close && depth++ === 0) line = "";
      if (close && --depth === 0) {
        lines.push(line!);
        line = null;
      }
    } else if (tag === "br" && line !== null) {
      lines.push(line);
      line = "";
    } else if ((tag === "th" || tag === "td") && !close && line !== null) {
      line += " ";
    }
  }
  return lines.map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean);
}

describe("the menu card's faces", () => {
  for (const side of sides) {
    for (const medium of media) {
      it(`${side} (${medium}): shows exactly the card's words, line by line`, () => {
        expect(visibleLines(render(side, medium))).toEqual(cardText(side));
      });

      it(`${side} (${medium}): marks every price with its value, in the card's order`, () => {
        expect([...render(side, medium).matchAll(/data-price="(\d+)"/g)].map(([, value]) => Number(value))).toEqual(cardPrices(side));
      });
    }
  }

  it("give each side its id, its data-face and a title the page can focus", () => {
    for (const medium of media) {
      const front = render("front", medium);
      const back = render("back", medium);
      expect(front).toMatch(/^<article id="breakfast" class="[^"]+" data-face="front" aria-labelledby="menu-front-title">/);
      expect(back).toMatch(/^<article id="cafe" class="[^"]+" data-face="back" aria-labelledby="menu-back-title">/);
      expect(front).toMatch(/<h2 id="menu-front-title" class="[^"]+" tabindex="-1">Breakfast<\/h2>/);
      expect(back).toMatch(/<h2 id="menu-back-title" class="[^"]+" tabindex="-1">Café<\/h2>/);
      expect(count(front + back, /<h2 /)).toBe(2);
    }
  });

  it("set the drinks out as a real table: three column heads and eleven row heads", () => {
    for (const medium of media) {
      const back = render("back", medium);
      expect(count(back, /<th scope="col"/)).toBe(3);
      expect(count(back, /<th scope="row"/)).toBe(11);
      expect(back).toContain('<table class="');
      expect(back).toMatch(/<table [^>]*aria-labelledby="menu-drinks"/);
      expect(count(back, /no iced price/)).toBe(5);
      expect(count(back, /no hot price/)).toBe(1);
      // The dash is shown but not read; the words are read but not shown.
      expect(count(back, /<span class="[^"]+" aria-hidden="true">–<\/span><span class="visually-hidden">no (?:hot|iced) price<\/span>/)).toBe(6);
    }
  });

  it("label every list by its section's head, and say plus for the +", () => {
    const front = render("front", "screen");
    for (const list of front.match(/<ul [^>]+>/g) ?? []) expect(list).toMatch(/aria-labelledby="menu-(?:change|add)"/);
    expect(count(front, /<span class="visually-hidden">plus <\/span><span aria-hidden="true">\+<\/span>/)).toBe(10);
    expect(render("back", "screen")).not.toContain("plus");
  });

  it("on screen, link the two 'on the other side' phrases to the other side, and nothing else", () => {
    const front = render("front", "screen");
    const back = render("back", "screen");
    expect(count(front + back, /<a /)).toBe(2);
    const frontLink = front.indexOf('<a href="#cafe"');
    expect(frontLink).toBeGreaterThan(front.indexOf("_board_"));
    expect(frontLink).toBeLessThan(front.indexOf("<footer"));
    expect(front).toMatch(/<a href="#cafe" class="[^"]+" data-side-link="back"><span>on the other side<\/span><\/a>/);
    expect(back.indexOf('<a href="#breakfast"')).toBeGreaterThan(back.indexOf("<footer"));
    expect(back).toMatch(/<a href="#breakfast" class="[^"]+" data-side-link="front"><span>on the other side<\/span><\/a>/);
  });

  it("on screen, let steam rise once from the cup in the Hot head, kept visible on the white card by Evening", () => {
    const back = render("back", "screen");
    const head = back.match(/<th scope="col" data-phrase="">([\s\S]*?)<\/th>/)?.[1] ?? "";
    expect(count(back, /data-phrase/)).toBe(1);
    expect(count(back, /viewBox="0 0 40 64"/)).toBe(1);
    const wisp = head.match(/<svg class="([^"]+)" viewBox="0 0 40 64" width="18" height="28"/)?.[1] ?? "";
    expect(wisp).toMatch(/_onPaper_/);
    expect(head).toMatch(/>Hot<\/span>$/);
    expect(render("front", "screen")).not.toContain("data-phrase");
  });

  it("in print, are plain words: no links, no steam and no phrase", () => {
    for (const side of sides) {
      const markup = render(side, "print");
      expect(markup).not.toContain("<a ");
      expect(markup).not.toContain('viewBox="0 0 40 64"');
      expect(markup).not.toContain("data-phrase");
      expect(markup).not.toContain("data-side-link");
    }
  });

  it("never hide anything with the hidden attribute: the page's island sets it on its own wrappers", () => {
    for (const side of sides) for (const medium of media) expect(render(side, medium)).not.toMatch(/\shidden(?:=|\s|>)/);
  });

  it("draw the mark white on the front and jar orange on the back, and the house's own cup and glass", () => {
    const mark = (markup: string) => markup.match(/<svg class="([^"]+)" viewBox="0 0 600 900"/)?.[1] ?? "";
    expect(mark(render("front", "print"))).toMatch(/_markWhite_/);
    expect(mark(render("back", "print"))).toMatch(/_markOrange_/);
    const back = render("back", "print");
    expect(count(back, /viewBox="0 0 256 256"/)).toBe(2);
    expect(back).toMatch(/<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false" class="icon [^"]+"><path d="M208,80H32/);
    expect(back).toMatch(/<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false" class="icon [^"]+"><path d="M206,26.69A8/);
  });

  it("draw each leader as a line from its price's end, hidden from screen readers", () => {
    const front = render("front", "print");
    expect(count(front, /<svg class="[^"]*_leader_[^"]*" aria-hidden="true" focusable="false"><line x1="100%" y1="50%" x2="0" y2="50%"><\/line><\/svg>/)).toBe(10);
    expect(count(render("back", "print"), /_leader_/)).toBe(2);
  });
});

/** The stylesheet as rules: each selector with its declarations and the at-rules it sits in. */
function rules(css: string) {
  const found: { selector: string; at: string[]; declarations: [string, string][] }[] = [];
  const at: string[] = [];
  let prelude = "";
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === "{") {
      const head = prelude.trim();
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

describe("the menu card's stylesheet", () => {
  // The rules alone: the comments name colours and tokens to explain them.
  const css = readFileSync(join(process.cwd(), "components/menu/MenuFaces.module.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const all = rules(css);
  const sizes = all.find((rule) => rule.selector === ":where(.face)")!.declarations;
  const defined = sizes.map(([name]) => name);

  it("sets every size on the card through a --card-* property, each defined once and used", () => {
    expect(defined.every((name) => name.startsWith("--card-"))).toBe(true);
    expect(new Set(defined).size).toBe(defined.length);
    const used = new Set([...css.matchAll(/var\((--card-[a-z-]+)\)/g)].map(([, name]) => name!));
    expect([...used].filter((name) => !defined.includes(name))).toEqual([]);
    expect(defined.filter((name) => !used.has(name))).toEqual([]);
    // Lengths written in place are only proportions of the type (em), screen-only touches, or forced colours' border.
    const screenOnly = /\.wisp|\.sideLink/;
    for (const rule of all) {
      if (rule.selector === ":where(.face)" || screenOnly.test(rule.selector) || rule.at.some((at) => at.includes("forced-colors"))) continue;
      for (const [property, value] of rule.declarations) {
        expect(`${rule.selector} { ${property}: ${value} }`).not.toMatch(/[\d.](?:px|rem|mm|pt|vw|vh|cm|in)\b/);
      }
    }
  });

  it("is in sentence case: no text-transform, and no tracking beyond a hair", () => {
    expect(css).not.toContain("text-transform");
    for (const [, value = ""] of css.matchAll(/letter-spacing:\s*([^;]+);/g)) {
      const em = value === "0" || value === "inherit" ? 0 : Number(value.replace(/em$/, ""));
      expect(em).toBeLessThanOrEqual(0.01);
    }
  });

  it("paints only the card's palette: the house's tokens and four colours mixed from them", () => {
    const hexes = new Set([...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map(([hex]) => hex.toLowerCase()));
    expect([...hexes].sort()).toEqual(["#a2a2a1", "#a95435", "#c26540", "#e3e3e3"]);
    const tokens = new Set([...css.matchAll(/var\((--[a-z-]+)/g)].map(([, name]) => name!).filter((name) => !name.startsWith("--card-")));
    expect([...tokens].sort()).toEqual(
      [
        "--brand-text",
        "--dur-ui",
        "--ease-out",
        "--edge-x",
        "--edge-y",
        "--font-brand-stack",
        "--ink",
        "--ink-soft",
        "--jar-orange",
        "--menu-paper",
        "--paper-edge",
        "--underline-offset",
        "--white",
      ].sort(),
    );
  });

  it("moves nothing but the links' thread, and only with motion allowed", () => {
    expect(css).not.toMatch(/@keyframes|animation/);
    for (const rule of all.filter((candidate) => candidate.declarations.some(([property]) => property === "transition"))) {
      expect(rule.at).toContain("@media (prefers-reduced-motion: no-preference)");
      expect(rule.selector).toMatch(/^:global\(:root:not\(\[data-motion="still"\]\)\) /);
      expect(rule.selector).not.toMatch(/price|row|td|tr\b|drinks/);
    }
  });
});
