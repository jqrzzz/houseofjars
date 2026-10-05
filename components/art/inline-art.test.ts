import { createElement, Fragment, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArchWisp } from "./ArchWisp";
import { Diorama } from "./Diorama";
import { HouseLamp } from "./HouseLamp";
import { Motes } from "./Motes";
import { OpenJar } from "./OpenJar";
import { PaperTrain } from "./PaperTrain";
import { Petal } from "./Petal";
import { StoneJars } from "./StoneJars";
import { TukTuk } from "./TukTuk";

const html = (element: ReactElement) => renderToStaticMarkup(element);

/**
 * Markup as production serves it: CSS-module class names are longer there
 * ("HouseLamp-module__AbCdEf__lamp") than in tests ("_lamp_ab12cd"), so the
 * byte budgets are checked against production-length names.
 */
const served = (markup: string) => markup.replace(/_([A-Za-z0-9]+)_[0-9a-f]{6}/g, "Component-module__AbCdEf__$1");
const bytes = (markup: string) => Buffer.byteLength(served(markup));

describe("house lamps", () => {
  it("stay within 600 bytes each, at every cord the hero hangs", () => {
    for (const [index, cord] of [28, 44, 36].entries()) expect(bytes(html(createElement(HouseLamp, { cord, index })))).toBeLessThanOrEqual(600);
  });

  it("draw a 32-wide lamp whose cord sets its height: a 28 by 20 bell under an 8 by 3 cap", () => {
    const markup = html(createElement(HouseLamp, { cord: 44, index: 0 }));
    expect(markup).toContain('viewBox="0 0 32 68"');
    expect(markup).toContain('d="M16 0V44"');
    expect(markup).toContain('<rect x="12" y="44" width="8" height="3">');
    const shade = /<path id="[^"]+" d="([^"]+)"/.exec(markup)![1]!;
    // From the cap's foot (y 47) down to a flat foot 20 below, from x 30 across to x 2: 28 wide.
    expect(shade).toMatch(/^M12 47H20/);
    expect(shade).toContain("30 67H2");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("--i:0");
  });

  it("give each lamp's card edge its own shade to copy", () => {
    const markup = renderToStaticMarkup(
      createElement(Fragment, null, createElement(HouseLamp, { cord: 28, index: 0 }), createElement(HouseLamp, { cord: 36, index: 1 })),
    );
    const ids = [...markup.matchAll(/<path id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(markup).toContain(`href="#${id}"`);
  });
});

describe("the arch wisp", () => {
  it("is one open path, the S-curl and the arch's crown, within 300 bytes", () => {
    const markup = html(createElement(ArchWisp, {}));
    expect(markup).toContain('viewBox="0 0 40 64"');
    expect(markup).toContain(
      'pathLength="1" d="M20 64C13 57 27 50 20 43C15 38 4 33 4 24C4 15.9 10.3 10.7 20 10.7C29.7 10.7 36 15.9 36 24"',
    );
    expect(bytes(markup)).toBeLessThanOrEqual(300);
  });

  it("scales by its height and keeps a 2 px stroke", () => {
    const markup = html(createElement(ArchWisp, { size: 128, play: true }));
    expect(markup).toContain('width="80" height="128"');
    expect(markup).toContain("--sw:1");
    expect(markup).toContain("data-play");
  });
});

describe("motes", () => {
  it("are three to five, the same on every build", () => {
    const count = (n: number) => (html(createElement(Motes, { count: n })).match(/<i /g) ?? []).length;
    expect([count(1), count(4), count(9)]).toEqual([3, 4, 5]);
    expect(html(createElement(Motes, { seed: 2 }))).toBe(html(createElement(Motes, { seed: 2 })));
    expect(html(createElement(Motes, { seed: 2 }))).not.toBe(html(createElement(Motes, { seed: 3 })));
  });

  it("rise 24–40 px, 4–6 px wide, all gone within 3 s", () => {
    const markup = html(createElement(Motes, { count: 5, seed: 7 }));
    const rises = [...markup.matchAll(/--dy:-(\d+)px/g)].map((m) => Number(m[1]));
    const sizes = [...markup.matchAll(/--s:([\d.]+)px/g)].map((m) => Number(m[1]));
    expect(rises).toHaveLength(5);
    expect(Math.min(...rises)).toBeGreaterThanOrEqual(24);
    expect(Math.max(...rises)).toBeLessThanOrEqual(40);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(4);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(6);
    const waits = [...markup.matchAll(/--w:(\d+)ms/g)].map((m) => Number(m[1]));
    const runs = [...markup.matchAll(/--d:(\d+)ms/g)].map((m) => Number(m[1]));
    waits.forEach((wait, k) => expect(wait + runs[k]!).toBeLessThanOrEqual(3000));
  });
});

describe("paper scenes", () => {
  it("keep the diorama within 6 kB, in either frame", () => {
    for (const variant of ["home", "vientiane"] as const) {
      const markup = html(createElement(Diorama, { variant }));
      expect(bytes(markup)).toBeLessThanOrEqual(6_000);
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain("data-phrase");
    }
  });

  it("draw the same on every build, with no SVG filters", () => {
    for (const element of [
      () => html(createElement(Diorama, { variant: "home" })),
      () => html(createElement(TukTuk, {})),
      () => html(createElement(PaperTrain, { arrive: true })),
      () => html(createElement(StoneJars, { seeds: [3, 11, 27] })),
      () => html(createElement(OpenJar, {})),
      () => html(createElement(Petal, {})),
    ]) {
      const markup = element();
      expect(markup).toBe(element());
      expect(markup).not.toContain("<filter");
    }
  });

  it("draw one jar per seed, each hewn differently", () => {
    const markup = html(createElement(StoneJars, { seeds: [3, 11, 27] }));
    const bodies = [...markup.matchAll(/<path id="[^"]+" d="([^"]+)"/g)].map((m) => m[1]);
    expect(bodies).toHaveLength(3);
    expect(new Set(bodies).size).toBe(3);
  });

  it("make the 404 jar a button with a name, drawn on the server", () => {
    const markup = html(createElement(OpenJar, {}));
    expect(markup).toMatch(/^<button type="button"[^>]*aria-label="Tap the empty jar"/);
    expect(markup).toContain('<path id="open-jar"');
  });
});
