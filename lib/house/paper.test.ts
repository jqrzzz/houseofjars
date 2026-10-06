import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { deckle } from "./deckle";
import { S, isoProjection } from "./geometry";
import { houseOfJars as model } from "./house-of-jars";
import { styledClass } from "./palette";
import {
  PAPER_LAYERS,
  type PaperLayerId,
  anchorOf,
  faceMatrix,
  isFrontPiece,
  lightPoints,
  paperLayerSrc,
  planOverlay,
  renderPaperLayer,
  renderThreadLayer,
  stageGeometry,
  walksJson,
} from "./paper";
import { HOUSE_RENDERS, renderCutaway, renderPlan, renderStreet } from "./render";
import type { FloorId } from "./types";

const themes = ["day", "evening"] as const;
const viewBoxOf = (svg: string) => /viewBox="([^"]+)"/.exec(svg)![1]!.split(" ").map(Number);
const paths = (svg: string) => (svg.match(/<path[\s>]/g) ?? []).length;
/** The fixtures a page counts: every one must keep its group (its id) in the paper outfit. */
const COUNTED = new Set(["pod", "locker", "ladder", "chair", "pendant-lamp"]);

/** Every coordinate pair in the d attributes (the paper layers have no transforms). */
function points(svg: string): [number, number][] {
  const out: [number, number][] = [];
  for (const d of svg.match(/\sd="([^"]+)"/g) ?? []) {
    const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i]!, nums[i + 1]!]);
  }
  return out;
}

describe("the paper stage's geometry", () => {
  const g = stageGeometry();

  it("has one integer viewBox and lifts each floor 2.5 m (90 units) per level", () => {
    expect(g.viewBox.every(Number.isInteger)).toBe(true);
    expect(g.liftPerLevel).toBe(2.5 * S);
    expect(g.liftPerLevel).toBe(90);
  });

  it("holds every floor lifted apart and the street front", () => {
    const [x, y, w, h] = g.viewBox;
    for (const frame of [viewBoxOf(renderCutaway({ outfit: "paper", explode: 2.5 })), viewBoxOf(renderStreet({ outfit: "paper" }))]) {
      expect(frame[0]).toBeGreaterThanOrEqual(x);
      expect(frame[1]).toBeGreaterThanOrEqual(y);
      expect(frame[0]! + frame[2]!).toBeLessThanOrEqual(x + w);
      expect(frame[1]! + frame[3]!).toBeLessThanOrEqual(y + h);
    }
  });

  it("crops to the floors asked for, lifted, inside the stage", () => {
    const [x, y, w, h] = g.viewBox;
    const crop = g.crop(["ground", "floor1"]);
    expect(crop.every(Number.isInteger)).toBe(true);
    expect(crop[0]).toBeGreaterThanOrEqual(x);
    expect(crop[1]).toBeGreaterThanOrEqual(y);
    expect(crop[0] + crop[2]).toBeLessThanOrEqual(x + w);
    expect(crop[1] + crop[3]).toBeLessThanOrEqual(y + h);
    // The ground floor and the 1st floor need less height than all three floors.
    expect(crop[3]).toBeLessThan(h);
    expect(g.crop(["floor1", "ground"])).toEqual(crop);
    const lifted = viewBoxOf(renderCutaway({ outfit: "paper", explode: 2.5, floors: ["ground", "floor1"] }));
    expect(crop[1]).toBeLessThanOrEqual(lifted[1]!);
    expect(() => g.crop([])).toThrow(/no floors/);
    expect(() => g.crop(["roof" as FloorId])).toThrow(/unknown floor/);
  });
});

describe("the paper layers", () => {
  const g = stageGeometry();
  for (const theme of themes)
    for (const layer of PAPER_LAYERS) {
      describe(`${layer}, ${theme}`, () => {
        const svg = renderPaperLayer(layer, theme);

        it("shares the stage's viewBox, and draws inside it", () => {
          expect(viewBoxOf(svg)).toEqual([...g.viewBox]);
          const [x, y, w, h] = g.viewBox;
          const outside = points(svg).filter(([px, py]) => px < x || px > x + w || py < y || py > y + h);
          expect(outside.slice(0, 5)).toEqual([]);
        });

        it("is an accessible image with no filters, at most 80 kB", () => {
          expect(svg).toMatch(/^<svg [^>]*role="img"[^>]*><title id="title">[^<]+<\/title><desc id="desc">[^<]+\.<\/desc><style>/);
          expect(svg).not.toContain("<filter");
          expect(svg).not.toMatch(/NaN|Infinity|undefined|null/);
          expect(Buffer.byteLength(svg)).toBeLessThanOrEqual(80 * 1024);
        });

        it("has a rule for every class, ids unique, and no theme left to the operating system", () => {
          const scope = /<svg [^>]*class="([^"]+)"/.exec(svg)![1]!;
          expect(scope).toBe(`hj-${theme}`);
          expect(svg).not.toContain("@media");
          const css = /<style>([\s\S]*?)<\/style>/.exec(svg)![1]!;
          const used = new Set((svg.match(/\sclass="([^"]+)"/g) ?? []).flatMap((c) => c.slice(8, -1).split(" ")));
          used.delete(scope);
          for (const cls of used) {
            expect(styledClass(cls), cls).toBe(true);
            expect(css, cls).toContain(`.${scope} .${cls}`);
          }
          const ids = (svg.match(/\sid="([^"]+)"/g) ?? []).map((m) => m.slice(5, -1));
          expect(new Set(ids).size).toBe(ids.length);
          // Every silhouette points at a thing drawn in the same picture.
          for (const [, href] of svg.matchAll(/<use href="#([^"]+)"/g)) expect(ids).toContain(href);
        });

        it("is served from /house/", () => {
          expect(paperLayerSrc(layer, theme)).toBe(`/house/paper-${layer}-${theme}.svg`);
          expect(HOUSE_RENDERS.some((r) => `/house/${r.file}` === paperLayerSrc(layer, theme))).toBe(true);
        });
      });
    }

  it("keep street + ground + ground-front + 1st floor within 45 kB gzipped, per theme", () => {
    for (const theme of themes) {
      const total = (["street", "ground", "ground-front", "floor1"] as PaperLayerId[]).reduce((sum, layer) => sum + gzipSync(renderPaperLayer(layer, theme)).length, 0);
      expect(total, theme).toBeLessThanOrEqual(45 * 1024);
    }
  });

  it("keep every counted fixture's id on its floor's layer", () => {
    for (const theme of themes) {
      const ground = renderPaperLayer("ground", theme) + renderPaperLayer("ground-front", theme);
      const layers: Record<FloorId, string> = { ground, floor1: renderPaperLayer("floor1", theme), floor2: renderPaperLayer("floor2", theme) };
      const counted = model.fixtures.filter((f) => COUNTED.has(f.type));
      expect(counted.length).toBeGreaterThan(80);
      for (const f of counted) expect(layers[f.floor], f.id).toContain(`<g id="fx-${f.id}"`);
    }
  });

  it("draw the ground floor's front pieces in their own layer, whole, over the floors above", () => {
    const front = renderPaperLayer("ground-front", "day");
    const ground = renderPaperLayer("ground", "day");
    const pieces = model.fixtures.filter(isFrontPiece);
    expect(pieces.map((f) => f.type).sort()).toEqual(["awning", "jar-clay", "post", "post", "sign-hanging", "sign-hostel"]);
    for (const f of pieces) {
      expect(front, f.id).toContain(`id="fx-${f.id}"`);
      expect(ground, f.id).not.toContain(`id="fx-${f.id}"`);
    }
    expect(front).toContain('<g id="floor-ground-front" data-floor="ground" data-level="0">');
    // Nothing else: no slab, floor or wall.
    expect(front).not.toContain('id="slab-');
    expect(front).not.toContain("data-area=");
    // The front pieces are whole, not cut with the facade: the awning stands at its full height.
    expect(renderCutaway({ outfit: "paper", floors: ["ground"] })).not.toContain('id="fx-awning"');
    // Above the floors on a page.
    expect(PAPER_LAYERS.indexOf("ground-front")).toBeGreaterThan(PAPER_LAYERS.indexOf("floor2"));
  });

  it("fade the 2nd floor, not yet photographed: dim, data-confirmed false, pale but opaque", () => {
    for (const theme of themes) {
      const svg = renderPaperLayer("floor2", theme);
      expect(svg).toMatch(/<g id="floor-floor2" data-floor="floor2" data-level="2" data-confirmed="false" class="dim">/);
      expect(svg).toMatch(/class="wd0g"/);
      expect(svg).not.toMatch(/\.dim\{opacity:\.[0-9]/);
      expect(renderPaperLayer("floor1", theme)).not.toContain('class="dim"');
    }
  });

  it("draw the floors stacked: a page lifts them", () => {
    for (const layer of PAPER_LAYERS) expect(renderPaperLayer(layer, "day"), layer).not.toMatch(/<g [^>]*transform=/);
  });

  it("draw about a third fewer paths than the model, floor by floor", () => {
    for (const floor of ["ground", "floor1", "floor2"] as FloorId[]) {
      const modelPaths = paths(renderCutaway({ floors: [floor] }));
      expect(paths(renderCutaway({ floors: [floor], outfit: "paper" })), floor).toBeLessThanOrEqual(modelPaths * 0.65);
    }
  });
});

describe("the paper outfit", () => {
  it("leaves the model outfit as it was: model is the default", () => {
    expect(renderCutaway({ outfit: "model", explode: 1, labels: true })).toBe(renderCutaway({ explode: 1, labels: true }));
    expect(renderStreet({ outfit: "model" })).toBe(renderStreet());
    expect(renderPlan("ground", { outfit: "model" })).toBe(renderPlan("ground"));
  });

  it("strokes nothing but silhouettes, sticks and inner detail: no hairlines, no light cones", () => {
    const svg = renderCutaway({ outfit: "paper", theme: "day" });
    const classes = new Set((svg.match(/\sclass="([^"]+)"/g) ?? []).flatMap((c) => c.slice(8, -1).split(" ")));
    for (const gone of ["o", "h", "gw", "tg", "dl", "sd"]) expect(classes.has(gone), gone).toBe(false);
    expect(classes.has("sl")).toBe(true);
    expect(svg).toMatch(/\.hj-day\{stroke:none;/);
    // Card edges on the big planes: slabs, walls, pods.
    for (const id of ["slab-ground-0", "wall-floor1-left", "fx-pod-H01"]) expect(svg, id).toMatch(new RegExp(`<g id="${id}"[^>]*><path class="ce e`));
  });

  it("sets its faces closer in tone than the model", () => {
    const fillOf = (svg: string, cls: string) => new RegExp(`\\.hj-day \\.${cls}\\{fill:(#[0-9a-f]{6})`).exec(svg)?.[1];
    const model0 = renderCutaway({ theme: "day" });
    const paper0 = renderCutaway({ theme: "day", outfit: "paper" });
    const lum = (hex: string) => [1, 3, 5].reduce((s, i) => s + Number.parseInt(hex.slice(i, i + 2), 16), 0);
    const gap = (svg: string) => lum(fillOf(svg, "wd0")!) - lum(fillOf(svg, "wd2")!);
    expect(gap(paper0)).toBeGreaterThan(0);
    expect(gap(paper0)).toBeLessThan(gap(model0) * 0.6);
  });

  it("dresses the plans too, in the model plans' projection", () => {
    for (const floor of ["ground", "floor1"] as const) {
      const svg = renderPlan(floor, { outfit: "paper", theme: "day" });
      expect(svg).toContain(`id="floor-${floor}"`);
      expect(svg).toContain('class="sl"');
      for (const a of model.areas.filter((x) => x.floor === floor)) expect(svg, a.id).toContain(`id="area-${a.id}"`);
    }
  });
});

describe("deckle", () => {
  const square: [number, number][] = [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
  ];

  it("keeps the corners, breaks long runs, nudges by at most max, and is the same every time", () => {
    const out = deckle(square, "slab-ground");
    expect(deckle(square, "slab-ground")).toEqual(out);
    expect(out.length).toBeGreaterThan(square.length);
    for (const c of square) expect(out).toContainEqual(c);
    for (const [x, y] of out) {
      const off = Math.min(Math.abs(x), Math.abs(x - 100), Math.abs(y), Math.abs(y - 100));
      expect(off).toBeLessThanOrEqual(0.6 + 1e-9);
    }
    expect(deckle(square, "another")).not.toEqual(out);
  });

  it("leaves short runs straight", () => {
    const small: [number, number][] = [
      [0, 0],
      [15, 0],
      [15, 15],
    ];
    expect(deckle(small, "x")).toEqual(small);
  });

  it("cuts a shared edge the same from both sides, so faces meet without a gap", () => {
    const a = deckle(
      [
        [0, 0],
        [100, 0],
        [100, 50],
      ],
      "wall",
    );
    const b = deckle(
      [
        [100, 0],
        [0, 0],
        [0, -50],
      ],
      "wall",
    );
    const onEdge = (pts: readonly (readonly [number, number])[]) =>
      pts
        .filter(([x, y]) => Math.abs(y) <= 0.6 && x > 0 && x < 100)
        .map(([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`)
        .sort();
    expect(onEdge(a).length).toBeGreaterThan(0);
    expect(onEdge(b)).toEqual(onEdge(a));
  });
});

describe("the thread of a walk", () => {
  for (const route of model.routes) {
    it(`${route.id}: one path per floor in walking order, its stops ringed, at most 4 kB, the same every time`, () => {
      const t = renderThreadLayer(route.id, { idPrefix: "t-" });
      expect(renderThreadLayer(route.id, { idPrefix: "t-" })).toEqual(t);
      const bytes = Object.values(t.floors).reduce((sum, svg) => sum + Buffer.byteLength(svg!), 0) + Buffer.byteLength(t.link);
      expect(bytes).toBeLessThanOrEqual(4096);
      const floors = model.floors.filter((f) => route.segments.some((s) => s.floor === f.id)).map((f) => f.id);
      expect(Object.keys(t.floors).sort()).toEqual([...floors].sort());
      for (const floor of floors) {
        const svg = t.floors[floor]!;
        expect(svg).toMatch(/^<svg [^>]*viewBox="[^"]+" aria-hidden="true"[^>]*>/);
        expect(svg).toContain(`<path id="t-th-${floor}" class="th" pathLength="1" d="M`);
        const rings = svg.match(/<circle data-stop="[^"]+" data-at="[\d.]+"/g) ?? [];
        expect(rings.length, floor).toBe(t.stops.filter((s) => s.floor === floor).length);
        expect(svg).not.toMatch(/#[0-9a-f]{3,6}|var\(/);
      }
      expect(t.stops.length).toBe((route.stops ?? []).length);
      // Walking order: the stops' shares rise, from 0 to 1.
      const ats = t.stops.map((s) => s.at);
      expect([...ats].sort((p, q) => p - q)).toEqual(ats);
      for (const at of ats) expect(at >= 0 && at <= 1).toBe(true);
      // The floors' shares run on from one to the next, in walking order, and cover the walk.
      const shares = floors.map((f) => t.shares[f]!).sort((p, q) => p[0] - q[0]);
      expect(shares[0]![0]).toBe(0);
      expect(shares[shares.length - 1]![1]).toBe(1);
      for (let i = 1; i < shares.length; i++) expect(shares[i]![0]).toBeCloseTo(shares[i - 1]![1], 3);
      expect(t.link === "").toBe(floors.length === 1);
      for (const s of t.stops) {
        const stop = route.stops!.find((x) => x.label === s.label && x.floor === s.floor)!;
        expect(s.does).toBe(stop.does);
        expect(s.rules).toEqual(stop.rules ?? []);
      }
    });
  }

  it("lifts the stairs between floors with their floors", () => {
    const t = renderThreadLayer("arrival", { idPrefix: "a-" });
    const [, x1, y1, x2, y2] = /d="M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)"/.exec(t.link)!.map(Number);
    expect(x2).toBeCloseTo(x1!, 1);
    expect(y1! - y2!).toBeCloseTo(90, 0);
  });

  it("closes pod H01's curtain on its open side, on the 1st floor under the thread", () => {
    const t = renderThreadLayer("arrival", { idPrefix: "a-", curtain: "pod-H01" });
    expect(t.floors.floor1).toMatch(/<g data-curtain="pod-H01" stroke="none" transform="matrix\([-\d. ]+\)"><rect width="1" height="1"\/><\/g><path/);
    expect(t.floors.ground).not.toContain("data-curtain");
    expect(() => renderThreadLayer("arrival", { idPrefix: "a-", curtain: "pod-H99" })).toThrow(/pod-H99/);
  });

  it("refuses an unknown walk or a prefix that is not an identifier", () => {
    expect(() => renderThreadLayer("nope", { idPrefix: "a" })).toThrow(/route "nope"/);
    expect(() => renderThreadLayer("arrival", { idPrefix: "2a" })).toThrow(/idPrefix/);
  });

  it("can keep to some floors", () => {
    const t = renderThreadLayer("housekeeping-round", { idPrefix: "k-", floors: ["ground", "floor1"] });
    expect(Object.keys(t.floors).sort()).toEqual(["floor1", "ground"]);
    expect(t.stops.every((s) => s.floor !== "floor2")).toBe(true);
  });
});

describe("the house's lights", () => {
  const lights = lightPoints();

  it("never light the shrine", () => {
    const shrine = model.fixtures.find((f) => f.type === "shrine")!;
    expect(lights.some((l) => l.id === shrine.id)).toBe(false);
    for (const l of lights) expect(model.fixtures.find((f) => f.id === l.id)!.type).not.toBe("shrine");
  });

  it("are the house's own lamps, windows, jars, signs and the drinks fridge, numbered in walking order", () => {
    expect(new Set(lights.map((l) => l.id)).size).toBe(lights.length);
    expect(lights.map((l) => l.order)).toEqual(lights.map((_, i) => i));
    for (const id of ["jar-big", "jar-clay-stairs", "fridge-drinks", "sign-hanging"]) expect(lights.map((l) => l.id)).toContain(id);
    expect(lights.filter((l) => l.kind === "pendant")).toHaveLength(model.fixtures.filter((f) => f.type === "pendant-lamp").length);
    // The big jar is met before the check-in, the landing jar on the way up.
    const order = (id: string) => lights.find((l) => l.id === id)!.order;
    expect(order("jar-big")).toBeLessThan(order("jar-clay-stairs"));
    const [x, y, w, h] = stageGeometry().viewBox;
    for (const l of lights) {
      expect(l.x >= x && l.x <= x + w && l.y >= y && l.y <= y + h, l.id).toBe(true);
      expect(l.r).toBeGreaterThan(0);
    }
  });

  it("keep to the floors asked for, numbered again", () => {
    const ground = lightPoints(["ground"]);
    expect(ground.every((l) => l.floor === "ground")).toBe(true);
    expect(ground.map((l) => l.order)).toEqual(ground.map((_, i) => i));
  });
});

describe("anchors, faces and plans", () => {
  it("places areas and fixtures on the stage, and nothing for an unknown id", () => {
    const [x, y, w, h] = stageGeometry().viewBox;
    for (const id of ["area-cafe", "area-dorm-h", "fx-pod-H01", "fx-jar-big", "fx-shoe-cubbies"]) {
      const a = anchorOf(id)!;
      expect(a, id).toBeDefined();
      expect(a.x >= x && a.x <= x + w && a.y >= y && a.y <= y + h, id).toBe(true);
    }
    expect(anchorOf("area-dorm-h")!.floor).toBe("floor1");
    expect(anchorOf("fx-nope")).toBeUndefined();
    expect(anchorOf("area-nope")).toBeUndefined();
    expect(anchorOf("cafe")).toBeUndefined();
  });

  it("maps the unit square onto a fixture's face", () => {
    const f = model.fixtures.find((x) => x.id === "counter")!;
    const p = isoProjection(model.depth);
    const [a, b, c, d, e, ff] = faceMatrix("counter", "front");
    const at = (u: number, v: number) => [a * u + c * v + e, b * u + d * v + ff];
    const near = (q: number[], r: readonly number[]) => expect(Math.hypot(q[0]! - r[0]!, q[1]! - r[1]!)).toBeLessThan(0.05);
    near(at(0, 0), p.point([f.box.x0, f.box.y0, f.box.z1]));
    near(at(1, 0), p.point([f.box.x1, f.box.y0, f.box.z1]));
    near(at(0, 1), p.point([f.box.x0, f.box.y0, f.box.z0]));
    const [ra, rb, , rd] = faceMatrix("fx-counter", "right");
    expect(ra).toBeGreaterThan(0);
    expect(rb).toBeLessThan(0);
    expect(rd).toBeGreaterThan(0);
    expect(() => faceMatrix("nope", "front")).toThrow(/nope/);
  });

  it("lays the plans' areas in the paper plans' own frame", () => {
    for (const floor of ["ground", "floor1"] as const) {
      const overlay = planOverlay(floor);
      expect(overlay.viewBox).toEqual(viewBoxOf(renderPlan(floor, { outfit: "paper", theme: "day" })));
      expect(overlay.viewBox).toEqual(viewBoxOf(renderPlan(floor, { outfit: "paper", theme: "evening" })));
      expect(overlay.areas.map((a) => a.id).sort()).toEqual(
        model.areas
          .filter((a) => a.floor === floor)
          .map((a) => a.id)
          .sort(),
      );
      for (const a of overlay.areas) expect(a.d, a.id).toMatch(/^(M-?[\d.]+ -?[\d.]+(L-?[\d.]+ -?[\d.]+){3}Z)+$/);
      // Each area's name, at the point the plan writes it: inside the plan's frame.
      const [x, y, w, h] = overlay.viewBox;
      for (const a of overlay.areas) {
        expect(a.name, a.id).toBe(model.areas.find((m) => m.id === a.id)!.name);
        expect(a.label[0], a.id).toBeGreaterThanOrEqual(x);
        expect(a.label[0], a.id).toBeLessThanOrEqual(x + w);
        expect(a.label[1], a.id).toBeGreaterThanOrEqual(y);
        expect(a.label[1], a.id).toBeLessThanOrEqual(y + h);
      }
    }
  });
});

describe("public/house/walks.json", () => {
  it("is exactly a fresh walksJson() (run npm run house:render after changing the model)", () => {
    expect(readFileSync(join(process.cwd(), "public/house/walks.json"), "utf8")).toBe(walksJson());
  });

  it("holds every walk with its thread, in the stage's frame", () => {
    const walks = JSON.parse(walksJson()) as { viewBox: number[]; liftPerLevel: number; routes: Record<string, { name: string; floors: Record<string, string> }> };
    expect(walks.viewBox).toEqual([...stageGeometry().viewBox]);
    expect(walks.liftPerLevel).toBe(90);
    expect(Object.keys(walks.routes).sort()).toEqual(model.routes.map((r) => r.id).sort());
    for (const r of model.routes) expect(walks.routes[r.id]!.name).toBe(r.name);
  });
});
