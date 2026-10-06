import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShadowFigure } from "./ShadowFigure";

describe("ShadowFigure", () => {
  it("draws the full figure and the bust from one drawing", () => {
    const full = renderToStaticMarkup(createElement(ShadowFigure));
    const bust = renderToStaticMarkup(createElement(ShadowFigure, { variant: "bust" }));
    expect(full).toContain('viewBox="4 0 110 152"');
    expect(bust).toContain('viewBox="2 3 112 112"');
    // Decorative: whatever holds him carries the name.
    expect(full).toContain('aria-hidden="true"');
  });

  it("gives each drawing its own clip, so two on a page never share one", () => {
    const markup = renderToStaticMarkup(
      createElement(Fragment, null, createElement(ShadowFigure, { variant: "bust" }), createElement(ShadowFigure, { variant: "bust" })),
    );
    const ids = [...markup.matchAll(/<clipPath id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(markup).toContain(`url(#${id})`);
  });

  it("stays small enough to sit on every page", () => {
    expect(Buffer.byteLength(renderToStaticMarkup(createElement(ShadowFigure)))).toBeLessThan(3_500);
    expect(Buffer.byteLength(renderToStaticMarkup(createElement(ShadowFigure, { variant: "silhouette" })))).toBeLessThan(3_500);
  });

  it("draws the silhouette as the full figure's outline in one fill", () => {
    const full = renderToStaticMarkup(createElement(ShadowFigure));
    const silhouette = renderToStaticMarkup(createElement(ShadowFigure, { variant: "silhouette" }));
    expect(silhouette).toContain('viewBox="4 0 110 152"');
    expect(silhouette).toContain('aria-hidden="true"');
    // The same paths as the figure: every shape in the silhouette is drawn in the full figure too.
    const shapes = (markup: string) => [...markup.matchAll(/ (?:d|x|cx)="[^"]+"/g)].map((match) => match[0]);
    for (const shape of shapes(silhouette)) expect(full).toContain(shape);
    // One fill, from the stylesheet: no shape colours itself, and nothing is clipped or layered inside.
    expect(silhouette).not.toMatch(/<(?:g|clipPath|use)\b/);
    expect(silhouette.match(/class="/g)).toHaveLength(1);
  });
});
