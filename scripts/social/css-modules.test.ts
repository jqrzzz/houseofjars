import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCssModule, scopeCssModule } from "./css-modules";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("CSS Modules for social pieces", () => {
  it("names each class after its module, so two modules' .band never collide", () => {
    const shadow = loadCssModule(join(process.cwd(), "components/shadow/ShadowFigure.module.css"));
    const band = loadCssModule(join(process.cwd(), "components/brand/WovenBand.module.css"));
    expect(shadow.classes.band).toBe("ShadowFigure__band");
    expect(band.classes.band).toBe("WovenBand__band");
    expect(band.classes.diamond).toBe("WovenBand__diamond");
    expect(shadow.css).toContain(".ShadowFigure__eyes");
    expect(band.css).toContain('url("/brand/weave-diamond.svg")');
  });

  it("renames selectors only: never inside url(), strings, declarations or keyframe stops, and unwraps :global()", () => {
    const { css, classes } = scopeCssModule(
      `/* .comment */ .a, :is(button, .b):hover .c { background: url(/x.y.svg) 0 0 / 1.5rem; content: ".d"; }
       :global(:root[data-theme="dark"]) .a { color: red; }
       @media (min-width: 47.99rem) { .e { margin: 0.5rem; } }
       @keyframes k { 0%, 96.5% { opacity: 0.5; } }`,
      "M",
    );
    expect(Object.keys(classes).sort()).toEqual(["a", "b", "c", "e"]);
    expect(css).toContain(".M__a, :is(button, .M__b):hover .M__c {");
    expect(css).toContain("url(/x.y.svg) 0 0 / 1.5rem");
    expect(css).toContain('content: ".d"');
    expect(css).toContain('/* .comment */');
    expect(css).toContain(':root[data-theme="dark"] .M__a {');
    expect(css).toContain("@media (min-width: 47.99rem) { .M__e { margin: 0.5rem; } }");
    expect(css).toContain("0%, 96.5% { opacity: 0.5; }");
  });

  it("draws the curtain with the Splash's own fibre", () => {
    const fibre = (css: string) => /--fibre:\s*(url\("data:[^"]+"\))/.exec(css)?.[1];
    expect(fibre(read("scripts/social/theatre.css"))).toBeDefined();
    expect(fibre(read("scripts/social/theatre.css"))).toBe(fibre(read("components/brand/Splash.module.css")));
  });

  it("greets in Lao as the Splash does", async () => {
    const { copy } = await import("./pieces/house-rules");
    expect(read("components/brand/Splash.tsx")).toContain(copy.lockup.greeting);
  });
});
