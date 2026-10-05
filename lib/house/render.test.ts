import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { S } from "./geometry";
import { houseOfJars as model } from "./house-of-jars";
import { fillingClass, styledClass } from "./palette";
import { HOUSE_RENDERS, renderCutaway, renderPlan, renderStreet, wallPieces } from "./render";
import type { FloorId, HouseModel } from "./types";

const views: Record<string, () => string> = {
  street: () => renderStreet(),
  "street with neighbours": () => renderStreet({ neighbours: true }),
  "street, evening": () => renderStreet({ theme: "evening" }),
  cutaway: () => renderCutaway(),
  "cutaway exploded 3, labelled": () => renderCutaway({ explode: 3, labels: true }),
  "cutaway with the arrival route": () => renderCutaway({ explode: 2.5, route: "arrival", labels: true }),
  "cutaway, Floor 1 highlighted": () => renderCutaway({ highlight: ["dorm-h", "bath-women"], theme: "day" }),
  "cutaway, ground floor only": () => renderCutaway({ floors: ["ground"], route: "water" }),
  "cutaway, the café highlighted and labelled, big labels": () => renderCutaway({ explode: 1.5, highlight: ["cafe"], labels: true, labelSize: 30 }),
  "cutaway, room to explode at runtime": () => renderCutaway({ fitExplode: 2.5, labels: true }),
  "street, the whole depth": () => renderStreet({ depth: model.depth }),
  "plan ground": () => renderPlan("ground"),
  "plan floor1": () => renderPlan("floor1"),
  "plan floor2": () => renderPlan("floor2", { theme: "evening" }),
  "plan outside": () => renderPlan("outside"),
};

interface Parsed {
  viewBox: [number, number, number, number];
  points: [number, number][];
  ids: string[];
}

/**
 * The viewBox, every drawn point (d and points attributes, and the corners of every text's box from its
 * x, y and textLength, after the groups' translates and a text's own matrix) and every id.
 */
function parse(svg: string): Parsed {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)![1]!.split(" ").map(Number) as [number, number, number, number];
  const points: [number, number][] = [];
  const ids: string[] = [];
  const stack: number[] = [];
  for (const tag of svg.match(/<[^>]+>/g) ?? []) {
    if (tag.startsWith("</g")) {
      stack.pop();
      continue;
    }
    const id = /\sid="([^"]+)"/.exec(tag)?.[1];
    if (id) ids.push(id);
    if (tag.startsWith("<g") && !tag.endsWith("/>")) {
      const t = /transform="translate\((-?[\d.]+),(-?[\d.]+)\)"/.exec(tag);
      expect(t === null || Number(t[1]) === 0, "only vertical translates").toBe(true);
      stack.push(t ? Number(t[2]) : 0);
    }
    const dy = stack.reduce((sum, v) => sum + v, 0);
    for (const attr of [/\sd="([^"]+)"/.exec(tag)?.[1], /\spoints="([^"]+)"/.exec(tag)?.[1]]) {
      if (!attr) continue;
      expect(attr, "only M, L, C, Q and Z commands").toMatch(/^[MLCQZ\d\s.-]+$/);
      const nums = attr.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      expect(nums.length % 2, "coordinates come in pairs").toBe(0);
      for (let i = 0; i < nums.length; i += 2) points.push([nums[i]!, nums[i + 1]! + dy]);
    }
    if (tag.startsWith("<text")) {
      const num = (name: string) => Number(new RegExp(`\\s${name}="([^"]+)"`).exec(tag)?.[1] ?? 0);
      const size = Number(/font-size:([\d.]+)px/.exec(tag)?.[1] ?? 19);
      const w = num("textLength");
      const anchor = /text-anchor="(\w+)"/.exec(tag)?.[1] ?? "start";
      const left = num("x") - (anchor === "middle" ? w / 2 : anchor === "end" ? w : 0);
      const m = /transform="matrix\(([^)]+)\)"/.exec(tag)?.[1]?.split(" ").map(Number) ?? [1, 0, 0, 1, 0, 0];
      for (const [tx, ty] of [
        [left, num("y") - size * 0.8],
        [left + w, num("y") + size * 0.25],
        [left, num("y") + size * 0.25],
        [left + w, num("y") - size * 0.8],
      ] as const)
        points.push([m[0]! * tx + m[2]! * ty + m[4]!, m[1]! * tx + m[3]! * ty + m[5]! + dy]);
    }
  }
  expect(stack, "groups balance").toEqual([]);
  return { viewBox, points, ids };
}

/** The ids of the groups enclosing each element with an id. */
function enclosing(svg: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const stack: string[] = [];
  for (const tag of svg.match(/<[^>]+>/g) ?? []) {
    if (tag.startsWith("</g")) {
      stack.pop();
      continue;
    }
    const id = /\sid="([^"]+)"/.exec(tag)?.[1] ?? "";
    if (id) out.set(id, [...stack]);
    if (tag.startsWith("<g") && !tag.endsWith("/>")) stack.push(id);
  }
  return out;
}

describe("the house renders", () => {
  for (const [name, render] of Object.entries(views)) {
    describe(name, () => {
      const svg = render();

      it("renders the same twice, byte for byte", () => {
        expect(render()).toBe(svg);
      });

      it("is an accessible image: title and description first, role img", () => {
        expect(svg).toMatch(/^<svg [^>]*role="img"[^>]*><title id="[^"]+">[^<]+<\/title><desc id="[^"]+">[^<]+\.<\/desc><style>/);
      });

      it("has unique ids, no filters and no broken numbers", () => {
        const { ids } = parse(svg);
        expect(new Set(ids).size, ids.find((id, i) => ids.indexOf(id) !== i)).toBe(ids.length);
        expect(svg).not.toContain("<filter");
        expect(svg).not.toMatch(/NaN|Infinity|undefined|null/);
      });

      it("keeps every drawn point inside the viewBox", () => {
        const { viewBox, points } = parse(svg);
        const [x, y, w, h] = viewBox;
        expect(points.length).toBeGreaterThan(10);
        const outside = points.filter(([px, py]) => px < x || px > x + w || py < y || py > y + h);
        expect(outside.slice(0, 5)).toEqual([]);
      });

      it("stays under 400 kB", () => {
        expect(Buffer.byteLength(svg)).toBeLessThan(400 * 1024);
      });

      it("has a stylesheet rule for every class it uses", () => {
        const scope = /<svg [^>]*class="([^"]+)"/.exec(svg)![1]!;
        const css = /<style>([\s\S]*?)<\/style>/.exec(svg)![1]!;
        const used = new Set((svg.match(/\sclass="([^"]+)"/g) ?? []).flatMap((c) => c.slice(8, -1).split(" ")));
        used.delete(scope);
        for (const cls of used) {
          expect(styledClass(cls), cls).toBe(true);
          expect(css, cls).toContain(`.${scope} .${cls}`);
        }
      });

      it("never leaves a shape to SVG's default black fill: a path with an area has a class that fills it", () => {
        const unfilled: string[] = [];
        for (const tag of svg.match(/<path [^>]*>/g) ?? []) {
          const classes = /\sclass="([^"]+)"/.exec(tag)?.[1]?.split(" ") ?? [];
          if (classes.some(fillingClass)) continue;
          const d = /\sd="([^"]+)"/.exec(tag)![1]!;
          // A path without an area: every sub-path one straight segment.
          const flat = d.split("M").filter(Boolean).every((sub) => !/[CQZ]/.test(sub) && sub.split("L").length <= 2);
          if (!flat) unfilled.push(tag.slice(0, 80));
        }
        expect(unfilled.slice(0, 5)).toEqual([]);
      });
    });
  }

  it("carries the Evening palette under the dark media query in auto, and only one palette otherwise", () => {
    expect(renderCutaway()).toContain("@media (prefers-color-scheme:dark)");
    expect(renderPlan("ground")).toContain("@media (prefers-color-scheme:dark)");
    expect(renderStreet({ theme: "day" })).not.toContain("@media");
    expect(renderStreet({ theme: "evening" })).not.toContain("@media");
    expect(renderStreet({ theme: "evening" })).toContain("stroke:#dccdb6");
  });
});

describe("the id and data-attribute contract", () => {
  const floorIds = model.floors.map((f) => f.id);

  it("draws every floor as its own group, bottom to top, with data-floor and data-level", () => {
    for (const svg of [renderStreet(), renderCutaway(), renderCutaway({ explode: 2 })]) {
      let last = -1;
      for (const f of model.floors) {
        const at = svg.indexOf(`<g id="floor-${f.id}" data-floor="${f.id}" data-level="${f.level}"`);
        expect(at, f.id).toBeGreaterThan(last);
        last = at;
      }
    }
  });

  it("gives every area and every pod its group, inside its floor's group", () => {
    const svg = renderCutaway();
    const parents = enclosing(svg);
    for (const a of model.areas) {
      expect(svg, a.id).toContain(`<g id="area-${a.id}" data-area="${a.id}" data-kind="${a.kind}"`);
      expect(parents.get(`area-${a.id}`), a.id).toContain(`floor-${a.floor}`);
    }
    for (const pod of model.fixtures.filter((f) => f.type === "pod")) {
      expect(svg, pod.id).toContain(`<g id="fx-${pod.id}" data-fixture="pod" data-label="${pod.label}" data-area="${pod.area}"`);
      expect(parents.get(`fx-${pod.id}`), pod.id).toContain(`floor-${pod.floor}`);
    }
  });

  it("draws everything of a floor inside that floor's group: every fixture, wall and route", () => {
    for (const svg of [renderCutaway({ explode: 2, route: "arrival", labels: true }), renderStreet({ neighbours: true })]) {
      const stack: { id: string; floor?: string }[] = [];
      let checked = 0;
      for (const tag of svg.match(/<[^>]+>/g) ?? []) {
        if (tag.startsWith("</g")) {
          stack.pop();
          continue;
        }
        const floorOf = () => [...stack].reverse().find((g) => g.floor)?.floor;
        const id = /\sid="([^"]+)"/.exec(tag)?.[1] ?? "";
        const fx = /^fx-(.+)$/.exec(id)?.[1];
        const wall = /\sdata-wall="([^"]+)"/.exec(tag)?.[1];
        const route = /\sdata-route="[^"]+" data-floor="([^"]+)"/.exec(tag)?.[1];
        const expected = fx ? model.fixtures.find((f) => f.id === fx)!.floor : wall ? model.walls.find((w) => w.id === wall)!.floor : route;
        if (expected) {
          checked++;
          expect(floorOf(), id || wall || tag).toBe(expected);
        }
        if (tag.startsWith("<g") && !tag.endsWith("/>")) stack.push({ id, floor: /^floor-(\w+)$/.exec(id)?.[1] });
      }
      expect(checked).toBeGreaterThan(20);
    }
  });

  it("matches with g[data-floor=…] exactly the floor's group and its labels group (route paths carry data-floor too, but are not groups)", () => {
    const svg = renderCutaway({ explode: 2, route: "arrival", labels: true });
    for (const f of model.floors) {
      const groups = (svg.match(new RegExp(`<g [^>]*data-floor="${f.id}"[^>]*>`, "g")) ?? []).map((t) => /\sid="([^"]+)"/.exec(t)?.[1]);
      expect(groups, f.id).toEqual([`floor-${f.id}`, `labels-${f.id}`]);
    }
  });

  it("marks sub-areas with their room, and fixtures with the room they stand in", () => {
    const svg = renderCutaway();
    expect(svg).toContain('<g id="area-desk" data-area="desk" data-kind="staff" data-parent="cafe"');
    expect(svg).toMatch(/<g id="fx-counter" data-fixture="counter" data-area="desk" data-room="cafe"/);
    expect(svg).toMatch(/<g id="fx-table-1" data-fixture="table" data-area="cafe" data-room="cafe"/);
  });

  it("gives every area and pod of a floor its group in the floor's plan", () => {
    for (const id of floorIds) {
      const svg = renderPlan(id);
      for (const a of model.areas.filter((x) => x.floor === id)) expect(svg, a.id).toContain(`id="area-${a.id}"`);
      for (const pod of model.fixtures.filter((f) => f.type === "pod" && f.floor === id)) expect(svg, pod.id).toContain(`id="fx-${pod.id}"`);
    }
    expect(renderPlan("outside")).toContain('id="area-terrace"');
  });

  it("reserves room in the viewBox for a runtime explode with fitExplode", () => {
    const vb = (svg: string) => /viewBox="([^"]+)"/.exec(svg)![1];
    expect(vb(renderCutaway({ fitExplode: 3 }))).toBe(vb(renderCutaway({ explode: 3 })));
    expect(vb(renderCutaway({ explode: 3, fitExplode: 0 }))).toBe(vb(renderCutaway({ explode: 3 })));
    // The floors themselves are not moved: only the frame grows.
    expect(renderCutaway({ fitExplode: 3 })).not.toContain("transform=");
  });

  it("lifts each floor by explode x S x level, and fits the viewBox at any explode", () => {
    for (const explode of [0, 3]) {
      const svg = renderCutaway({ explode });
      for (const f of model.floors) {
        const tag = new RegExp(`<g id="floor-${f.id}"[^>]*>`).exec(svg)![0];
        if (explode === 0 || f.level === 0) expect(tag).not.toContain("transform");
        else expect(tag).toContain(`transform="translate(0,${-explode * S * f.level})"`);
      }
    }
    const stacked = parse(renderCutaway()).viewBox;
    const exploded = parse(renderCutaway({ explode: 3 })).viewBox;
    expect(exploded[3] - stacked[3]).toBeCloseTo(3 * S * 2, -1);
  });

  it("draws a route as one path per floor, inside that floor's group, with depth-sorted pieces, stops labelled, and links between lifted floors", () => {
    const svg = renderCutaway({ route: "arrival", explode: 2 });
    const parents = enclosing(svg);
    for (const floor of ["ground", "floor1"] as FloorId[]) {
      expect(svg).toMatch(new RegExp(`<path class="rh" id="route-arrival-${floor}" data-route="arrival" data-floor="${floor}"`));
      expect(parents.get(`route-arrival-${floor}`)).toEqual([`floor-${floor}`]);
    }
    expect(svg).not.toContain("route-arrival-floor2");
    // The pieces the walls and beds can hide.
    expect((svg.match(/<path class="rt" /g) ?? []).length).toBeGreaterThan(40);
    // The stops have their labels even without labels: true.
    expect(svg).toContain('data-label-stop="Check in"');
    expect(svg).toContain('data-label-stop="Shoes"');
    // From the top of the flight to Floor 1, drawn outside the floors (it spans two).
    expect(parents.get("route-arrival-link-ground-floor1")).toEqual([]);
    expect(renderCutaway({ route: "arrival" })).not.toContain("route-arrival-link");
    // The arrowhead ends the route on the floors drawn.
    expect(renderCutaway({ route: "arrival", floors: ["ground"] })).toContain('class="ra"');
  });

  it("labels carry their anchor and text, for overlaying the site's own labels", () => {
    const svg = renderCutaway({ labels: true, explode: 2 });
    expect(svg).toMatch(/<g data-label-area="cafe" data-text="Café" data-ax="-?[\d.]+" data-ay="-?[\d.]+">/);
    expect(renderCutaway({ labels: true, labelSize: 30 })).toContain('style="font-size:30px"');
  });

  it("drops a label whose anchor a floor above hides", () => {
    // Stacked, Floor 1 covers the stairs; lifted apart, the stairs show.
    expect(renderCutaway({ labels: true })).not.toContain('data-label-area="stairs-ground"');
    expect(renderCutaway({ labels: true, explode: 2.5 })).toContain('data-label-area="stairs-ground"');
    // The café's front shows under Floor 1, past the removed right wall.
    expect(renderCutaway({ labels: true })).toContain('data-label-area="cafe"');
  });

  it("puts one labels group per floor, moved with its floor", () => {
    const svg = renderCutaway({ labels: true, explode: 2 });
    for (const f of model.floors) {
      const tag = new RegExp(`<g id="labels-${f.id}"[^>]*>`).exec(svg)![0];
      expect(tag).toContain("data-labels");
      expect(tag).toContain(`data-floor="${f.id}"`);
      if (f.level > 0) expect(tag).toContain(`translate(0,${-2 * S * f.level})`);
    }
  });

  it("fades what is not highlighted and outlines what is", () => {
    const svg = renderCutaway({ highlight: ["dorm-h"], labels: true });
    // Floors with nothing highlighted fade as a whole; on Floor 1 the other areas become opaque ghosts.
    expect(svg).toContain('<g id="floor-ground" data-floor="ground" data-level="0" class="dim"');
    expect(svg).toMatch(/<g id="floor-floor2" data-floor="floor2" data-level="2" data-confirmed="false" class="dim"/);
    expect(svg).toContain('<g id="floor-floor1" data-floor="floor1" data-level="1">');
    expect(svg).toContain('<g id="area-landing-1" class="dg"');
    expect(svg).not.toContain('<g id="area-dorm-h" class="dg"');
    expect(svg).toMatch(/<g id="fx-shoe-cubbies" class="dg"/);
    expect(svg).toMatch(/<g id="fx-pod-H01" data-fixture/);
    expect(svg).toContain('class="hl"');
    expect(svg).toMatch(/\.hj-auto \.dim\{opacity:/);
    expect(svg).toMatch(/\.hj-auto \.dg path:not\(\.n\)\{fill:/);
    // The labels follow: the faded ones dim, the highlighted one outlined.
    expect(svg).toMatch(/<g class="dim" data-label-area="cafe"/);
    expect(svg).toMatch(/<g data-label-area="dorm-h"[^>]*><path class="ld"[^>]*\/><path class="lp"[^>]*\/><path class="lb lbh"/);
  });

  it("highlights a room with its sub-areas: the café keeps its counter and entrance, the corridor its water corner", () => {
    const svg = renderCutaway({ highlight: ["cafe"] });
    for (const id of ["counter", "back-counter", "door-front", "table-1"]) expect(svg, id).toMatch(new RegExp(`<g id="fx-${id}" data-fixture`));
    for (const id of ["desk", "entrance"]) expect(svg, id).toContain(`<g id="area-${id}" data-area`);
    const corridor = renderCutaway({ highlight: ["corridor"] });
    expect(corridor).toMatch(/<g id="fx-water-dispenser" data-fixture/);
    expect(corridor).toContain('<g id="area-water" data-area');
    expect(svg).toContain('<g id="area-terrace" class="dg"');
    // A mounted fixture in a faded host is not faded twice.
    const hl = renderCutaway({ highlight: ["dorm-h"] });
    expect(hl).toMatch(/<g id="fx-vanity-women" class="dg"/);
    expect(hl).toMatch(/<g id="fx-basin-women-1" data-fixture/);
  });

  it("prefixes every id, so two drawings can share a page", () => {
    for (const svg of [renderCutaway({ idPrefix: "b-", labels: true, route: "arrival", explode: 1 }), renderStreet({ idPrefix: "b-", neighbours: true }), renderPlan("floor1", { idPrefix: "b-" })]) {
      const { ids } = parse(svg);
      for (const id of ids) expect(id.startsWith("b-"), id).toBe(true);
      expect(svg).toContain('aria-labelledby="b-title b-desc"');
      expect(svg).toContain('class="b-hj-auto"');
    }
  });

  it("refuses bad options instead of drawing a wrong picture", () => {
    expect(() => renderCutaway({ floors: [] })).toThrow(/no floors/);
    expect(() => renderCutaway({ floors: ["roof" as FloorId] })).toThrow(/No floor roof/);
    expect(() => renderCutaway({ explode: Number.NaN })).toThrow(/explode/);
    expect(() => renderCutaway({ explode: -1 })).toThrow(/explode/);
    expect(() => renderCutaway({ fitExplode: Number.POSITIVE_INFINITY })).toThrow(/fitExplode/);
    expect(() => renderCutaway({ route: "nope" })).toThrow(/route "nope"/);
    expect(() => renderCutaway({ highlight: ["nope"] })).toThrow(/area "nope"/);
    expect(() => renderCutaway({ labels: true, labelSize: 0 })).toThrow(/labelSize/);
    expect(() => renderStreet({ depth: 0 })).toThrow(/depth/);
    expect(() => renderPlan("roof" as FloorId)).toThrow(/No floor roof/);
    // An idPrefix becomes part of a CSS class: one that is not an identifier would black out the drawing.
    for (const prefix of ["2-", "house:", "v1.2-", 'a"b', "a b"]) {
      expect(() => renderCutaway({ idPrefix: prefix }), prefix).toThrow(/idPrefix/);
      expect(() => renderStreet({ idPrefix: prefix }), prefix).toThrow(/idPrefix/);
      expect(() => renderPlan("ground", { idPrefix: prefix }), prefix).toThrow(/idPrefix/);
    }
  });

  it("draws a highlight on floors not drawn as no highlight, and names a route in the description only when it shows", () => {
    expect(renderCutaway({ highlight: ["dorm-h"], floors: ["ground"] })).not.toContain('class="dim"');
    expect(renderCutaway({ route: "bathroom-women", floors: ["ground"] })).not.toMatch(/<desc[^>]*>[^<]*route/);
    expect(renderCutaway({ route: "arrival", floors: ["ground"] })).toMatch(/<desc[^>]*>[^<]*the route &quot;Arriving/);
  });

  it("draws only the floors asked for", () => {
    const svg = renderCutaway({ floors: ["floor1"] });
    expect(svg).toContain('id="floor-floor1"');
    expect(svg).not.toContain('id="floor-ground"');
    expect(svg).not.toContain('id="floor-floor2"');
  });

  it("keeps the facade's outside things out of the cutaway above its cut line, and the right wall's things out entirely", () => {
    const svg = renderCutaway();
    expect(svg).not.toContain('id="fx-ac-outdoor-2"');
    expect(svg).not.toContain('id="fx-awning"');
    expect(svg).not.toContain('id="fx-mirror-women-1"');
    expect(svg).toContain('id="fx-door-front"');
    const street = renderStreet();
    expect(street).toContain('id="fx-ac-outdoor-2"');
    expect(street).toContain('id="fx-awning"');
    expect(street).not.toContain('id="fx-pod-H01"');
  });
});

describe("drawn from the model, not from constants in the renderer", () => {
  it("cuts the stairwell where the model's floor says, and builds the roof from the model's", () => {
    const moved: HouseModel = {
      ...model,
      floors: model.floors.map((f) => (f.opening ? { ...f, opening: { ...f.opening, x0: 2.75, x1: 4.0 } } : f)),
      roof: { z0: model.roof.z0, z1: model.roof.z1 + 0.5 },
    };
    const landing = (svg: string) => /<g id="area-landing-1"[\s\S]*?<\/g>/.exec(svg)![0];
    expect(landing(renderCutaway({ model: moved, floors: ["floor1"] }))).not.toBe(landing(renderCutaway({ floors: ["floor1"] })));
    const roof = (svg: string) => /<g id="roof">[\s\S]*?<\/g>/.exec(svg)![0];
    expect(roof(renderStreet({ model: moved }))).not.toBe(roof(renderStreet()));
  });

  it("describes a plan from the model: the dorm's pods and lockers counted, a floor not seen yet noted", () => {
    expect(renderPlan("floor1")).toMatch(/<desc[^>]*>A plan of Floor 1 of House of Jars, street at the bottom: Dorm H \(14 pods, 14 lockers\), Landing \(the shoe cubbies\)/);
    const floor2 = renderPlan("floor2");
    expect(floor2).toMatch(/<desc[^>]*>[^<]*Not photographed yet/);
    expect(floor2).toContain(">Not photographed yet: copied from Floor 1 on the owner's word.</text>");
    expect(renderPlan("floor2")).toMatch(/<g id="labels-floor2" data-labels="" data-floor="floor2">/);
  });

  it("shows Floor 2's small windows on its plan although both miss the plan's cut height", () => {
    expect(renderPlan("floor2")).toMatch(/<g id="fx-window-j-low" data-fixture="window"/);
    const pieces = (svg: string) => (/<g data-walls="">([\s\S]*?)<\/g>/.exec(svg)![1]!.match(/<path/g) ?? []).length;
    // Floor 2 adds one wall piece: the parapet beside the first flight's hole (no stairs go on up from the top floor).
    expect(pieces(renderPlan("floor2"))).toBe(pieces(renderPlan("floor1")) + 1);
  });
});

describe("walls", () => {
  it("split around their openings, and two windows one above the other share one column", () => {
    const facade = model.walls.find((w) => w.id === "floor1-facade")!;
    const pieces = wallPieces(facade, 2.9);
    // Left of the windows, right of them, and in the column: under, between and over the two windows.
    expect(pieces).toHaveLength(5);
    const column = pieces.filter((p) => p.x0 === 1.75);
    expect(column.map((p) => [p.z0, p.z1])).toEqual([
      [0, 0.2],
      [0.7, 1.0],
      [2.4, 2.9],
    ]);
  });
});

describe("the committed pictures in public/house/", () => {
  it("are exactly a fresh render of the model (run npm run house:render after changing it)", () => {
    const dir = join(process.cwd(), "public/house");
    const files = readdirSync(dir).filter((f) => f.endsWith(".svg"));
    expect(files.sort()).toEqual(HOUSE_RENDERS.map((r) => r.file).sort());
    for (const { file, render } of HOUSE_RENDERS) expect(readFileSync(join(dir, file), "utf8"), file).toBe(render());
  });
});
