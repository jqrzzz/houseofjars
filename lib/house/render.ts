/**
 * The views of the House Model, each an SVG string drawn from the model:
 *
 * - renderStreet: the closed building from the front right, as from the street
 *   (the side wall and roof cropped a few metres back, as the neighbours are);
 * - renderCutaway: the dollhouse (right wall, roof and ceilings taken away,
 *   the facade dropped to a low cut line), optionally exploded, labelled,
 *   highlighted, with a guest's route;
 * - renderPlan: a floor plan of one floor, or of the terrace ("outside").
 *
 * Every floor is its own group (id floor-{id}, data-floor, data-level), drawn
 * bottom to top; areas and fixtures are groups with stable ids and data
 * attributes (see docs/HOUSE_MODEL.md for the contract animators rely on).
 * Same input, byte-identical output. Bad options throw instead of drawing a
 * wrong picture.
 */
import { type FixtureContext, type PlanMark, type StairArrow, climbOf, isoParts, planMarks, planStairs, reverse } from "./fixtures";
import {
  type Bounds,
  type Cmd,
  type Node,
  type Paint,
  type Projection,
  type Vec2,
  type Vec3,
  S,
  Writer,
  box,
  boxFaces,
  circle,
  emptyBounds,
  escapeXml,
  isoProjection,
  line,
  lines,
  num,
  onFront,
  onTop,
  planProjection,
  poly,
  roundRect,
  screen,
  textWidth,
  union,
} from "./geometry";
import { houseOfJars } from "./house-of-jars";
import { type MaterialName, fill, kindFloors, paletteCss, tint } from "./palette";
import type { Area, Box3, Fixture, Floor, FloorId, HouseModel, Rect, Route, Theme, Wall } from "./types";

export interface StreetOptions {
  readonly theme?: Theme;
  /** Draw the neighbours (low-detail, cropped): NinetyNine 99 Bar on the left, Swedish Baking on the right. */
  readonly neighbours?: boolean;
  /**
   * How far back from the facade (metres) the side wall, the roof and the neighbours are drawn; they are
   * cropped there, the cut edges dashed. Default 4, so the facade leads; the model's depth (16) draws the
   * whole building.
   */
  readonly depth?: number;
  readonly idPrefix?: string;
  readonly title?: string;
  /** A model to draw instead of houseOfJars (a copy with something changed, for a what-if or a test). */
  readonly model?: HouseModel;
}

export interface CutawayOptions {
  readonly theme?: Theme;
  /** Extra metres of gap between floors (0 = stacked). */
  readonly explode?: number;
  /**
   * Fit the viewBox to this explode as well as to `explode` (default: `explode`), so the floors can be
   * lifted at runtime with a CSS transform up to that far without leaving the picture.
   */
  readonly fitExplode?: number;
  /** Which floors to draw (default all). */
  readonly floors?: readonly FloorId[];
  /** Area labels with leader lines. */
  readonly labels?: boolean;
  /** The labels' text size in pixels of the viewBox (default 19); route stops are a little smaller. */
  readonly labelSize?: number;
  /** Area ids to emphasise (with their sub-areas); the others are faded. */
  readonly highlight?: readonly string[];
  /** A route id to draw (with its stops labelled). */
  readonly route?: string;
  readonly idPrefix?: string;
  readonly title?: string;
  /** A model to draw instead of houseOfJars. */
  readonly model?: HouseModel;
}

export interface PlanOptions {
  readonly theme?: Theme;
  readonly labels?: boolean;
  readonly idPrefix?: string;
  readonly title?: string;
  /** A model to draw instead of houseOfJars. */
  readonly model?: HouseModel;
}

/** How high the cutaway's facade (and anything outside) stands above each floor. */
export const FACADE_CUT = 1.0;
/**
 * How high the cutaway draws the inner partitions (above the door heads, so
 * doors keep their lintels): full-height walls across the house would hide
 * the first metres of every room behind them from this camera. The outer
 * walls keep their full height; the stairs between upper floors are cut at
 * the same height.
 */
export const PARTITION_CUT = 2.2;
/** How far back the street view draws the side wall, roof and neighbours by default. */
export const STREET_DEPTH = 4;
const MARGIN = 18;

// ---------------------------------------------------------------------------
// Shared pieces

const PREFIX = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/** An idPrefix becomes part of every id and of the stylesheet's scope class, so it must be a CSS identifier. */
function checkPrefix(prefix: string): string {
  if (prefix !== "" && !PREFIX.test(prefix))
    throw new Error(`idPrefix "${prefix}" must start with a letter or _ and hold only letters, digits, _ and -: it becomes part of every id and of a CSS class`);
  return prefix;
}

function floorById(model: HouseModel, id: FloorId): Floor {
  const floor = model.floors.find((f) => f.id === id);
  if (!floor) throw new Error(`No floor ${id}`);
  return floor;
}

function nextFloor(model: HouseModel, floor: Floor): Floor | undefined {
  return model.floors.find((f) => f.level === floor.level + 1);
}

function attrs(values: Record<string, string | number | undefined>): string {
  return Object.entries(values)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}="${escapeXml(String(v))}"`)
    .join("");
}

const confirmedAttr = (thing: { confirmed?: boolean }) => (thing.confirmed === false ? "false" : undefined);

/** Every rectangle of an area (most are one; an L-shaped room has more). */
export function areaRects(area: Area): readonly Rect[] {
  return [area.rect, ...(area.more ?? [])];
}

/** The room an area belongs to: its parent, or itself. */
function roomOf(model: HouseModel, areaId: string): string {
  return model.areas.find((a) => a.id === areaId)?.parent ?? areaId;
}

function areaKind(model: HouseModel, areaId: string) {
  return model.areas.find((a) => a.id === areaId)?.kind;
}

/** Splits a wall around its openings into solid boxes (relative z), the top clipped at `top`. */
export function wallPieces(wall: Wall, top: number): Box3[] {
  const b = wall.box;
  const alongX = b.x1 - b.x0 >= b.y1 - b.y0;
  const lo = alongX ? b.x0 : b.y0;
  const hi = alongX ? b.x1 : b.y1;
  const make = (a0: number, a1: number, z0: number, z1: number): Box3 | null => {
    const zz1 = Math.min(z1, top);
    if (a1 - a0 < 1e-6 || zz1 - z0 < 1e-6) return null;
    return alongX ? box(a0, a1, b.y0, b.y1, z0, zz1) : box(b.x0, b.x1, a0, a1, z0, zz1);
  };
  // Openings that share a span (two windows one above the other) form one column with several gaps.
  const spans = new Map<string, { from: number; to: number; gaps: [number, number][] }>();
  for (const o of wall.openings ?? []) {
    const key = `${o.from}:${o.to}`;
    const span = spans.get(key) ?? { from: o.from, to: o.to, gaps: [] };
    span.gaps.push([o.z0 ?? 0, o.z1]);
    spans.set(key, span);
  }
  const sorted = [...spans.values()].sort((p, q) => p.from - q.from);
  const out: (Box3 | null)[] = [];
  let cursor = lo;
  for (const span of sorted) {
    out.push(make(cursor, span.from, b.z0, b.z1));
    const gaps = span.gaps.sort((p, q) => p[0] - q[0]);
    let z = b.z0;
    for (const [g0, g1] of gaps) {
      out.push(make(span.from, span.to, z, g0));
      z = g1;
    }
    out.push(make(span.from, span.to, z, b.z1));
    cursor = span.to;
  }
  out.push(make(cursor, hi, b.z0, b.z1));
  return out.filter((p): p is Box3 => p !== null);
}

interface WallStyle {
  readonly view: "street" | "cutaway";
  readonly width: number;
}

/**
 * A wall's nodes: its solid pieces (around the openings), drawn without their
 * main face, and the main face itself as one shape with the openings cut out,
 * outlined only along its true edges (no seams where the pieces meet). Main
 * outlines are 1.5 px; cut faces (tops in the cutaway, ends at the removed
 * right wall) are hairlines, the cut top outlined once along each run.
 */
function wallNodes(wall: Wall, top: number, z: number, style: WallStyle, faceMaterial: { front?: MaterialName; right?: MaterialName; top?: MaterialName } = {}): Node[] {
  const m = wall.material;
  const alongX = wall.box.x1 - wall.box.x0 >= wall.box.y1 - wall.box.y0;
  const cutaway = style.view === "cutaway";
  const pieces = wallPieces(wall, top).map((piece) => ({ ...piece, z0: piece.z0 + z, z1: piece.z1 + z }));
  if (pieces.length === 0) return [];
  const topZ = Math.max(...pieces.map((b) => b.z1));
  const atTop = (b: Box3) => b.z1 >= topZ - 1e-6;
  const group = { open: `<g${attrs({ "data-wall": wall.id })}>`, close: "</g>" };
  const mainCls = `${fill(alongX ? (faceMaterial.front ?? m) : (faceMaterial.right ?? m), alongX ? 1 : 2)}`;
  const nodes: Node[] = pieces.map((b) => {
    const rightIsCut = cutaway && alongX && b.x1 >= style.width - 1e-6;
    const paint = boxFaces(b, {
      front: alongX ? "" : `${fill(faceMaterial.front ?? m, 1)} o`,
      right: alongX ? `${fill(faceMaterial.right ?? m, 2)} ${rightIsCut ? "h" : "o"}` : "",
      top: `${fill(faceMaterial.top ?? m, 0)} ${cutaway ? (atTop(b) ? "ns" : "h") : "o"}`,
    });
    return { box: b, paint, ...group };
  });
  if (cutaway) {
    // The cut along the top: one hairline outline per run of pieces, so no seams cross it.
    const spans = pieces
      .filter(atTop)
      .map((b) => (alongX ? [b.x0, b.x1] : [b.y0, b.y1]) as [number, number])
      .sort((p, q) => p[0] - q[0]);
    const runs: [number, number][] = [];
    for (const s of spans) {
      const last = runs[runs.length - 1];
      if (last && s[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], s[1]);
      else runs.push([s[0], s[1]]);
    }
    for (const [a0, a1] of runs) {
      const b = alongX ? box(a0, a1, wall.box.y0, wall.box.y1, topZ, topZ) : box(wall.box.x0, wall.box.x1, a0, a1, topZ, topZ);
      nodes.push({ box: b, paint: [poly(onTop(topZ, b.x0, b.x1, b.y0, b.y1), "n h")], ...group });
    }
  }
  // The main face, on its plane: a for the coordinate along the wall, and z.
  const plane = alongX ? wall.box.y0 : wall.box.x1;
  const at = (a: number, zz: number): Vec3 => (alongX ? [a, plane, zz] : [plane, a, zz]);
  const rects: (readonly [number, number, number, number])[] = pieces.map((b) => (alongX ? [b.x0, b.x1, b.z0, b.z1] : [b.y0, b.y1, b.z0, b.z1]));
  const fillCmds = (p: Projection): Cmd[] =>
    rects.flatMap(([a0, a1, z0, z1]) => [
      ["M", ...p.point(at(a0, z0))] as Cmd,
      ["L", ...p.point(at(a1, z0))] as Cmd,
      ["L", ...p.point(at(a1, z1))] as Cmd,
      ["L", ...p.point(at(a0, z1))] as Cmd,
      ["Z"] as Cmd,
    ]);
  const edges = outlineEdges(rects);
  const paint: Paint[] = [
    screen(`${mainCls} ns`, fillCmds),
    screen("n o", (p) => edges.flatMap(([a0, z0, a1, z1]) => [["M", ...p.point(at(a0, z0))] as Cmd, ["L", ...p.point(at(a1, z1))] as Cmd])),
  ];
  if (wall.panelled) {
    // Wood panelling: boards on the face the camera sees, within the solid pieces.
    const boards: Vec3[][] = [];
    for (const [a0, a1, z0, z1] of rects) for (let a = Math.ceil((a0 + 0.05) / 0.3) * 0.3; a < a1 - 0.05; a += 0.3) boards.push([at(a, z0), at(a, z1)]);
    paint.push(lines(boards, "tg"));
  }
  const lo = Math.min(...rects.map((r) => r[0]));
  const hi = Math.max(...rects.map((r) => r[1]));
  const zlo = Math.min(...rects.map((r) => r[2]));
  const zhi = Math.max(...rects.map((r) => r[3]));
  const faceBox = alongX ? box(lo, hi, plane, plane, zlo, zhi) : box(plane, plane, lo, hi, zlo, zhi);
  nodes.push({ box: faceBox, paint, ...group });
  return nodes;
}

/** The outline of a union of rectangles [a0, a1, z0, z1]: the cell edges between inside and outside, merged into runs. */
function outlineEdges(rects: readonly (readonly [number, number, number, number])[]): [number, number, number, number][] {
  const key = (v: number) => Math.round(v * 1000) / 1000;
  const as = [...new Set(rects.flatMap((r) => [key(r[0]), key(r[1])]))].sort((p, q) => p - q);
  const zs = [...new Set(rects.flatMap((r) => [key(r[2]), key(r[3])]))].sort((p, q) => p - q);
  const inside = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= as.length - 1 || j >= zs.length - 1) return false;
    const am = (as[i]! + as[i + 1]!) / 2;
    const zm = (zs[j]! + zs[j + 1]!) / 2;
    return rects.some(([a0, a1, z0, z1]) => am > a0 && am < a1 && zm > z0 && zm < z1);
  };
  const out: [number, number, number, number][] = [];
  // Horizontal edges (constant z), merged along a.
  for (let j = 0; j < zs.length; j++) {
    let start: number | null = null;
    for (let i = 0; i <= as.length - 1; i++) {
      const edge = i < as.length - 1 && inside(i, j) !== inside(i, j - 1);
      if (edge && start === null) start = as[i]!;
      if (!edge && start !== null) {
        out.push([start, zs[j]!, as[i]!, zs[j]!]);
        start = null;
      }
    }
  }
  // Vertical edges (constant a), merged along z.
  for (let i = 0; i < as.length; i++) {
    let start: number | null = null;
    for (let j = 0; j <= zs.length - 1; j++) {
      const edge = j < zs.length - 1 && inside(i, j) !== inside(i - 1, j);
      if (edge && start === null) start = zs[j]!;
      if (!edge && start !== null) {
        out.push([as[i]!, start, as[i]!, zs[j]!]);
        start = null;
      }
    }
  }
  return out;
}

/**
 * A box cropped at the plane y = cutY: its visible faces filled without outlines, then its visible edges,
 * solid, except those lying on the cut plane, which are dashed (the street view's cropped wall and roof).
 */
function croppedBox(b: Box3, cls: { top: string; front: string; right: string }, cutY?: number): Paint[] {
  const out = boxFaces(b, { top: cls.top && `${cls.top} ns`, front: cls.front && `${cls.front} ns`, right: cls.right && `${cls.right} ns` });
  const { x0, x1, y0, y1, z0, z1 } = b;
  const edges: Vec3[][] = [];
  if (cls.top) edges.push([[x0, y0, z1], [x1, y0, z1]], [[x1, y0, z1], [x1, y1, z1]], [[x1, y1, z1], [x0, y1, z1]], [[x0, y1, z1], [x0, y0, z1]]);
  if (cls.front) edges.push([[x0, y0, z0], [x1, y0, z0]], [[x0, y0, z0], [x0, y0, z1]], [[x1, y0, z0], [x1, y0, z1]], [[x0, y0, z1], [x1, y0, z1]]);
  if (cls.right) edges.push([[x1, y0, z0], [x1, y1, z0]], [[x1, y1, z0], [x1, y1, z1]], [[x1, y0, z0], [x1, y0, z1]], [[x1, y0, z1], [x1, y1, z1]]);
  const seen = new Set<string>();
  const solid: Vec3[][] = [];
  const cut: Vec3[][] = [];
  for (const e of edges) {
    const k = e
      .map((q) => q.join(","))
      .sort()
      .join("|");
    if (seen.has(k)) continue;
    seen.add(k);
    (cutY !== undefined && e.every((q) => Math.abs(q[1] - cutY) < 1e-6) ? cut : solid).push(e);
  }
  out.push(lines(solid, "n o"));
  if (cut.length > 0) out.push(lines(cut, "dl o"));
  return out;
}

interface DrawnFixture {
  readonly fixture: Fixture;
  readonly node: Node;
}

/**
 * Fixture groups (with mounted fixtures nested in their hosts' groups). `ghost` marks the fixtures to draw
 * as faded ghosts; a mounted fixture inside a ghosted host is not marked again (the fade would compound).
 */
function fixtureNodes(
  model: HouseModel,
  floor: Floor,
  prefix: string,
  include: (f: Fixture) => boolean,
  ctxFor: (f: Fixture) => FixtureContext,
  ghost?: (f: Fixture) => boolean,
): DrawnFixture[] {
  const list = model.fixtures.filter((f) => f.floor === floor.id && include(f));
  const ids = new Set(list.map((f) => f.id));
  const make = (f: Fixture, hostGhosted: boolean): Node | null => {
    const parts = isoParts(f, ctxFor(f), floor.ceiling);
    const faded = !hostGhosted && Boolean(ghost?.(f));
    const children = list
      .filter((g) => g.mountedOn === f.id)
      .map((g) => make(g, hostGhosted || faded))
      .filter((n): n is Node => n !== null);
    const all = [...parts, ...children];
    if (all.length === 0) return null;
    return {
      box: union(all.map((n) => n.box)),
      children: all,
      open: `<g${attrs({
        id: `${prefix}fx-${f.id}`,
        class: faded ? "dg" : undefined,
        "data-fixture": f.type,
        "data-label": f.label,
        "data-area": f.area,
        "data-room": roomOf(model, f.area),
        "data-confirmed": confirmedAttr(f),
      })}>`,
      close: "</g>",
    };
  };
  const out: DrawnFixture[] = [];
  for (const f of list) {
    if (f.mountedOn && ids.has(f.mountedOn)) continue;
    const node = make(f, false);
    if (node) out.push({ fixture: f, node });
  }
  return out;
}

/** The context a fixture's builder needs: its floor's height, the climb to the floor above (stairs), a cut. */
function fixtureContext(model: HouseModel, floor: Floor, cut?: number): FixtureContext {
  const next = nextFloor(model, floor);
  return { z: floor.z, depth: model.depth, cut, rise: next ? next.z - floor.z : undefined };
}

function svgDocument(opts: {
  prefix: string;
  theme: Theme;
  title: string;
  desc: string;
  bounds: Bounds;
  body: string;
  used: Set<string>;
  /** Lay the drawing on its own paper (plans: their frame text then always reads, whatever the page's theme). */
  paper?: boolean;
}): string {
  const scope = `${opts.prefix}hj-${opts.theme}`;
  const { minX, minY, maxX, maxY } = opts.bounds;
  const x = Math.floor(minX - MARGIN);
  const y = Math.floor(minY - MARGIN);
  const w = Math.ceil(maxX + MARGIN) - x;
  const h = Math.ceil(maxY + MARGIN) - y;
  if (opts.paper) opts.used.add("pa0").add("ns");
  const css = paletteCss({ theme: opts.theme, scope, used: opts.used });
  const paper = opts.paper ? `<path class="pa0 ns" d="M${x} ${y}L${x + w} ${y}L${x + w} ${y + h}L${x} ${y + h}Z"/>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg"${attrs({ class: scope, viewBox: `${x} ${y} ${w} ${h}`, width: w, height: h, role: "img", "aria-labelledby": `${opts.prefix}title ${opts.prefix}desc` })}>` +
    `<title id="${escapeXml(opts.prefix)}title">${escapeXml(opts.title)}</title>` +
    `<desc id="${escapeXml(opts.prefix)}desc">${escapeXml(opts.desc)}</desc>` +
    `<style>${css}</style>` +
    paper +
    opts.body +
    `</svg>\n`
  );
}

function addBounds(into: Bounds, b: Bounds, dy = 0): void {
  if (!Number.isFinite(b.minX)) return;
  into.minX = Math.min(into.minX, b.minX);
  into.maxX = Math.max(into.maxX, b.maxX);
  into.minY = Math.min(into.minY, b.minY + dy);
  into.maxY = Math.max(into.maxY, b.maxY + dy);
}

// ---------------------------------------------------------------------------
// Slabs and area floors (isometric)

/** The slab under a floor (with the stairwell left open where the floor has one), and the terrace's sides on the ground floor. */
function slabNodes(model: HouseModel, floor: Floor): Node[] {
  const T = model.wall;
  const W = model.width;
  const D = model.depth;
  const z1 = floor.z;
  const z0 = floor.z - model.slab;
  const cls = { top: fill("stone", 0), front: `${fill("brown", 1)} o`, right: `${fill("brown", 2)} o` };
  const slab = (b: Box3): Node => ({ box: b, paint: boxFaces(b, cls) });
  const out: Node[] = [];
  if (floor.level === 0) {
    out.push(slab(box(-T, W + T, -T, D + T, z0, z1)));
    // The terrace's sides; its tiled top belongs to the terrace area (so it fades with it).
    const t = model.terrace;
    const tb = box(t.x0, t.x1, t.y0, t.y1, z1 - 0.15, z1);
    out.push({ box: tb, paint: boxFaces(tb, { top: "", front: `${fill("terraceTile", 1)} o`, right: `${fill("terraceTile", 2)} o` }) });
    return out;
  }
  const hole = floor.opening;
  if (!hole) return [slab(box(-T, W + T, -T, D + T, z0, z1))];
  out.push(
    slab(box(-T, W + T, hole.y1, D + T, z0, z1)),
    slab(box(-T, hole.x0, hole.y0, hole.y1, z0, z1)),
    slab(box(hole.x1, W + T, hole.y0, hole.y1, z0, z1)),
    slab(box(-T, W + T, -T, hole.y0, z0, z1)),
  );
  return out.filter((n) => n.box.x1 - n.box.x0 > 1e-6 && n.box.y1 - n.box.y0 > 1e-6);
}

/** The visible floor of an area: its rectangles, less the stairwell where its floor has one. */
function areaFloorRects(model: HouseModel, area: Area): Rect[] {
  const hole = floorById(model, area.floor).opening;
  const out: Rect[] = [];
  for (const r of areaRects(area)) {
    if (!hole || r.x1 <= hole.x0 || r.x0 >= hole.x1 || r.y1 <= hole.y0 || r.y0 >= hole.y1) {
      out.push(r);
      continue;
    }
    if (r.y0 < hole.y0) out.push({ ...r, y1: hole.y0 });
    if (r.y1 > hole.y1) out.push({ ...r, y0: hole.y1 });
    const y0 = Math.max(r.y0, hole.y0);
    const y1 = Math.min(r.y1, hole.y1);
    if (r.x1 > hole.x1) out.push({ x0: hole.x1, x1: r.x1, y0, y1 });
    if (r.x0 < hole.x0) out.push({ x0: r.x0, x1: hole.x0, y0, y1 });
  }
  return out;
}

const TILE: Partial<Record<MaterialName, number>> = { cafeFloor: 0.6, dormFloor: 0.4, landingFloor: 0.4, terraceTile: 0.4, bathFloor: 0.5 };

/**
 * The floors of a floor's areas. With `lit` (the highlighted areas, on a floor that has some), the lit ones
 * are outlined and the others drawn as ghosts.
 */
function areaFloorsIso(model: HouseModel, floor: Floor, prefix: string, w: Writer, p: Projection, lit?: ReadonlySet<string>): string {
  let out = "";
  const areas = model.areas.filter((a) => a.floor === floor.id);
  // Rooms first, then the sub-areas drawn on top of them.
  const ordered = [...areas.filter((a) => !a.parent), ...areas.filter((a) => a.parent)];
  for (const area of ordered) {
    const material = kindFloors[area.kind];
    const parentArea = area.parent ? areas.find((a) => a.id === area.parent) : undefined;
    const floorMaterial = parentArea ? kindFloors[parentArea.kind] : material;
    const z = floor.z;
    const ghost = lit !== undefined && !lit.has(area.id);
    let inner = "";
    const rects = areaFloorRects(model, area);
    for (const r of rects) {
      const top = onTop(z, r.x0, r.x1, r.y0, r.y1);
      if (area.parent) {
        // A sub-area: a soft dashed edge on its room's floor, tinted by its own kind.
        inner += w.paint(poly(top, `${fill(material, 0)} ns`), p);
        inner += w.paint(poly(top, "sd"), p);
      } else {
        inner += w.paint(poly(top, `${fill(floorMaterial, 0)} o`), p);
        const step = TILE[floorMaterial] ?? 0;
        if (step > 0) {
          const grid: Vec3[][] = [];
          for (let x = Math.ceil((r.x0 + 1e-6) / step) * step; x < r.x1 - 1e-6; x += step) grid.push([[x, r.y0, z], [x, r.y1, z]]);
          for (let y = Math.ceil((r.y0 + 1e-6) / step) * step; y < r.y1 - 1e-6; y += step) grid.push([[r.x0, y, z], [r.x1, y, z]]);
          inner += w.paint(lines(grid, "tg"), p);
        }
      }
    }
    if (lit?.has(area.id)) {
      // The outline over a paper-coloured under-stroke, so it shows on orange floors too.
      for (const r of rects) inner += w.paint(poly(onTop(z, r.x0, r.x1, r.y0, r.y1), "hu"), p);
      for (const r of rects) inner += w.paint(poly(onTop(z, r.x0, r.x1, r.y0, r.y1), "hl"), p);
    }
    out += `<g${attrs({
      id: `${prefix}area-${area.id}`,
      class: ghost ? "dg" : undefined,
      "data-area": area.id,
      "data-kind": area.kind,
      "data-parent": area.parent,
      "data-confirmed": confirmedAttr(area),
    })}>${inner}</g>`;
  }
  return out;
}

/** The highlighted areas on the drawn floors, with their sub-areas; undefined when nothing is highlighted there. */
function litAreas(model: HouseModel, highlight: readonly string[], drawn: readonly Floor[]): Set<string> | undefined {
  const onDrawn = new Set(drawn.map((f) => f.id));
  const lit = new Set(highlight.filter((id) => onDrawn.has(model.areas.find((a) => a.id === id)!.floor)));
  if (lit.size === 0) return undefined;
  for (const a of model.areas) if (a.parent && lit.has(a.parent)) lit.add(a.id);
  return lit;
}

// ---------------------------------------------------------------------------
// Routes (isometric)

/**
 * How long each route piece is on screen: just under one dash period of the rt role (7 + 7.8), so every
 * piece holds one dash and the dashes run on evenly from piece to piece.
 */
const ROUTE_PIECE = 14.6;

function segmentPoints(points: readonly (readonly number[])[], floor: Floor): Vec3[] {
  return points.map(([x, y, z]) => [x!, y!, floor.z + (z ?? 0) + 0.04] as const);
}

/**
 * A route's segment on a floor as short pieces, each a node in the floor's depth sort, so walls, beds and
 * stalls in front hide it. A piece over a flight of stairs is sorted as lying just above the flight.
 */
function routePieces(model: HouseModel, route: Route, floor: Floor, p: Projection): Node[] {
  const out: Node[] = [];
  const stairs = model.fixtures.filter((f) => f.floor === floor.id && f.type === "stairs");
  for (const segment of route.segments) {
    if (segment.floor !== floor.id) continue;
    const pts = segmentPoints(segment.points, floor);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const sa = p.point(a);
      const sb = p.point(b);
      const len = Math.hypot(sb[0] - sa[0], sb[1] - sa[1]);
      if (len < 1e-6) continue;
      const lerp = (t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      for (let k = 0; k * ROUTE_PIECE < len; k++) {
        const q0 = lerp((k * ROUTE_PIECE) / len);
        const q1 = lerp(Math.min(1, ((k + 1) * ROUTE_PIECE) / len));
        const mx = (q0[0] + q1[0]) / 2;
        const my = (q0[1] + q1[1]) / 2;
        const over = stairs.find((s) => mx >= s.box.x0 && mx <= s.box.x1 && my >= s.box.y0 && my <= s.box.y1);
        const zs = over ? floor.z + over.box.z1 + 0.01 : undefined;
        out.push({
          box: box(Math.min(q0[0], q1[0]), Math.max(q0[0], q1[0]), Math.min(q0[1], q1[1]), Math.max(q0[1], q1[1]), zs ?? Math.min(q0[2], q1[2]), zs ?? Math.max(q0[2], q1[2])),
          paint: [line([q0, q1], "rt")],
        });
      }
    }
  }
  return out;
}

/**
 * Drawn over a floor: the route's whole segment, faint (it carries the route's id, and keeps the
 * stretches behind walls traceable), the arrowhead where the drawn route ends, and the stops.
 */
function routeOverlay(route: Route, floor: Floor, prefix: string, w: Writer, p: Projection, lastDrawn: number): string {
  let out = "";
  route.segments.forEach((segment, index) => {
    if (segment.floor !== floor.id) return;
    const pts = segmentPoints(segment.points, floor).map((q) => p.point(q));
    const cmds: Cmd[] = pts.map(([x, y], i) => [i === 0 ? "M" : "L", x, y] as const);
    out += w.path("rh", cmds, attrs({ id: `${prefix}route-${route.id}-${floor.id}`, "data-route": route.id, "data-floor": floor.id }));
    if (index === lastDrawn && pts.length > 1) {
      const [x1, y1] = pts[pts.length - 1]!;
      const [x0, y0] = pts[pts.length - 2]!;
      const len = Math.hypot(x1 - x0, y1 - y0) || 1;
      const ux = (x1 - x0) / len;
      const uy = (y1 - y0) / len;
      const s = 11;
      out += w.path("ra", [
        ["M", x1 + ux * 4, y1 + uy * 4],
        ["L", x1 - ux * s - uy * s * 0.6, y1 - uy * s + ux * s * 0.6],
        ["L", x1 - ux * s + uy * s * 0.6, y1 - uy * s - ux * s * 0.6],
        ["Z"],
      ]);
    }
  });
  for (const stop of route.stops ?? []) {
    if (stop.floor !== floor.id) continue;
    const [sx, sy] = p.point([stop.at[0], stop.at[1], floor.z + 0.04]);
    out += w.path("rs", circle(sx, sy, 6), attrs({ "data-stop": stop.label }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Labels (isometric)

interface LabelItem {
  readonly floor: Floor;
  /** The anchor on screen, with its floor's lift. */
  readonly ax: number;
  readonly ay: number;
  readonly text: string;
  readonly size: number;
  readonly cls: "lt" | "lx";
  readonly area?: string;
  readonly stop?: string;
  readonly dim: boolean;
  readonly lit: boolean;
}

interface PlacedLabel {
  readonly item: LabelItem;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** From the anchor to the pill's edge. */
  readonly leader: readonly Vec2[];
}

interface Box2 {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const hits = (a: Box2, b: Box2, pad: number) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/** Whether the segment p-q crosses (or lies in) a rectangle (Liang-Barsky). */
function segmentHits(p: Vec2, q: Vec2, r: Box2): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  for (const [pp, qq] of [
    [-dx, p[0] - r.x],
    [dx, r.x + r.w - p[0]],
    [-dy, p[1] - r.y],
    [dy, r.y + r.h - p[1]],
  ] as const) {
    if (Math.abs(pp) < 1e-12) {
      if (qq < 0) return false;
    } else {
      const t = qq / pp;
      if (pp < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
}

/**
 * Pills with leader lines to their anchors. Each label weighs places in turn (above its anchor, above and
 * to either side, higher, below, beside it with an elbow) and takes the first where its pill and leader
 * clear every placed pill and leader and every other label's anchor dot; if none is clear, the one with
 * the fewest and slightest clashes.
 */
function placeLabels(items: readonly LabelItem[], lift: number): PlacedLabel[] {
  const dot = (it: LabelItem): Box2 => ({ x: it.ax - 5, y: it.ay - 5, w: 10, h: 10 });
  const placed: PlacedLabel[] = [];
  const sorted = [...items].sort((a, b) => b.ay - a.ay || a.ax - b.ax);
  for (const item of sorted) {
    const w = textWidth(item.text, item.size) + item.size * 1.16;
    const h = item.size * 1.68;
    const { ax, ay } = item;
    const cost = (r: Box2, leader: readonly Vec2[]) => {
      let c = 0;
      const padded = { x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6 };
      for (const o of placed) {
        if (hits(r, o, 5)) c += 10;
        for (let i = 1; i < o.leader.length; i++) if (segmentHits(o.leader[i - 1]!, o.leader[i]!, padded)) c += 4;
        for (let i = 1; i < leader.length; i++) if (segmentHits(leader[i - 1]!, leader[i]!, o)) c += 4;
      }
      for (const other of items) {
        const d = dot(other);
        if (hits(r, d, 0)) c += 6;
        if (other !== item) for (let i = 1; i < leader.length; i++) if (segmentHits(leader[i - 1]!, leader[i]!, d)) c += 3;
      }
      return c;
    };
    const candidates: { r: Box2; leader: Vec2[] }[] = [];
    for (const k of [1, 1.9, 2.8])
      for (const dx of [0, -(w / 2 - 16), w / 2 - 16]) {
        const r = { x: ax - w / 2 + dx, y: ay - lift * k - h, w, h };
        candidates.push({ r, leader: [[ax, ay], [ax, r.y + h]] });
      }
    {
      const r = { x: ax - w / 2, y: ay + lift * 0.8, w, h };
      candidates.push({ r, leader: [[ax, ay], [ax, r.y]] });
    }
    for (const k of [0.9, 1.9, 2.9])
      for (const side of [1, -1]) {
        const r = { x: side > 0 ? ax + 18 : ax - 18 - w, y: ay - lift * k - h / 2, w, h };
        const yMid = r.y + h / 2;
        candidates.push({ r, leader: [[ax, ay], [ax, yMid], [side > 0 ? r.x : r.x + w, yMid]] });
      }
    for (const k of [3.7, 4.6]) {
      const r = { x: ax - w / 2, y: ay - lift * k - h, w, h };
      candidates.push({ r, leader: [[ax, ay], [ax, r.y + h]] });
    }
    let best = candidates[0]!;
    let bestCost = Infinity;
    for (const cand of candidates) {
      const c = cost(cand.r, cand.leader);
      if (c < bestCost) {
        best = cand;
        bestCost = c;
        if (c === 0) break;
      }
    }
    placed.push({ item, ...best.r, leader: best.leader });
  }
  return placed;
}

/** The labels of one floor, in that floor's own coordinates (its lift dy taken off), each its own group. */
function labelMarkup(labels: readonly PlacedLabel[], dy: number, w: Writer, baseSize: number): string {
  let out = "";
  for (const l of labels) {
    const it = l.item;
    const natural = it.cls === "lt" ? 19 : 15;
    out += `<g${attrs({
      class: it.dim ? "dim" : undefined,
      "data-label-area": it.area,
      "data-label-stop": it.stop,
      "data-text": it.text,
      "data-ax": num(it.ax),
      "data-ay": num(it.ay - dy),
    })}>`;
    out += w.path(
      "ld",
      l.leader.map(([x, y], i) => [i === 0 ? "M" : "L", x, y - dy] as const),
    );
    out += w.path("lp", circle(it.ax, it.ay - dy, 3.5 * (baseSize / 19)));
    out += w.path(it.lit ? "lb lbh" : "lb", roundRect(l.x, l.y - dy, l.w, l.h, l.h / 2));
    out += w.text(it.cls, l.x + l.w / 2, l.y - dy + l.h / 2 + it.size * 0.36, it.text, it.size, "middle", it.size !== natural);
    out += "</g>";
  }
  return out;
}

/** The convex hull of points (monotone chain), counter-clockwise. */
function hull(points: readonly Vec2[]): Vec2[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Vec2[] = [];
  for (const pt of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, pt) <= 0) lower.pop();
    lower.push(pt);
  }
  const upper: Vec2[] = [];
  for (const pt of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, pt) <= 0) upper.pop();
    upper.push(pt);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Whether a point lies inside a convex polygon, or within `margin` pixels of it. */
function nearConvex(pt: Vec2, poly2: readonly Vec2[], margin: number): boolean {
  let inside = true;
  let best = Infinity;
  for (let i = 0; i < poly2.length; i++) {
    const a = poly2[i]!;
    const b = poly2[(i + 1) % poly2.length]!;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    if (ex * (pt[1] - a[1]) - ey * (pt[0] - a[0]) < 0) inside = false;
    const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * ex + (pt[1] - a[1]) * ey) / (ex * ex + ey * ey || 1)));
    best = Math.min(best, Math.hypot(pt[0] - (a[0] + ex * t), pt[1] - (a[1] + ey * t)));
  }
  return inside || best <= margin;
}

/**
 * A floor's silhouette on screen at its lift: every line of sight through it meets its slab or its kept
 * outer walls (the left and back walls) before anything on the floors below.
 */
function floorSilhouette(model: HouseModel, floor: Floor, p: Projection, dy: number): Vec2[] {
  const T = model.wall;
  const corners: Vec2[] = [];
  for (const x of [-T, model.width + T])
    for (const y of [-T, model.depth + T])
      for (const z of [floor.z - model.slab, floor.ceiling]) {
        const [sx, sy] = p.point([x, y, z]);
        corners.push([sx, sy + dy]);
      }
  return hull(corners);
}

// ---------------------------------------------------------------------------
// Street view

/**
 * A neighbour, in low detail and cropped: its front and a slice behind it, as deep as the house is drawn,
 * the cut drawn dashed. Both sit a joint (10 cm) off the party walls.
 */
function neighbour(side: "left" | "right", model: HouseModel, prefix: string, depth: number): Node {
  const T = model.wall;
  const W = model.width;
  const left = side === "left";
  const b = left ? box(-2.6, -T - 0.1, -T, depth, -0.2, 11.2) : box(W + T + 0.1, W + 2.7, -T, depth, -0.2, 9.3);
  const m: MaterialName = left ? "neighbourGrey" : "neighbourBlue";
  // Faces without outlines, then the real edges solid and the cut edges dashed.
  const paint: Paint[] = [...boxFaces(b, { top: `${fill(m, 0)} ns`, front: `${fill(m, 1)} ns`, right: `${fill(m, 2)} ns` })];
  if (left) {
    const slats: Vec3[][] = [];
    for (let x = b.x0 + 0.12; x < b.x1 - 0.05; x += 0.16) slats.push([[x, b.y0, 6.4], [x, b.y0, 10.9]]);
    paint.push(
      lines(slats, "tg"),
      poly(onFront(b.y0, b.x0, b.x1, 5.2, 6.2), `${fill("dark", 1)} h`),
      line([[b.x0 + 0.3, b.y0, 5.7], [b.x1 - 0.4, b.y0, 5.7]], "kla b"),
      poly(onFront(b.y0, b.x1 - 1.4, b.x1 - 0.3, 0, 2.3), `${fill("dark", 1)} h`),
    );
  } else {
    const panes: Vec3[][] = [];
    for (let x = b.x0 + 0.9; x < b.x1; x += 0.45) panes.push([[x, b.y0, 3.9], [x, b.y0, 5.0]]);
    paint.push(
      poly(onFront(b.y0, b.x0 + 0.5, b.x1, 5.4, 9.0), `${fill("neighbourPanel", 1)} h`),
      poly(onFront(b.y0, b.x0 + 0.5, b.x1, 3.9, 5.0), `${fill("slate", 1)} h`),
      lines(panes, "tg"),
      poly(onFront(b.y0, b.x0 + 0.8, b.x1 - 0.2, 3.1, 3.6), `${fill("dark", 1)} h`),
      poly(onFront(b.y0, b.x0 + 0.5, b.x1, 0, 2.6), `${fill("slate", 1)} h`),
    );
  }
  paint.push(
    line([[b.x0, b.y0, b.z0], [b.x1, b.y0, b.z0], [b.x1, b.y0, b.z1], [b.x0, b.y0, b.z1], [b.x0, b.y0, b.z0]], "n o"),
    line([[b.x1, b.y0, b.z0], [b.x1, b.y1, b.z0], [b.x1, b.y1, b.z1], [b.x1, b.y0, b.z1]], "n h"),
    line([[b.x0, b.y0, b.z1], [b.x0, b.y1, b.z1], [b.x1, b.y1, b.z1]], "n h"),
    lines(
      [
        [[b.x1, b.y1, b.z0], [b.x1, b.y1, b.z1]],
        [[b.x0, b.y1, b.z1], [b.x1, b.y1, b.z1]],
      ],
      "dl o",
    ),
  );
  return {
    box: b,
    open: `<g${attrs({ id: `${prefix}neighbour-${side}`, "data-neighbour": left ? "NinetyNine 99 Bar" : "Swedish Baking" })}>`,
    close: "</g>",
    paint,
  };
}

/** The facade's relief: the side pilasters, and on the top floor the big arch (it echoes the logo) around the two small windows. */
function facadeRelief(model: HouseModel, floor: Floor): Node[] {
  const T = model.wall;
  const W = model.width;
  const y = -T - 0.002;
  const out: Node[] = [];
  const top = floor.ceiling;
  const pilasters: Vec3[][] = [
    [[0.22, y, floor.z], [0.22, y, top]],
    [[W - 0.22, y, floor.z], [W - 0.22, y, top]],
  ];
  out.push({ box: box(0.22, W - 0.22, y, y, floor.z, top), paint: [lines(pilasters, "tg")] });
  if (nextFloor(model, floor)) return out;
  // The arch: a recessed panel from the ledge band up, with a half-ellipse top.
  const x0 = 0.42;
  const x1 = W - 0.42;
  const z0 = floor.z + 0.35;
  const spring = floor.z + 1.75;
  const crown = top - 0.5;
  const archPts = (inset: number): Vec3[] => {
    const pts: Vec3[] = [[x0 + inset, y, z0]];
    const half = (x1 - x0) / 2 - inset;
    const xc = (x0 + x1) / 2;
    const rise = crown - spring - inset;
    for (let i = 0; i <= 16; i++) {
      const t = Math.PI - (Math.PI * i) / 16;
      pts.push([xc + half * Math.cos(t), y, spring + rise * Math.sin(t)]);
    }
    pts.push([x1 - inset, y, z0]);
    return pts;
  };
  const holes = model.fixtures.filter((f) => f.floor === floor.id && f.type === "window").map((f) => onFront(y, f.box.x0, f.box.x1, f.box.z0 + floor.z, f.box.z1 + floor.z));
  const recess = (p: Projection): Cmd[] => {
    const ring = (pts: readonly Vec3[]): Cmd[] => [...pts.map((pt, i) => [i === 0 ? "M" : "L", ...p.point(pt)] as Cmd), ["Z"]];
    return [...ring(archPts(0.12)), ...holes.flatMap((h) => ring(h))];
  };
  out.push({
    box: box(x0, x1, y, y, z0, crown),
    paint: [poly(archPts(0), "n h"), screen(`${fill("facadeDeep", 1)} eo h`, recess)],
  });
  return out;
}

/** The ledge band under the arch, the roof slab (cropped at cutY) and the low tiled roof edge at the front. */
function roofNodes(model: HouseModel, floor: Floor, prefix: string, reach: number, cutY?: number): Node[] {
  const T = model.wall;
  const W = model.width;
  const { z0: rz0, z1: rz1 } = model.roof;
  const out: Node[] = [];
  const ledge = box(-T, W + T, -T - 0.14, -T, floor.z + 0.15, floor.z + 0.35);
  out.push({ box: ledge, paint: boxFaces(ledge, { top: `${fill("facade", 0)} o`, front: `${fill("facade", 1)} o`, right: `${fill("facade", 2)} o` }) });
  const roof = box(-T, W + T, -T, reach, rz0, rz1);
  out.push({
    box: roof,
    paint: croppedBox(roof, { top: fill("stone", 0), front: fill("facade", 1), right: fill("stone", 2) }, cutY),
    open: `<g${attrs({ id: `${prefix}roof` })}>`,
    close: "</g>",
  });
  const front = -T - 0.32;
  const back = 0.4;
  const xl = -T - 0.08;
  const xr = W + T + 0.08;
  const eave: Vec3[] = [
    [xl, front, rz1 + 0.02],
    [xr, front, rz1 + 0.02],
    [xr, back, rz1 + 0.3],
    [xl, back, rz1 + 0.3],
  ];
  const tiles: Vec3[][] = [];
  for (let x = -T + 0.1; x < W + T; x += 0.2) tiles.push([[x, front, rz1 + 0.02], [x, back, rz1 + 0.3]]);
  const lip = box(xl, xr, front - 0.05, front, rz1 - 0.06, rz1 + 0.02);
  out.push({
    box: box(xl, xr, front - 0.05, back, rz1 - 0.06, rz1 + 0.3),
    keep: true,
    children: [
      { box: lip, paint: boxFaces(lip, { top: "", front: `${fill("roofTile", 1)} o`, right: `${fill("roofTile", 2)} o` }) },
      {
        box: box(xl, xr, front, back, rz1 + 0.02, rz1 + 0.3),
        paint: [
          // The eave's end at the left, closing the gap between the lip and the sloping tiles.
          poly(
            [
              [xl, front - 0.05, rz1 - 0.06],
              [xl, front - 0.05, rz1 + 0.02],
              [xl, back, rz1 + 0.3],
              [xl, back, rz1 + 0.22],
            ],
            `${fill("roofTile", 1)} o`,
          ),
          poly(eave, `${fill("roofTile", 0)} o`),
          lines(tiles, "tg"),
        ],
      },
    ],
  });
  return out;
}

export function renderStreet(opts: StreetOptions = {}): string {
  const model = opts.model ?? houseOfJars;
  const theme = opts.theme ?? "auto";
  const prefix = checkPrefix(opts.idPrefix ?? "");
  const p = isoProjection(model.depth);
  const w = new Writer();
  const total = emptyBounds();
  const T = model.wall;
  const W = model.width;
  const D = model.depth;
  const depth = opts.depth ?? STREET_DEPTH;
  if (!Number.isFinite(depth) || depth <= 0) throw new Error(`renderStreet: depth must be a positive number of metres (got ${depth})`);
  const cropped = depth < D - 1e-6;
  // How far back the side wall, the roof and the plinth reach, and where they are cut.
  const reach = cropped ? depth : D + T;
  const cutY = cropped ? depth : undefined;
  let body = "";

  const node = (n: Node) => w.node(n, p, model.depth);
  if (opts.neighbours) {
    w.resetBounds();
    body += node(neighbour("left", model, prefix, reach));
    addBounds(total, w.bounds);
  }

  for (const floor of model.floors) {
    w.resetBounds();
    const next = nextFloor(model, floor);
    const height = (next ? next.z : floor.ceiling) - floor.z;
    const nodes: Node[] = [];
    if (floor.level === 0) {
      // The tiled terrace (and, in a street of neighbours, the pavement in front of all three houses).
      if (opts.neighbours) {
        const pave = box(-2.6, W + 2.7, model.terrace.y0 - 1.0, -T, -0.3, -0.2);
        nodes.push({ box: pave, paint: boxFaces(pave, { top: `${fill("pavement", 0)} h`, front: `${fill("pavement", 1)} h`, right: `${fill("pavement", 2)} h` }) });
      }
      const t = model.terrace;
      const tb = box(t.x0, t.x1, t.y0, t.y1, -0.15, 0);
      const grid: Vec3[][] = [];
      for (let x = t.x0 + 0.4; x < t.x1 - 0.05; x += 0.4) grid.push([[x, t.y0, 0], [x, t.y1, 0]]);
      for (let y = t.y0 + 0.4; y < t.y1 - 0.05; y += 0.4) grid.push([[t.x0, y, 0], [t.x1, y, 0]]);
      nodes.push({
        box: tb,
        paint: [...boxFaces(tb, { top: `${fill("terraceTile", 0)} o`, front: `${fill("terraceTile", 1)} o`, right: `${fill("terraceTile", 2)} o` }), lines(grid, "tg")],
      });
      const plinth = box(-T, W + T, -T, reach, -0.2, 0);
      nodes.push({ box: plinth, paint: croppedBox(plinth, { top: "", front: "", right: fill("stone", 2) }, cutY) });
    }
    for (const wall of model.walls) {
      if (wall.floor !== floor.id) continue;
      if (wall.kind === "facade") {
        nodes.push(...wallNodes({ ...wall, box: { ...wall.box, z1: height } }, height, floor.z, { view: "street", width: W }));
      } else if (wall.kind === "party" && wall.box.x0 >= W - 1e-6) {
        // The right party wall, as far back as the view reaches.
        const b = box(wall.box.x0, wall.box.x1, wall.box.y0, Math.min(wall.box.y1, reach), floor.z, floor.z + height);
        nodes.push({ box: b, paint: croppedBox(b, { top: fill("stone", 0), front: "", right: fill("stone", 2) }, cutY), open: `<g${attrs({ "data-wall": wall.id })}>`, close: "</g>" });
      } else if (wall.kind === "back" && !cropped) {
        nodes.push(...wallNodes({ ...wall, box: { ...wall.box, z1: height } }, height, floor.z, { view: "street", width: W }, { front: "stone", right: "stone", top: "stone" }));
      }
    }
    nodes.push(...facadeRelief(model, floor));
    if (!next) nodes.push(...roofNodes(model, floor, prefix, reach, cutY));
    const fixtures = fixtureNodes(
      model,
      floor,
      prefix,
      (f) => f.mount === "facade" || areaKind(model, f.area) === "outside",
      () => fixtureContext(model, floor),
    );
    nodes.push(...fixtures.map((f) => f.node));
    const content = w.node({ box: box(0, 0, 0, 0, 0, 0), children: nodes }, p, model.depth);
    body += `<g${attrs({ id: `${prefix}floor-${floor.id}`, "data-floor": floor.id, "data-level": floor.level })}>${content}</g>`;
    addBounds(total, w.bounds);
  }

  if (opts.neighbours) {
    w.resetBounds();
    body += node(neighbour("right", model, prefix, reach));
    addBounds(total, w.bounds);
  }

  return svgDocument({
    prefix,
    theme,
    title: opts.title ?? `${model.name} from the street`,
    desc: `The ${model.name} shophouse seen from the street at the front right: the orange-red facade with its big arch, the glass door and grid window under the wooden awning with its "hostel" sign, and the tiled terrace${opts.neighbours ? ", between NinetyNine 99 Bar and Swedish Baking" : ""}${cropped ? `; the side wall and roof are cropped ${num(depth)} m back` : ""}.`,
    bounds: total,
    body,
    used: w.used,
  });
}

// ---------------------------------------------------------------------------
// Cutaway

export function renderCutaway(opts: CutawayOptions = {}): string {
  const model = opts.model ?? houseOfJars;
  const theme = opts.theme ?? "auto";
  const prefix = checkPrefix(opts.idPrefix ?? "");
  const explode = opts.explode ?? 0;
  const fit = opts.fitExplode ?? explode;
  for (const [name, v] of [
    ["explode", explode],
    ["fitExplode", fit],
  ] as const)
    if (!Number.isFinite(v) || v < 0) throw new Error(`renderCutaway: ${name} must be a number of metres, 0 or more (got ${v})`);
  const labelSize = opts.labelSize ?? 19;
  if (!Number.isFinite(labelSize) || labelSize <= 0) throw new Error(`renderCutaway: labelSize must be a positive number (got ${labelSize})`);
  const wanted = opts.floors ?? model.floors.map((f) => f.id);
  for (const id of wanted) floorById(model, id);
  const drawn = model.floors.filter((f) => wanted.includes(f.id)).sort((a, b) => a.level - b.level);
  if (drawn.length === 0) throw new Error("renderCutaway: no floors to draw");
  const route = opts.route === undefined ? undefined : model.routes.find((r) => r.id === opts.route);
  if (opts.route !== undefined && !route) throw new Error(`renderCutaway: no route "${opts.route}" in the model`);
  for (const id of opts.highlight ?? []) if (!model.areas.some((a) => a.id === id)) throw new Error(`renderCutaway: no area "${id}" to highlight`);

  const p = isoProjection(model.depth);
  const w = new Writer();
  const total = emptyBounds();
  const W = model.width;
  const D = model.depth;
  const lit = litAreas(model, opts.highlight ?? [], drawn);
  if (lit) w.classes("dim dg");
  const drawnIds = new Set(drawn.map((f) => f.id));
  const lastDrawn = route ? route.segments.reduce((last, s, i) => (drawnIds.has(s.floor) ? i : last), -1) : -1;
  const offset = (floor: Floor) => -explode * S * floor.level;
  const fitOffset = (floor: Floor) => -fit * S * floor.level;
  const stopSize = Math.round((labelSize * 15) / 19);
  let body = "";
  const items: LabelItem[] = [];

  for (const floor of drawn) {
    w.resetBounds();
    const dy = offset(floor);
    const cut = floor.z + FACADE_CUT;
    // A floor with nothing highlighted fades as one group (nothing shows through it); on a floor with
    // something highlighted, the other areas and their fixtures are drawn as opaque ghosts.
    const floorDim = Boolean(lit && !model.areas.some((a) => a.floor === floor.id && lit.has(a.id)));
    const floorLit = lit && !floorDim ? lit : undefined;
    let content = "";
    for (const slab of slabNodes(model, floor)) content += w.node(slab, p, D);
    content += areaFloorsIso(model, floor, prefix, w, p, floorLit);

    const nodes: Node[] = [];
    for (const wall of model.walls) {
      if (wall.floor !== floor.id) continue;
      if (wall.kind === "party" && wall.box.x0 >= W - 1e-6) continue; // the right wall is taken away
      const top = wall.kind === "facade" ? FACADE_CUT : wall.kind === "partition" ? Math.min(PARTITION_CUT, wall.box.z1) : wall.box.z1;
      const faces = wall.kind === "party" ? { front: "facade" as MaterialName } : {};
      nodes.push(...wallNodes(wall, top, floor.z, { view: "cutaway", width: W }, faces));
    }
    const fixtures = fixtureNodes(
      model,
      floor,
      prefix,
      (f) => f.mount !== "right-wall",
      (f) => {
        // What stands outside or hangs on the facade is cut with it; the stairs between upper floors are cut like the partitions.
        const outside = f.mount === "facade" || areaKind(model, f.area) === "outside";
        const flight = f.type === "stairs" && floor.level > 0;
        return fixtureContext(model, floor, outside ? cut : flight ? floor.z + PARTITION_CUT : undefined);
      },
      floorLit ? (f) => !floorLit.has(f.area) : undefined,
    );
    nodes.push(...fixtures.map((f) => f.node));
    if (route) nodes.push(...routePieces(model, route, floor, p));
    content += w.node({ box: box(0, 0, 0, 0, 0, 0), children: nodes }, p, D);
    if (route) content += routeOverlay(route, floor, prefix, w, p, lastDrawn);
    const transform = dy !== 0 ? `translate(0,${num(dy)})` : undefined;
    body += `<g${attrs({ id: `${prefix}floor-${floor.id}`, "data-floor": floor.id, "data-level": floor.level, "data-confirmed": confirmedAttr(floor), class: floorDim ? "dim" : undefined, transform })}>${content}</g>`;
    addBounds(total, w.bounds, dy);
    addBounds(total, w.bounds, fitOffset(floor));

    const fadedLabel = (areaId: string) => Boolean(lit && (floorDim || !lit.has(areaId)));
    if (opts.labels)
      for (const a of model.areas.filter((x) => x.floor === floor.id)) {
        const [sx, sy] = p.point([a.anchor?.x ?? (a.rect.x0 + a.rect.x1) / 2, a.anchor?.y ?? (a.rect.y0 + a.rect.y1) / 2, floor.z + (a.anchor?.z ?? 0)]);
        items.push({ floor, ax: sx, ay: sy + dy, text: a.name, size: labelSize, cls: "lt", area: a.id, dim: fadedLabel(a.id), lit: Boolean(lit?.has(a.id)) });
      }
    for (const stop of route?.stops ?? []) {
      if (stop.floor !== floor.id) continue;
      const [sx, sy] = p.point([stop.at[0], stop.at[1], floor.z + 0.04]);
      items.push({ floor, ax: sx, ay: sy + dy, text: stop.label, size: stopSize, cls: "lx", stop: stop.label, dim: false, lit: false });
    }
  }

  // Where the route leaves one floor and arrives on the next, when they are lifted apart.
  if (route && explode > 0) {
    for (let i = 0; i + 1 < route.segments.length; i++) {
      const a = route.segments[i]!;
      const b = route.segments[i + 1]!;
      if (a.floor === b.floor || !drawnIds.has(a.floor) || !drawnIds.has(b.floor)) continue;
      const fa = floorById(model, a.floor);
      const fb = floorById(model, b.floor);
      const pa = p.point(segmentPoints(a.points, fa)[a.points.length - 1]!);
      const pb = p.point(segmentPoints(b.points, fb)[0]!);
      w.resetBounds();
      const link = w.path("rl", [
        ["M", pa[0], pa[1] + offset(fa)],
        ["L", pb[0], pb[1] + offset(fb)],
      ]);
      body += `<g${attrs({ id: `${prefix}route-${route.id}-link-${a.floor}-${b.floor}`, "data-route-link": route.id })}>${link}</g>`;
      addBounds(total, w.bounds);
    }
  }

  // Labels: drop those whose anchor a drawn floor above hides, place the rest together (so no two pills
  // meet, on one floor or across floors), and write them per floor, moved with their floor.
  const visible = items.filter((it) => !drawn.some((g) => g.level > it.floor.level && nearConvex([it.ax, it.ay], floorSilhouette(model, g, p, offset(g)), 10)));
  const placed = placeLabels(visible, (labelSize * 34) / 19);
  for (const floor of drawn) {
    const mine = placed.filter((l) => l.item.floor.id === floor.id);
    if (!opts.labels && mine.length === 0) continue;
    w.resetBounds();
    const dy = offset(floor);
    if (mine.some((l) => l.item.dim)) w.classes("dim");
    const inner = labelMarkup(mine, dy, w, labelSize);
    const transform = dy !== 0 ? `translate(0,${num(dy)})` : undefined;
    body += `<g${attrs({ id: `${prefix}labels-${floor.id}`, "data-labels": "", "data-floor": floor.id, transform })}>${inner}</g>`;
    addBounds(total, w.bounds, dy);
    addBounds(total, w.bounds, fitOffset(floor));
  }

  const names = drawn.map((f) => f.name);
  const which = names.length === model.floors.length ? "every floor" : names.join(" and ");
  const routeShown = route && route.segments.some((s) => drawnIds.has(s.floor));
  return svgDocument({
    prefix,
    theme,
    title: opts.title ?? `${model.name}: ${explode > 0 ? "exploded" : "cutaway"} view`,
    desc: `A dollhouse cutaway of ${model.name} from the front right, with the right wall, roof and ceilings taken away to show ${which}${explode > 0 ? ", the floors lifted apart" : ""}${routeShown ? `, and the route "${route.name}"` : ""}.`,
    bounds: total,
    body,
    used: w.used,
  });
}

// ---------------------------------------------------------------------------
// Plans

const PLAN_SCALE = 50;

/**
 * The walls at plan height (1.2 m): solid where no opening reaches that high. A facade is broken at every
 * window, even one above or below the cut (Floor 2's small windows), so its glass shows.
 */
function planWallMarks(model: HouseModel, floor: Floor, p: Projection, only?: (wall: Wall) => boolean): PlanMark[] {
  const out: PlanMark[] = [];
  for (const wall of model.walls) {
    if (wall.floor !== floor.id || (only && !only(wall))) continue;
    const cutHeight = wall.kind === "parapet" ? wall.box.z1 : 1.2;
    const openings = (wall.openings ?? [])
      .filter((o) => wall.kind === "facade" || ((o.z0 ?? 0) <= cutHeight && o.z1 >= cutHeight))
      .map((o) => (wall.kind === "facade" ? { from: o.from, to: o.to, z0: 0, z1: wall.box.z1 } : o));
    for (const piece of wallPieces({ ...wall, openings }, wall.box.z1)) {
      if (piece.z0 > cutHeight || piece.z1 < Math.min(cutHeight, wall.box.z1)) continue;
      const a = p.point([piece.x0, piece.y0, 0]);
      const b = p.point([piece.x1, piece.y1, 0]);
      out.push({
        kind: "path",
        cls: wall.kind === "parapet" ? "wp" : "wf",
        cmds: roundRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])),
      });
    }
  }
  return out;
}

function writeMarks(marks: readonly PlanMark[], w: Writer): string {
  let out = "";
  for (const m of marks) {
    if (m.kind === "path") out += w.path(m.cls, m.cmds);
    else out += w.text(m.cls, m.x, m.y, m.text, m.size);
  }
  return out;
}

const overlapsRect = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** A plan's description, from the model: the floor's areas, the beds and lockers of each dorm, the shoe cubbies. */
function planDesc(model: HouseModel, floor: Floor, areas: readonly Area[]): string {
  const parts = areas
    .filter((a) => !a.parent)
    .map((a) => {
      const count = (type: string) => model.fixtures.filter((f) => f.area === a.id && f.type === type).length;
      const extras: string[] = [];
      if (count("pod") > 0) extras.push(`${count("pod")} pods`, `${count("locker")} lockers`);
      if (count("shoe-cubbies") > 0) extras.push("the shoe cubbies");
      const subs = areas.filter((s) => s.parent === a.id).map((s) => s.name.toLowerCase());
      if (subs.length > 0) extras.push(`with ${subs.join(", ")}`);
      return extras.length > 0 ? `${a.name} (${extras.join(", ")})` : a.name;
    });
  const note = floor.confirmed === false && floor.note ? ` ${floor.note}` : "";
  return `A plan of ${floor.name} of ${model.name}, street at the bottom: ${parts.join(", ")}.${note}`;
}

export function renderPlan(which: FloorId | "outside", opts: PlanOptions = {}): string {
  const model = opts.model ?? houseOfJars;
  const theme = opts.theme ?? "auto";
  const prefix = checkPrefix(opts.idPrefix ?? "");
  const labels = opts.labels ?? true;
  const outside = which === "outside";
  const floor = floorById(model, outside ? "ground" : which);
  const scale = outside ? 84 : PLAN_SCALE;
  const p = planProjection(model.depth, scale);
  const w = new Writer();
  const W = model.width;
  const T = model.wall;
  const D = model.depth;

  const inView = (r: Rect) => !outside || r.y0 < 0.01;
  const areas = model.areas.filter((a) => a.floor === floor.id && inView(a.rect) && (!outside || a.kind === "outside"));
  const ordered = [...areas.filter((a) => !a.parent), ...areas.filter((a) => a.parent)];
  let content = "";

  // The interior strip shown behind the facade in the terrace plan.
  const strip: Rect = { x0: 0, x1: W, y0: 0, y1: 1.2 };
  if (outside) {
    content += w.path(fill("cafeFloor", 0) + " ns", roundRect(...rectXYWH(p, strip)));
    const at = p.point([W / 2, strip.y1 - 0.45, 0]);
    content += w.text("lc", at[0], at[1], "Café", 12);
  }
  for (const area of ordered) {
    let inner = "";
    for (const r of areaRects(area)) {
      inner += w.path(`${tint(area.kind)} ns`, roundRect(...rectXYWH(p, r)));
      if (area.parent) inner += w.path("sd", roundRect(...rectXYWH(p, r)));
    }
    content += `<g${attrs({ id: `${prefix}area-${area.id}`, "data-area": area.id, "data-kind": area.kind, "data-parent": area.parent, "data-confirmed": confirmedAttr(area) })}>${inner}</g>`;
  }
  if (outside) {
    const t = model.terrace;
    const grid: Cmd[] = [];
    for (let x = t.x0 + 0.4; x < t.x1 - 0.05; x += 0.4) grid.push(["M", ...p.point([x, t.y0, 0])], ["L", ...p.point([x, t.y1, 0])]);
    for (let y = t.y0 + 0.4; y < t.y1 - 0.05; y += 0.4) grid.push(["M", ...p.point([t.x0, y, 0])], ["L", ...p.point([t.x1, y, 0])]);
    content += w.path("tg", grid);
  }

  // Fixtures: things on the floor first, then what hangs above (dashed). The terrace plan shows what is on
  // the terrace and set in the ground floor's facade, not the AC units high on the floors above.
  const fixtures = model.fixtures.filter((f) => {
    if (f.floor !== floor.id) return false;
    if (outside) return areaKind(model, f.area) === "outside" || f.mount === "facade";
    return areaKind(model, f.area) !== "outside" || floor.level === 0;
  });
  const high = (f: Fixture) => f.box.z0 > 1.6 || f.type === "awning" || f.mount === "right-wall" || f.mount === "facade-inside";
  const sortedFx = [...fixtures.filter((f) => !high(f)), ...fixtures.filter(high)];
  // Stairs: the arrow starts where you stand and points the way you walk. Only the flight that starts on
  // this floor says Up, and only the flight that arrives from the floor below says Down; landings and the
  // flights between are treads alone. A flight from below shows where none of this floor's stairs covers it.
  const below = model.floors.find((f) => f.level === floor.level - 1);
  const arriving = outside || !below ? [] : model.fixtures.filter((f) => f.floor === below.id && f.type === "stairs");
  const own = fixtures.filter((f) => f.type === "stairs");
  const startsHere = (f: Fixture) => !f.variant?.includes("landing") && (f.climb?.from ?? 0) <= 0.05;
  const reachesHere = (f: Fixture) => !f.variant?.includes("landing") && (!f.climb || below === undefined || f.climb.to >= floor.z - below.z - 0.05);
  const downOf = (f: Fixture): StairArrow[] => (reachesHere(f) ? [{ toward: reverse(climbOf(f)), label: "Down" }] : []);
  for (const f of arriving) {
    if (own.some((g) => overlapsRect(g.box, f.box))) continue;
    content += `<g${attrs({ "data-stairs": "down", "data-area": f.area })}>${writeMarks(planStairs(f.box, p, downOf(f), f.variant?.includes("landing") ? null : climbOf(f)), w)}</g>`;
  }
  for (const f of sortedFx) {
    const under = f.type === "stairs" ? arriving.find((g) => reachesHere(g) && overlapsRect(g.box, f.box)) : undefined;
    const up: StairArrow[] = startsHere(f) ? [{ toward: climbOf(f), label: "Up" }] : [];
    const marks = planMarks(f, p, f.type === "stairs" ? { stairs: [...(under ? downOf(under) : []), ...up] } : {});
    if (marks.length === 0) continue;
    content += `<g${attrs({ id: `${prefix}fx-${f.id}`, "data-fixture": f.type, "data-label": f.label, "data-area": f.area, "data-room": roomOf(model, f.area), "data-confirmed": confirmedAttr(f) })}>${writeMarks(marks, w)}</g>`;
  }

  content += `<g data-walls="">${writeMarks(
    planWallMarks(model, floor, p, outside ? (wall) => wall.kind === "facade" : undefined),
    w,
  )}</g>`;

  // Labels: at the area's plan anchor (or its label anchor, or its middle); one placed outside its area
  // gets a short leader back to it.
  let labelMarks = "";
  if (labels) {
    for (const area of areas) {
      const at = area.planAnchor ?? area.anchor ?? { x: (area.rect.x0 + area.rect.x1) / 2, y: (area.rect.y0 + area.rect.y1) / 2 };
      const [sx, sy] = p.point([at.x, at.y, 0]);
      const size = 15;
      const tw = textWidth(area.name, size) + 16;
      const inside = areaRects(area).some((r) => at.x >= r.x0 && at.x <= r.x1 && at.y >= r.y0 && at.y <= r.y1);
      if (!inside) {
        const r = area.rect;
        const [ex, ey] = p.point([Math.min(Math.max(at.x, r.x0 + 0.1), r.x1 - 0.1), Math.min(Math.max(at.y, r.y0 + 0.1), r.y1 - 0.1), 0]);
        labelMarks += w.path("ld", [
          ["M", sx, sy],
          ["L", ex, ey],
        ]);
        labelMarks += w.path("lp", circle(ex, ey, 3));
      }
      labelMarks += w.path("lb", roundRect(sx - tw / 2, sy - 12, tw, 24, 12));
      labelMarks += w.text("lx", sx, sy + 5.4, area.name, size);
    }
    if (outside) {
      const door = model.fixtures.find((f) => f.floor === floor.id && f.type === "door" && f.mount === "facade");
      if (door) {
        const at = p.point([(door.box.x0 + door.box.x1) / 2, 0.35, 0]);
        labelMarks += w.text("lc", at[0], at[1] + 4, "Door", 12);
      }
      const awning = model.fixtures.find((f) => f.floor === floor.id && f.type === "awning");
      if (awning) {
        const at = p.point([awning.box.x1 - 0.9, awning.box.y0 + 0.25, 0]);
        labelMarks += w.text("lc", at[0], at[1] + 4, "Awning above", 12);
      }
    }
  }

  // Title, the street and the caption (and, for a floor not seen yet, its note).
  const left = p.point([-T, 0, 0])[0];
  const right = p.point([W + T, 0, 0])[0];
  const topY = p.point([0, outside ? strip.y1 : D + T, 0])[1];
  const frontY = p.point([0, floor.level === 0 ? model.terrace.y0 : -T, 0])[1];
  let frame = "";
  const title = outside ? "Terrace" : floor.name;
  frame += w.text("lt", left, topY - 18, title, 19, "start");
  const streetY = frontY + 26;
  frame += w.path("h", [
    ["M", left - 10, streetY - 8],
    ["L", right + 10, streetY - 8],
  ]);
  frame += w.text("lx", (left + right) / 2, streetY + 12, "Street", 15);
  frame += w.text("lc", left, streetY + 36, "Approximate, not to scale", 12, "start");
  if (!outside && floor.confirmed === false && floor.note) frame += w.text("lc", left, streetY + 54, floor.note, 12, "start");

  const level = floor.level;
  const labelGroup = labels ? `<g${attrs({ id: `${prefix}labels-${floor.id}`, "data-labels": "", "data-floor": floor.id })}>${labelMarks}</g>` : "";
  const bodyFloor = `<g${attrs({ id: `${prefix}floor-${floor.id}`, "data-floor": floor.id, "data-level": level, "data-confirmed": outside ? undefined : confirmedAttr(floor) })}>${content}${labelGroup}</g>`;
  return svgDocument({
    prefix,
    theme,
    title: opts.title ?? `${model.name}: ${outside ? "terrace" : floor.name} plan`,
    desc: outside
      ? `A plan of the tiled terrace in front of ${model.name}: the awning on two posts, the bench under the window, two small round tables, the glass door and the shop window.`
      : planDesc(model, floor, areas),
    bounds: w.bounds,
    body: bodyFloor + frame,
    used: w.used,
    paper: true,
  });
}

function rectXYWH(p: Projection, r: Rect): [number, number, number, number] {
  const a = p.point([r.x0, r.y0, 0]);
  const b = p.point([r.x1, r.y1, 0]);
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])];
}

// ---------------------------------------------------------------------------
// The committed set (public/house/), shared by the script and the drift test

export const HOUSE_RENDERS: readonly { readonly file: string; readonly render: () => string }[] = [
  { file: "street.svg", render: () => renderStreet() },
  { file: "street-neighbours.svg", render: () => renderStreet({ neighbours: true }) },
  { file: "cutaway.svg", render: () => renderCutaway() },
  { file: "cutaway-exploded.svg", render: () => renderCutaway({ explode: 2.5, labels: true }) },
  // The same with labels big enough to read when the picture is shown at phone width (about 390 px).
  { file: "cutaway-exploded-phone.svg", render: () => renderCutaway({ explode: 2.5, labels: true, labelSize: 32 }) },
  { file: "cutaway-arrival.svg", render: () => renderCutaway({ explode: 2.5, route: "arrival", floors: ["ground", "floor1"] }) },
  { file: "cutaway-ground.svg", render: () => renderCutaway({ floors: ["ground"], labels: true }) },
  { file: "cutaway-floor1.svg", render: () => renderCutaway({ floors: ["floor1"], labels: true }) },
  { file: "plan-ground.svg", render: () => renderPlan("ground") },
  { file: "plan-floor1.svg", render: () => renderPlan("floor1") },
  { file: "plan-floor2.svg", render: () => renderPlan("floor2") },
  { file: "plan-outside.svg", render: () => renderPlan("outside") },
];
