import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MenuCard } from "./MenuCard";

/*
 * The menu card's island (MenuCard.tsx and turn.ts) is all the JavaScript the
 * menu page adds: it stays small, carries none of the house's content into
 * the browser (the faces arrive drawn by the server), and never fetches or
 * sends anything, since nothing can be ordered or paid here.
 */
const dir = join(process.cwd(), "components/menu");
const read = (file: string) => readFileSync(join(dir, file), "utf8");
const island = ["MenuCard.tsx", "turn.ts"];

/** Each import of a file: where from, and whether it brings only types. */
const imports = (source: string) =>
  [...source.matchAll(/^import\s+(type\s+)?[\s\S]*?\sfrom\s+["']([^"']+)["'];/gm)].map(([, type, from]) => ({ typeOnly: Boolean(type), from: from! }));

const render = () =>
  renderToStaticMarkup(
    createElement(MenuCard, {
      front: createElement("article", { id: "breakfast", "data-face": "front" }, "The front"),
      back: createElement("article", { id: "cafe", "data-face": "back" }, "The back"),
      plates: { front: { name: "Breakfast", note: "Staying guests" }, back: { name: "Café", note: "Coffee, tea and breakfast" } },
    }),
  );

describe("the menu card's island", () => {
  it("is the only client file under components/menu", () => {
    // The directive comes first, after any comments.
    const client = readdirSync(dir).filter((file) => /\.tsx?$/.test(file) && /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use client["']/.test(read(file)));
    expect(client).toEqual(["MenuCard.tsx"]);
  });

  it.each(island)("%s brings in none of the house's content, the theme or Node", (file) => {
    for (const { typeOnly, from } of imports(read(file))) {
      expect(from, file).not.toMatch(/^(?:@\/|(?:\.\.?\/)+)content(?:\/|$)/);
      expect(from, file).not.toMatch(/^@\/lib\/theme$/);
      expect(from, file).not.toMatch(/^node:/);
      // The card's words and its faces stay on the server: only their types may come in.
      if (/lib\/menu\/card$|\/MenuFaces$/.test(from)) expect(typeOnly, `${file} imports ${from}`).toBe(true);
    }
  });

  it.each(island)("%s never fetches, sends or posts anything", (file) => {
    const source = read(file);
    for (const call of ["fetch(", "sendBeacon", "XMLHttpRequest", "WebSocket", "EventSource", "<form"]) expect(source, file).not.toContain(call);
  });

  it("hides a side only from script: React would write a hidden prop as plain hidden, which find-in-page can't open", () => {
    const source = read("MenuCard.tsx");
    expect(source).not.toMatch(/<[a-z][^<>]*\shidden(?:=|\s|\/?>)/);
    expect(source).toContain('setAttribute("hidden", "until-found")');
    expect(render()).not.toMatch(/\shidden(?:=|\s|>)/);
  });

  it("renders the layout without JavaScript: both sides in their wrappers, the plates as jump links, no state", () => {
    const html = render();
    expect(html).toMatch(/^<div class="[^"]+" data-menu-card="">/);
    expect(html).not.toMatch(/data-turn|data-side=|data-turning|aria-current/);
    expect(html).toMatch(/<nav class="[^"]+" aria-label="Sides of the menu card">/);
    const plates = [...html.matchAll(/<a href="(#[a-z]+)" class="[^"]+" data-side-link="([a-z]+)">([\s\S]*?)<\/a>/g)];
    expect(plates.map(([, href, side]) => `${side} ${href}`)).toEqual(["front #breakfast", "back #cafe"]);
    // Each plate reads as its side's name, then its note; the swatch is only drawn.
    for (const [, , , inside] of plates) expect(inside).toMatch(/^<span class="[^"]+" aria-hidden="true"><\/span><span class="[^"]+"><span class="[^"]+">[^<]+<\/span> <span class="[^"]+">[^<]+<\/span><\/span>$/);
    expect(html).toContain(">Breakfast</span> <span");
    expect(html).toContain(">Coffee, tea and breakfast</span>");
    // Each side in its wrapper, with the shade for its turn after it.
    for (const [side, id] of [["front", "breakfast"], ["back", "cafe"]]) {
      expect(html).toMatch(new RegExp(`<div class="[^"]+" data-face-wrap="${side}"><article id="${id}"[^>]*>[^<]*</article><span class="[^"]+" data-shade="" aria-hidden="true"></span></div>`));
    }
  });
});
