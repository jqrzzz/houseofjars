import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { eveningTwin } from "../../scripts/art-evening";
import { Drawing } from "./Drawing";
import { drawings, type DrawingName } from "./drawings";

const read = (src: string) => readFileSync(join(process.cwd(), "public", src), "utf8");
const viewBox = (svg: string) => /viewBox="([^"]+)"/.exec(svg)?.[1];

describe("the Evening twins", () => {
  for (const [name, drawing] of Object.entries(drawings)) {
    it(`${name}: the committed twin is the drawing with its night colours always on (npx tsx scripts/art-evening.ts)`, () => {
      expect(drawing.evening).toBe(`/art/evening/${name}.svg`);
      expect(read(drawing.evening)).toBe(eveningTwin(read(drawing.src)));
    });

    it(`${name}: the twin keeps the drawing's size, needs no media query and draws no filters`, () => {
      const day = read(drawing.src);
      const twin = read(drawing.evening);
      expect(twin).toContain(`width="${drawing.width}" height="${drawing.height}"`);
      expect(viewBox(twin)).toBe(viewBox(day));
      expect(twin).not.toContain("prefers-color-scheme");
      expect(twin).not.toContain("<filter");
    });
  }

  it("applies the night rules always, after the Day rules they override", () => {
    const svg = '<svg><style>.a{fill:#fff}.e{transform:translate(1.5px,1.5px)}@media (prefers-color-scheme:dark){.a{fill:#000}.e{transform:translate(0,-1.5px)}}</style></svg>';
    expect(eveningTwin(svg)).toBe(
      "<svg><style>.a{fill:#fff}.e{transform:translate(1.5px,1.5px)}.a{fill:#000}.e{transform:translate(0,-1.5px)}</style></svg>",
    );
  });

  it("refuses a drawing that has no night colours, or an unclosed night block", () => {
    expect(() => eveningTwin("<svg><style>.a{fill:#fff}</style></svg>")).toThrow();
    expect(() => eveningTwin("<svg><style>@media (prefers-color-scheme:dark){.a{fill:#000}</style></svg>")).toThrow();
  });
});

describe("the paper set", () => {
  for (const [name, drawing] of Object.entries(drawings)) {
    it(`${name}: cut paper made of flat shapes: a fibre pattern, no gradients, small enough to inline-load`, () => {
      const svg = read(drawing.src);
      expect(svg).toContain('<pattern id="f"');
      expect(svg).not.toMatch(/<(linear|radial)Gradient/);
      expect(svg).not.toContain("<image");
      expect(Buffer.byteLength(svg)).toBeLessThan(16_000);
    });
  }

  it("the pod keeps its four callout dots where PodDiagram numbers them", () => {
    const pod = read(drawings.pod.src);
    for (const [x, y] of [[436, 104], [168, 28], [240, 28], [440, 335]]) {
      expect(pod).toContain(`cx="${x}" cy="${y}" r="7"`);
    }
  });

  it("the paper fibre tile for HTML stages is small, flat and filter-free", () => {
    const tile = read("/art/paper-fibre.svg");
    expect(Buffer.byteLength(tile)).toBeLessThanOrEqual(1_200);
    expect(tile).not.toContain("<filter");
    expect(tile).toMatch(/width="\d+" height="\d+"/);
  });
});

describe("Drawing", () => {
  const render = (props: { name: DrawingName; preload?: boolean; priority?: boolean; className?: string }) =>
    renderToStaticMarkup(createElement(Drawing, props));
  const images = (markup: string) => [...markup.matchAll(/<img [^>]*>/g)].map((match) => match[0]);
  const attr = (img: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(img)?.[1];

  it("shows a Day and an Evening twin, so the drawing follows the site's theme", () => {
    const [day, evening, ...rest] = images(render({ name: "door", className: "art" }));
    expect(rest).toHaveLength(0);
    expect(attr(day!, "src")).toBe("/art/door.svg");
    expect(attr(day!, "class")).toBe("for-day art");
    expect(attr(evening!, "src")).toBe("/art/evening/door.svg");
    expect(attr(evening!, "class")).toBe("for-evening art");
  });

  it("pins the Day twin to Day colours, whatever the device's scheme", () => {
    const [day, evening] = images(render({ name: "arch" }));
    expect(attr(day!, "style")).toContain("color-scheme:light");
    expect(attr(evening!, "style") ?? "").not.toContain("color-scheme");
  });

  it("keeps both twins decorative and at the drawing's own size, so nothing shifts as it loads", () => {
    for (const img of images(render({ name: "house" }))) {
      expect(attr(img, "alt")).toBe("");
      expect(attr(img, "width")).toBe(String(drawings.house.width));
      expect(attr(img, "height")).toBe(String(drawings.house.height));
    }
  });

  it("loads both twins lazily, or both at once when preloaded", () => {
    for (const img of images(render({ name: "pod" }))) expect(attr(img, "loading")).toBe("lazy");
    for (const img of images(render({ name: "pod", preload: true }))) expect(attr(img, "loading")).toBe("eager");
    // The deprecated priority still works, so older callers keep compiling.
    for (const img of images(render({ name: "pod", priority: true }))) expect(attr(img, "loading")).toBe("eager");
  });
});
