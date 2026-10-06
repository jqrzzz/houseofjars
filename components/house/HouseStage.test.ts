import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HouseStage } from "./HouseStage";

const markup = renderToStaticMarkup(createElement(HouseStage));
const walks = [...markup.matchAll(/<details[^>]*data-walk="([^"]+)"[^>]*>([\s\S]*?)<\/details>/g)];

describe("HouseStage", () => {
  it("lists every walk with a second line saying where it goes", () => {
    expect(walks.length).toBeGreaterThanOrEqual(6);
    for (const [, walk, body] of walks) expect(body, walk).toMatch(/<summary>.*<span class="_when_[0-9a-f]+">[^<]+<\/span><\/summary>/);
  });

  it("names whose bathroom the bathroom walk goes to", () => {
    expect(markup).toContain("Women’s bathroom");
    expect(markup).not.toMatch(/<span>Bathroom<\/span>/);
  });
});
