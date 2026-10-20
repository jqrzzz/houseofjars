import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { shadowDock, shadowFigure } from "@/components/concierge/mascot";
import { ShadowMascot } from "./ShadowMascot";

const file = (src: string) => join(process.cwd(), "public", src);
const img = (markup: string) => /<img [^>]*>/.exec(markup)?.[0] ?? "";

describe("ShadowMascot", () => {
  it("shows the 3D Shadow, whole, as a decorative picture in two sharpnesses", () => {
    for (const [size, art] of [["large", shadowFigure], ["small", shadowDock]] as const) {
      const tag = img(renderToStaticMarkup(createElement(ShadowMascot, { size })));
      expect(tag).toContain(`src="${art.src}"`);
      expect(tag).toContain(`srcSet="${art.src} 1x, ${art.src2x} 2x"`);
      expect(tag).toContain(`width="${art.width}"`);
      expect(tag).toContain(`height="${art.height}"`);
      // Whatever holds him carries his name; the picture adds nothing for a screen reader.
      expect(tag).toContain('alt=""');
    }
  });

  it("serves files that match their declared sizes and stay tiny", async () => {
    const one = await sharp(file(shadowFigure.src)).metadata();
    const two = await sharp(file(shadowFigure.src2x)).metadata();
    expect([one.width, one.height]).toEqual([shadowFigure.width, shadowFigure.height]);
    expect([two.width, two.height]).toEqual([shadowFigure.width * 2, shadowFigure.height * 2]);
    expect(one.hasAlpha && two.hasAlpha).toBe(true);
    expect(statSync(file(shadowFigure.src)).size + statSync(file(shadowFigure.src2x)).size).toBeLessThan(16_000);
  });

  it("is the Shadow of the chat window, the 404 and the game: the flat drawing is gone from them", () => {
    for (const path of ["components/concierge/ConciergePanel.tsx", "app/not-found.tsx", "components/game/FindYourPod.tsx"]) {
      const source = readFileSync(join(process.cwd(), path), "utf8");
      expect(source, path).toContain("<ShadowMascot");
      expect(source, path).not.toContain("ShadowFigure");
    }
  });
});
