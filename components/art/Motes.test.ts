import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Motes } from "./Motes";

describe("Motes", () => {
  it("can be a single mote, one for each lamp in a row", () => {
    expect((renderToStaticMarkup(createElement(Motes, { count: 1 })).match(/<i /g) ?? []).length).toBe(1);
  });

  it("are at the top of the brief: 5.5–6 px wide, rising 32–40 px", () => {
    for (const seed of [1, 2, 3, 7]) {
      const markup = renderToStaticMarkup(createElement(Motes, { count: 5, seed }));
      const sizes = [...markup.matchAll(/--s:([\d.]+)px/g)].map((m) => Number(m[1]));
      const rises = [...markup.matchAll(/--dy:-(\d+)px/g)].map((m) => Number(m[1]));
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(5.5);
      expect(Math.max(...sizes)).toBeLessThanOrEqual(6);
      expect(Math.min(...rises)).toBeGreaterThanOrEqual(32);
      expect(Math.max(...rises)).toBeLessThanOrEqual(40);
    }
  });
});
