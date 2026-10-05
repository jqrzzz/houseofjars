/**
 * The views of the House Model, each an SVG string drawn from the model:
 *
 * - renderStreet: the closed building from the front right, as from the street;
 * - renderCutaway: the dollhouse (right wall, roof and ceilings taken away,
 *   the facade dropped to a low cut line), optionally exploded, labelled,
 *   highlighted, with a guest's route;
 * - renderPlan: a floor plan of one floor, or of the terrace ("outside").
 *
 * Every floor is its own group (id floor-{id}, data-floor, data-level), drawn
 * bottom to top; areas and fixtures are groups with stable ids and data
 * attributes (see docs/HOUSE_MODEL.md for the contract animators rely on).
 * Same input, byte-identical output.
 */
import { type FixtureContext, type PlanMark, isoParts, planMarks } from "./fixtures";
import {
  type Bounds,
  type Cmd,
  type Node,
  type Paint,
  type Projection,
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
import { ROOF, houseOfJars } from "./house-of-jars";
import { type MaterialName, fill, kindFloors, paletteCss, tint } from "./palette";
import type { Area, Box3, Fixture, Floor, FloorId, HouseModel, Rect, Theme, Wall } from "./types";

export interface StreetOptions {
  readonly theme?: Theme;
  /** Draw the neighbours (low-detail, cropped): NinetyNine 99 Bar on the left, Swedish Baking on the right. */
  readonly neighbours?: boolean;
  readonly idPrefix?: string;
  readonly title?: string;
  readonly model?: HouseModel;
}

export interface CutawayOptions {
  readonly theme?: Theme;
  /** Extra metres of gap between floors (0 = stacked). */
  readonly explode?: number;
  /** Which floors to draw (default all). */
  readonly floors?: readonly FloorId[];
  /** Area labels with leader lines. */
  readonly labels?: boolean;
  /** Area ids to emphasise; the others are dimmed. */
  readonly highlight?: readonly string[];
  /** A route id to draw. */
  readonly route?: string;
  readonly idPrefix?: string;
  readonly title?: string;
  readonly model?: HouseModel;
}

export interface PlanOptions {
  readonly theme?: Theme;
  readonly labels?: boolean;
  readonly idPrefix?: string;
  readonly title?: string;
  readonly model?: HouseModel;
}

/** How high the cutaway's facade (and anything outside) stands above each floor. */
export const FACADE_CUT = 1.0;
const MARGIN = 18;

// ---------------------------------------------------------------------------
// Shared pieces

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

function wallMaterial(wall: Wall): MaterialName {
  return wall.material as MaterialName;
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
 * right wall) are hairlines.
 */
function wallNodes(wall: Wall, top: number, z: number, style: WallStyle, faceMaterial: { front?: MaterialName; right?: MaterialName; top?: MaterialName } = {}): Node[] {
  const m = wallMaterial(wall);
  const alongX = wall.box.x1 - wall.box.x0 >= wall.box.y1 - wall.box.y0;
  const cutaway = style.view === "cutaway";
  const pieces = wallPieces(wall, top).map((piece) => ({ ...piece, z0: piece.z0 + z, z1: piece.z1 + z }));
  if (pieces.length === 0) return [];
  const mainCls = `${fill(alongX ? (faceMaterial.front ?? m) : (faceMaterial.right ?? m), alongX ? 1 : 2)}`;
  const nodes: Node[] = pieces.map((b) => {
    const rightIsCut = cutaway && alongX && b.x1 >= style.width - 1e-6;
    const paint = boxFaces(b, {
      front: alongX ? "" : `${fill(faceMaterial.front ?? m, 1)} o`,
      right: alongX ? `${fill(faceMaterial.right ?? m, 2)} ${rightIsCut ? "h" : "o"}` : "",
      top: `${fill(faceMaterial.top ?? m, 0)} ${cutaway ? "h" : "o"}`,
    });
    return { box: b, paint, open: `<g${attrs({ "data-wall": wall.id })}>`, close: "</g>" };
  });
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
  nodes.push({ box: faceBox, paint, open: `<g${attrs({ "data-wall": wall.id })}>`, close: "</g>" });
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

interface DrawnFixture {
  readonly fixture: Fixture;
  readonly node: Node;
}

/** Fixture groups (with mounted fixtures nested in their hosts' groups). */
function fixtureNodes(
  model: HouseModel,
  floor: Floor,
  prefix: string,
  include: (f: Fixture) => boolean,
  ctxFor: (f: Fixture) => FixtureContext,
  dim: (f: Fixture) => boolean,
): DrawnFixture[] {
  const list = model.fixtures.filter((f) => f.floor === floor.id && include(f));
  const ids = new Set(list.map((f) => f.id));
  const make = (f: Fixture): Node | null => {
    const parts = isoParts(f, ctxFor(f), floor.ceiling);
    const children = list.filter((g) => g.mountedOn === f.id).map(make).filter((n): n is Node => n !== null);
    const all = [...parts, ...children];
    if (all.length === 0) return null;
    const cls = dim(f) ? "dim" : undefined;
    return {
      box: union(all.map((n) => n.box)),
      children: all,
      open: `<g${attrs({
        id: `${prefix}fx-${f.id}`,
        class: cls,
        "data-fixture": f.type,
        "data-label": f.label,
        "data-area": f.area,
        "data-confirmed": confirmedAttr(f),
      })}>`,
      close: "</g>",
    };
  };
  const out: DrawnFixture[] = [];
  for (const f of list) {
    if (f.mountedOn && ids.has(f.mountedOn)) continue;
    const node = make(f);
    if (node) out.push({ fixture: f, node });
  }
  return out;
}

function svgDocument(opts: {
  prefix: string;
  theme: Theme;
  title: string;
  desc: string;
  bounds: Bounds;
  body: string;
  used: Set<string>;
}): string {
  const scope = `${opts.prefix}hj-${opts.theme}`;
  const { minX, minY, maxX, maxY } = opts.bounds;
  const x = Math.floor(minX - MARGIN);
  const y = Math.floor(minY - MARGIN);
  const w = Math.ceil(maxX + MARGIN) - x;
  const h = Math.ceil(maxY + MARGIN) - y;
  const css = paletteCss({ theme: opts.theme, scope, used: opts.used });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="${scope}" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="${opts.prefix}title ${opts.prefix}desc">` +
    `<title id="${opts.prefix}title">${escapeXml(opts.title)}</title>` +
    `<desc id="${opts.prefix}desc">${escapeXml(opts.desc)}</desc>` +
    `<style>${css}</style>` +
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

/** The slab under a floor (with the stairwell left open on the upper floors), and the terrace on the ground floor. */
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
    const t = model.terrace;
    const tb = box(t.x0, t.x1, t.y0, t.y1, z1 - 0.15, z1);
    out.push({ box: tb, paint: boxFaces(tb, { top: fill("terraceTile", 0), front: `${fill("terraceTile", 1)} o`, right: `${fill("terraceTile", 2)} o` }) });
    return out;
  }
  const hole = stairHole(model, floor);
  if (!hole) return [slab(box(-T, W + T, -T, D + T, z0, z1))];
  out.push(
    slab(box(-T, W + T, hole.y1, D + T, z0, z1)),
    slab(box(-T, hole.x0, hole.y0, hole.y1, z0, z1)),
    slab(box(hole.x1, W + T, hole.y0, hole.y1, z0, z1)),
    slab(box(-T, W + T, -T, hole.y0, z0, z1)),
  );
  return out;
}

/** The opening in an upper floor's slab where the stairs come up: the stairwell between the partitions. */
function stairHole(model: HouseModel, floor: Floor): Rect | null {
  if (floor.level === 0) return null;
  const below = model.floors.find((f) => f.level === floor.level - 1);
  const stairs = model.fixtures.find((f) => f.type === "stairs" && f.floor === below?.id);
  if (!stairs) return null;
  return { x0: 0, x1: 1.25, y0: 8.7, y1: 12.6 };
}

/** The visible floor of an area: its rectangle, less the stairwell on the upper floors. */
function areaFloorRects(model: HouseModel, area: Area): Rect[] {
  const floor = floorById(model, area.floor);
  const hole = stairHole(model, floor);
  const r = area.rect;
  if (!hole || r.x1 <= hole.x0 || r.x0 >= hole.x1 || r.y1 <= hole.y0 || r.y0 >= hole.y1) return [r];
  const out: Rect[] = [];
  if (r.y0 < hole.y0) out.push({ ...r, y1: hole.y0 });
  if (r.y1 > hole.y1) out.push({ ...r, y0: hole.y1 });
  const y0 = Math.max(r.y0, hole.y0);
  const y1 = Math.min(r.y1, hole.y1);
  if (r.x1 > hole.x1) out.push({ x0: hole.x1, x1: r.x1, y0, y1 });
  if (r.x0 < hole.x0) out.push({ x0: r.x0, x1: hole.x0, y0, y1 });
  return out;
}

const TILE: Record<string, number> = { cafeFloor: 0.6, dormFloor: 0.4, landingFloor: 0.4, terraceTile: 0.4, bathFloor: 0.5, stone: 0 };

function areaFloorsIso(model: HouseModel, floor: Floor, prefix: string, w: Writer, p: Projection, highlight?: readonly string[]): string {
  let out = "";
  const areas = model.areas.filter((a) => a.floor === floor.id);
  // Rooms first, then the sub-areas drawn on top of them.
  const ordered = [...areas.filter((a) => !a.parent), ...areas.filter((a) => a.parent)];
  for (const area of ordered) {
    const material = kindFloors[area.kind];
    const parentArea = area.parent ? areas.find((a) => a.id === area.parent) : undefined;
    const floorMaterial = parentArea ? kindFloors[parentArea.kind] : material;
    const z = floor.z;
    const dim = highlight && highlight.length > 0 && !highlight.includes(area.id);
    let inner = "";
    for (const r of areaFloorRects(model, area)) {
      const top = onTop(z, r.x0, r.x1, r.y0, r.y1);
      if (area.parent) {
        // A sub-area: a soft dashed edge on its room's floor, tinted by its own kind.
        inner += w.paint(poly(top, `${fill(material, 0)} ns`), p);
        inner += w.paint(poly(top, "sd"), p);
      } else {
        inner += w.paint(poly(top, `${fill(floorMaterial, 0)} h`), p);
        const step = TILE[floorMaterial] ?? 0;
        if (step > 0) {
          const grid: Vec3[][] = [];
          for (let x = Math.ceil((r.x0 + 1e-6) / step) * step; x < r.x1 - 1e-6; x += step) grid.push([[x, r.y0, z], [x, r.y1, z]]);
          for (let y = Math.ceil((r.y0 + 1e-6) / step) * step; y < r.y1 - 1e-6; y += step) grid.push([[r.x0, y, z], [r.x1, y, z]]);
          inner += w.paint(lines(grid, "tg"), p);
        }
      }
      if (highlight?.includes(area.id)) inner += w.paint(poly(top, "hl"), p);
    }
    out += `<g${attrs({
      id: `${prefix}area-${area.id}`,
      class: dim ? "dim" : undefined,
      "data-area": area.id,
      "data-kind": area.kind,
      "data-confirmed": confirmedAttr(area),
    })}>${inner}</g>`;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Routes and labels (isometric)

function routeMarkup(model: HouseModel, routeId: string, floor: Floor, prefix: string, w: Writer, p: Projection): string {
  const route = model.routes.find((r) => r.id === routeId);
  if (!route) return "";
  let out = "";
  route.segments.forEach((segment, index) => {
    if (segment.floor !== floor.id) return;
    const pts = segment.points.map(([x, y, z]) => p.point([x, y, floor.z + (z ?? 0) + 0.04]));
    const cmds: Cmd[] = pts.map(([x, y], i) => [i === 0 ? "M" : "L", x, y] as const);
    out += w.path("rt", cmds, attrs({ id: `${prefix}route-${route.id}-${floor.id}`, "data-route": route.id, "data-floor": floor.id }));
    // An arrowhead where the route ends.
    if (index === route.segments.length - 1 && pts.length > 1) {
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
    for (const stop of route.stops ?? []) {
      if (stop.floor !== floor.id) continue;
      const [sx, sy] = p.point([stop.at[0], stop.at[1], floor.z + 0.04]);
      out += w.path("rs", circle(sx, sy, 6), attrs({ "data-stop": stop.label }));
    }
  });
  return out;
}

interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
  ax: number;
  ay: number;
  text: string;
}

/** Pills above their anchors, pushed apart so none overlap. */
function placeLabels(items: { ax: number; ay: number; text: string }[], size: number, lift: number): LabelBox[] {
  const placed: LabelBox[] = [];
  const sorted = [...items].sort((a, b) => b.ay - a.ay || a.ax - b.ax);
  for (const item of sorted) {
    const w = textWidth(item.text, size) + 22;
    const h = size + 13;
    const label: LabelBox = { x: item.ax - w / 2, y: item.ay - lift - h, w, h, ax: item.ax, ay: item.ay, text: item.text };
    for (let guard = 0; guard < 40; guard++) {
      const hit = placed.find((o) => label.x < o.x + o.w + 6 && o.x < label.x + label.w + 6 && label.y < o.y + o.h + 5 && o.y < label.y + label.h + 5);
      if (!hit) break;
      label.y = hit.y - label.h - 5;
    }
    placed.push(label);
  }
  return placed;
}

function labelMarkup(labels: readonly LabelBox[], w: Writer, size: number): string {
  let out = "";
  for (const l of labels) {
    out += w.path("ld", [
      ["M", l.ax, l.ay],
      ["L", l.ax, l.y + l.h],
    ]);
    out += w.path("lp", circle(l.ax, l.ay, 3.5));
    out += w.path("lb", roundRect(l.x, l.y, l.w, l.h, l.h / 2));
    out += w.text(size >= 19 ? "lt" : "lx", l.x + l.w / 2, l.y + l.h / 2 + size * 0.36, l.text, size);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Street view

function neighbour(side: "left" | "right", model: HouseModel, prefix: string): Node {
  const T = model.wall;
  const W = model.width;
  // Full depth but cropped across: a slice of each neighbour, cut where the drawing ends.
  const depth = model.depth + T;
  if (side === "left") {
    const b = box(-2.6, -T - 0.1, -T, depth, -0.2, 11.2);
    const slats: Vec3[][] = [];
    for (let x = b.x0 + 0.12; x < b.x1 - 0.05; x += 0.16) slats.push([[x, b.y0, 6.4], [x, b.y0, 10.9]]);
    return {
      box: b,
      open: `<g${attrs({ id: `${prefix}neighbour-left`, "data-neighbour": "NinetyNine 99 Bar" })}>`,
      close: "</g>",
      paint: [
        ...boxFaces(b, { top: `${fill("neighbourGrey", 0)} o`, front: `${fill("neighbourGrey", 1)} o`, right: `${fill("neighbourGrey", 2)} o` }),
        lines(slats, "tg"),
        poly(onFront(b.y0, b.x0, b.x1, 5.2, 6.2), `${fill("dark", 1)} h`),
        line([[b.x0 + 0.3, b.y0, 5.7], [b.x1 - 0.4, b.y0, 5.7]], `kla b`),
        poly(onFront(b.y0, b.x1 - 1.4, b.x1 - 0.3, 0, 2.3), `${fill("dark", 1)} h`),
        line([[b.x0, b.y0, b.z0], [b.x0, b.y0, b.z1], [b.x0, b.y1, b.z1]], "dl"),
      ],
    };
  }
  const b = box(W + T + 0.1, W + 2.7, -T, depth, -0.2, 9.3);
  const panel = onFront(b.y0, b.x0 + 0.5, b.x1, 5.4, 9.0);
  const panes: Vec3[][] = [];
  for (let x = b.x0 + 0.9; x < b.x1; x += 0.45) panes.push([[x, b.y0, 3.9], [x, b.y0, 5.0]]);
  return {
    box: b,
    open: `<g${attrs({ id: `${prefix}neighbour-right`, "data-neighbour": "Swedish Baking" })}>`,
    close: "</g>",
    paint: [
      ...boxFaces(b, { top: `${fill("neighbourBlue", 0)} o`, front: `${fill("neighbourBlue", 1)} o`, right: `${fill("neighbourBlue", 2)} o` }),
      poly(panel, `${fill("neighbourPanel", 1)} h`),
      poly(onFront(b.y0, b.x0 + 0.5, b.x1, 3.9, 5.0), `${fill("slate", 1)} h`),
      lines(panes, "tg"),
      poly(onFront(b.y0, b.x0 + 0.8, b.x1 - 0.2, 3.1, 3.6), `${fill("dark", 1)} h`),
      poly(onFront(b.y0, b.x0 + 0.5, b.x1, 0, 2.6), `${fill("slate", 1)} h`),
    ],
  };
}

/** The facade's relief on Floor 2: the big arch (it echoes the logo) around the two small windows, and the side pilasters. */
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
  if (floor.level !== 2) return out;
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
    paint: [poly(archPts(0), `${fill("facade", 1)} h`), screen(`${fill("facadeDeep", 1)} eo h`, recess)],
  });
  return out;
}

export function renderStreet(opts: StreetOptions = {}): string {
  const model = opts.model ?? houseOfJars;
  const theme = opts.theme ?? "auto";
  const prefix = opts.idPrefix ?? "";
  const p = isoProjection(model.depth);
  const w = new Writer();
  const total = emptyBounds();
  const T = model.wall;
  const W = model.width;
  const D = model.depth;
  let body = "";

  const node = (n: Node) => w.node(n, p, model.depth);
  if (opts.neighbours) {
    w.resetBounds();
    body += node(neighbour("left", model, prefix));
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
      const plinth = box(-T, W + T, -T, D + T, -0.2, 0);
      nodes.push({ box: plinth, paint: boxFaces(plinth, { top: "", front: "", right: `${fill("stone", 2)} o` }) });
    }
    for (const wall of model.walls) {
      if (wall.floor !== floor.id) continue;
      if (wall.kind !== "facade" && !(wall.kind === "party" && wall.box.x0 >= W - 1e-6) && wall.kind !== "back") continue;
      const outer = { ...wall, box: { ...wall.box, z1: height } };
      nodes.push(...wallNodes(outer, height, floor.z, { view: "street", width: W }, wall.kind === "facade" ? {} : { front: "stone", right: "stone", top: "stone" }));
    }
    nodes.push(...facadeRelief(model, floor));
    if (floor.level === 2) {
      // The ledge band under the arch, the roof slab and the low tiled roof edge at the front.
      const ledge = box(-T, W + T, -T - 0.14, -T, floor.z + 0.15, floor.z + 0.35);
      nodes.push({ box: ledge, paint: boxFaces(ledge, { top: `${fill("facade", 0)} o`, front: `${fill("facade", 1)} o`, right: `${fill("facade", 2)} o` }) });
      const roof = box(-T, W + T, -T, D + T, ROOF.z0, ROOF.z1);
      nodes.push({
        box: roof,
        paint: boxFaces(roof, { top: `${fill("stone", 0)} o`, front: `${fill("facade", 1)} o`, right: `${fill("stone", 2)} o` }),
        open: `<g${attrs({ id: `${prefix}roof` })}>`,
        close: "</g>",
      });
      const front = -T - 0.32;
      const eave: Vec3[] = [
        [-T - 0.08, front, ROOF.z1 + 0.02],
        [W + T + 0.08, front, ROOF.z1 + 0.02],
        [W + T + 0.08, 0.4, ROOF.z1 + 0.3],
        [-T - 0.08, 0.4, ROOF.z1 + 0.3],
      ];
      const tiles: Vec3[][] = [];
      for (let x = -T + 0.1; x < W + T; x += 0.2) tiles.push([[x, front, ROOF.z1 + 0.02], [x, 0.4, ROOF.z1 + 0.3]]);
      const lip = box(-T - 0.08, W + T + 0.08, front - 0.05, front, ROOF.z1 - 0.06, ROOF.z1 + 0.02);
      nodes.push({
        box: box(-T - 0.08, W + T + 0.08, front - 0.05, 0.4, ROOF.z1 - 0.06, ROOF.z1 + 0.3),
        keep: true,
        children: [
          { box: lip, paint: boxFaces(lip, { top: "", front: `${fill("roofTile", 1)} o`, right: `${fill("roofTile", 2)} o` }) },
          { box: box(-T - 0.08, W + T + 0.08, front, 0.4, ROOF.z1 + 0.02, ROOF.z1 + 0.3), paint: [poly(eave, `${fill("roofTile", 0)} o`), lines(tiles, "tg")] },
        ],
      });
    }
    const fixtures = fixtureNodes(
      model,
      floor,
      prefix,
      (f) => f.mount === "facade" || areaKind(model, f.area) === "outside",
      () => ({ z: floor.z, depth: D }),
      () => false,
    );
    nodes.push(...fixtures.map((f) => f.node));
    const content = w.node({ box: box(0, 0, 0, 0, 0, 0), children: nodes }, p, model.depth);
    body += `<g${attrs({ id: `${prefix}floor-${floor.id}`, "data-floor": floor.id, "data-level": floor.level })}>${content}</g>`;
    addBounds(total, w.bounds);
  }

  if (opts.neighbours) {
    w.resetBounds();
    body += node(neighbour("right", model, prefix));
    addBounds(total, w.bounds);
  }

  return svgDocument({
    prefix,
    theme,
    title: opts.title ?? `${model.name} from the street`,
    desc: `The ${model.name} shophouse seen from the street at the front right: the orange-red facade with its big arch, the glass door and grid window under the wooden awning, and the tiled terrace${opts.neighbours ? ", between NinetyNine 99 Bar and Swedish Baking" : ""}.`,
    bounds: total,
    body,
    used: w.used,
  });
}

function areaKind(model: HouseModel, areaId: string) {
  return model.areas.find((a) => a.id === areaId)?.kind;
}

// ---------------------------------------------------------------------------
// Cutaway

export function renderCutaway(opts: CutawayOptions = {}): string {
  const model = opts.model ?? houseOfJars;
  const theme = opts.theme ?? "auto";
  const prefix = opts.idPrefix ?? "";
  const explode = opts.explode ?? 0;
  const wanted = opts.floors ?? model.floors.map((f) => f.id);
  const drawn = model.floors.filter((f) => wanted.includes(f.id)).sort((a, b) => a.level - b.level);
  const p = isoProjection(model.depth);
  const w = new Writer();
  const total = emptyBounds();
  const W = model.width;
  const D = model.depth;
  const highlight = opts.highlight && opts.highlight.length > 0 ? opts.highlight : undefined;
  let body = "";
  const labelGroups: string[] = [];

  for (const floor of drawn) {
    w.resetBounds();
    const dy = -explode * S * floor.level;
    const cut = floor.z + FACADE_CUT;
    let content = "";
    for (const slab of slabNodes(model, floor)) content += w.node(slab, p, D);
    content += areaFloorsIso(model, floor, prefix, w, p, highlight);

    const nodes: Node[] = [];
    for (const wall of model.walls) {
      if (wall.floor !== floor.id) continue;
      if (wall.kind === "party" && wall.box.x0 >= W - 1e-6) continue; // the right wall is taken away
      const top = wall.kind === "facade" ? FACADE_CUT : wall.box.z1;
      const faces = wall.kind === "party" ? { front: "facade" as MaterialName } : {};
      nodes.push(...wallNodes(wall, top, floor.z, { view: "cutaway", width: W }, faces));
    }
    const fixtures = fixtureNodes(
      model,
      floor,
      prefix,
      (f) => f.mount !== "right-wall",
      (f) => {
        const outside = f.mount === "facade" || f.mount === "facade-inside" || areaKind(model, f.area) === "outside";
        return { z: floor.z, depth: D, cut: outside ? cut : undefined };
      },
      (f) => Boolean(highlight && !highlight.includes(f.area)),
    );
    nodes.push(...fixtures.map((f) => f.node));
    content += w.node({ box: box(0, 0, 0, 0, 0, 0), children: nodes }, p, D);
    if (opts.route) content += routeMarkup(model, opts.route, floor, prefix, w, p);
    const transform = dy !== 0 ? `translate(0,${num(dy)})` : undefined;
    body += `<g${attrs({ id: `${prefix}floor-${floor.id}`, "data-floor": floor.id, "data-level": floor.level, transform })}>${content}</g>`;
    addBounds(total, w.bounds, dy);

    if (opts.labels) {
      w.resetBounds();
      const items = model.areas
        .filter((a) => a.floor === floor.id)
        .map((a) => {
          const ax = a.anchor?.x ?? (a.rect.x0 + a.rect.x1) / 2;
          const ay = a.anchor?.y ?? (a.rect.y0 + a.rect.y1) / 2;
          const [sx, sy] = p.point([ax, ay, floor.z]);
          return { ax: sx, ay: sy, text: a.name };
        });
      let inner = labelMarkup(placeLabels(items, 19, 34), w, 19);
      if (opts.route) {
        for (const stop of model.routes.find((r) => r.id === opts.route)?.stops ?? []) {
          if (stop.floor !== floor.id) continue;
          const [sx, sy] = p.point([stop.at[0], stop.at[1], floor.z]);
          inner += w.text("lx", sx + 12, sy - 10, stop.label, 15, "start");
        }
      }
      labelGroups.push(`<g${attrs({ id: `${prefix}labels-${floor.id}`, "data-labels": "", "data-floor": floor.id, transform })}>${inner}</g>`);
      addBounds(total, w.bounds, dy);
    }
  }
  body += labelGroups.join("");

  const names = drawn.map((f) => f.name);
  const which = names.length === model.floors.length ? "every floor" : names.join(" and ");
  return svgDocument({
    prefix,
    theme,
    title: opts.title ?? `${model.name}: ${explode > 0 ? "exploded" : "cutaway"} view`,
    desc: `A dollhouse cutaway of ${model.name} from the front right, with the right wall, roof and ceilings taken away to show ${which}${explode > 0 ? ", the floors lifted apart" : ""}${opts.route ? `, and the route "${model.routes.find((r) => r.id === opts.route)?.name ?? opts.route}"` : ""}.`,
    bounds: total,
    body,
    used: w.used,
  });
}

// ---------------------------------------------------------------------------
// Plans

const PLAN_SCALE = 50;

function planWallMarks(model: HouseModel, floor: Floor, p: Projection, only?: (wall: Wall) => boolean): PlanMark[] {
  const out: PlanMark[] = [];
  for (const wall of model.walls) {
    if (wall.floor !== floor.id || (only && !only(wall))) continue;
    // At plan height (1.2 m) a wall is solid where it has no opening reaching that high.
    const cutHeight = wall.kind === "parapet" ? wall.box.z1 : 1.2;
    const clipped: Wall = { ...wall, openings: (wall.openings ?? []).filter((o) => (o.z0 ?? 0) <= cutHeight && o.z1 >= cutHeight) };
    for (const piece of wallPieces(clipped, wall.box.z1)) {
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

export function renderPlan(which: FloorId | "outside", opts: PlanOptions = {}): string {
  const model = opts.model ?? houseOfJars;
  const theme = opts.theme ?? "auto";
  const prefix = opts.idPrefix ?? "";
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
  if (outside) {
    content += w.path(fill("cafeFloor", 0) + " ns", roundRect(...rectXYWH(p, { x0: 0, x1: W, y0: 0, y1: 1.2 })));
    content += w.text("lc", p.point([W / 2, 0.75, 0])[0], p.point([W / 2, 0.75, 0])[1], "Café", 12);
  }
  for (const area of ordered) {
    const r = outside ? { ...area.rect } : area.rect;
    let inner = w.path(`${tint(area.kind)} ns`, roundRect(...rectXYWH(p, r)));
    if (area.parent) inner += w.path("sd", roundRect(...rectXYWH(p, r)));
    content += `<g${attrs({ id: `${prefix}area-${area.id}`, "data-area": area.id, "data-kind": area.kind, "data-confirmed": confirmedAttr(area) })}>${inner}</g>`;
  }
  if (outside) {
    const t = model.terrace;
    const grid: Cmd[] = [];
    for (let x = t.x0 + 0.4; x < t.x1 - 0.05; x += 0.4) grid.push(["M", ...p.point([x, t.y0, 0])], ["L", ...p.point([x, t.y1, 0])]);
    for (let y = t.y0 + 0.4; y < t.y1 - 0.05; y += 0.4) grid.push(["M", ...p.point([t.x0, y, 0])], ["L", ...p.point([t.x1, y, 0])]);
    content += w.path("tg", grid);
  }

  // Fixtures: things on the floor first, then what hangs above (dashed).
  const fixtures = model.fixtures.filter((f) => {
    if (f.floor !== floor.id && !(outside && f.mount === "facade")) return false;
    if (outside) return areaKind(model, f.area) === "outside" || f.mount === "facade";
    return areaKind(model, f.area) !== "outside" || floor.level === 0;
  });
  const high = (f: Fixture) => f.box.z0 > 1.6 || f.type === "awning" || f.mount === "right-wall" || f.mount === "facade-inside";
  const sortedFx = [...fixtures.filter((f) => !high(f)), ...fixtures.filter(high)];
  for (const f of sortedFx) {
    const marks = planMarks(f, p);
    if (marks.length === 0) continue;
    content += `<g${attrs({ id: `${prefix}fx-${f.id}`, "data-fixture": f.type, "data-label": f.label, "data-area": f.area, "data-confirmed": confirmedAttr(f) })}>${writeMarks(marks, w)}</g>`;
  }

  content += `<g data-walls="">${writeMarks(
    planWallMarks(model, floor, p, outside ? (wall) => wall.kind === "facade" : undefined),
    w,
  )}</g>`;

  // Labels.
  let labelMarks = "";
  if (labels) {
    for (const area of areas) {
      const ax = area.anchor?.x ?? (area.rect.x0 + area.rect.x1) / 2;
      const ay = area.anchor?.y ?? (area.rect.y0 + area.rect.y1) / 2;
      const [sx, sy] = p.point([ax, ay, 0]);
      const size = 15;
      const tw = textWidth(area.name, size) + 16;
      labelMarks += w.path("lb", roundRect(sx - tw / 2, sy - 12, tw, 24, 12));
      labelMarks += w.text("lx", sx, sy + 5.4, area.name, size);
    }
    if (outside) {
      const door = p.point([0.6, -0.55, 0]);
      labelMarks += w.text("lc", door[0], door[1] + 4, "Door", 12);
      const awning = p.point([3.3, -2.35, 0]);
      labelMarks += w.text("lc", awning[0], awning[1] + 4, "Awning above", 12);
    }
  }

  // Title, the street and the caption.
  const left = p.point([-T, 0, 0])[0];
  const right = p.point([W + T, 0, 0])[0];
  const topY = p.point([0, outside ? 1.2 : D + T, 0])[1];
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

  const level = floor.level;
  const bodyFloor = `<g${attrs({ id: `${prefix}floor-${floor.id}`, "data-floor": floor.id, "data-level": level })}>${content}${labels ? `<g data-labels="">${labelMarks}</g>` : ""}</g>`;
  const names: Record<string, string> = {
    ground: "the café, the front desk, the stairs, the toilet and the staff area",
    floor1: "Dorm H with its 12 pods and lockers, the landing with the shoe cubbies, and the women's bathroom",
    floor2: "Dorm J with its 12 pods and lockers, the landing, and the men's bathroom",
  };
  return svgDocument({
    prefix,
    theme,
    title: opts.title ?? `${model.name}: ${outside ? "terrace" : floor.name} plan`,
    desc: outside
      ? `A plan of the tiled terrace in front of ${model.name}: the awning on two posts, the bench under the window, two small round tables, the glass door and the shop window.`
      : `A plan of ${floor.name} of ${model.name}, street at the bottom: ${names[floor.id] ?? "its rooms"}.`,
    bounds: w.bounds,
    body: bodyFloor + frame,
    used: w.used,
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
  { file: "cutaway-arrival.svg", render: () => renderCutaway({ explode: 2.5, route: "arrival", floors: ["ground", "floor1"] }) },
  { file: "plan-ground.svg", render: () => renderPlan("ground") },
  { file: "plan-floor1.svg", render: () => renderPlan("floor1") },
  { file: "plan-floor2.svg", render: () => renderPlan("floor2") },
  { file: "plan-outside.svg", render: () => renderPlan("outside") },
];
