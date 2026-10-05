/**
 * 3D to SVG for the House Model: primitives (boxes, extruded polygons, flat
 * panels, cylinders, turned shapes like jars), the isometric and plan
 * projections, painter's sorting and path serialisation. Pure functions, no
 * dependencies; every number is rounded to one decimal so the same model
 * always gives byte-identical SVG.
 *
 * Isometric view from the front right, above (see docs/HOUSE_MODEL.md):
 *   u = x, v = depth - y
 *   X = (u - v) cos30 S,  Y = (u + v) sin30 S - z S,  S = 36 px per metre
 * The faces that can be seen are the tops, the faces pointing to the street
 * (-y, toward the viewer's left) and the faces pointing right (+x).
 */
import type { Box3, Rect } from "./types";

export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];

/** Pixels per metre in the isometric views. */
export const S = 36;
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;
/** The constant for drawing a quarter circle with one cubic curve. */
const KAPPA = 0.5523;

export interface Projection {
  readonly kind: "iso" | "plan";
  /** Pixels per metre. */
  readonly scale: number;
  point(p: Vec3): Vec2;
}

export function isoProjection(depth: number, scale = S): Projection {
  const c = COS30 * scale;
  const s = SIN30 * scale;
  return {
    kind: "iso",
    scale,
    point: ([x, y, z]) => {
      const u = x;
      const v = depth - y;
      return [(u - v) * c, (u + v) * s - z * scale];
    },
  };
}

/** Top-down, the street at the bottom of the drawing and the left party wall on the left. */
export function planProjection(depth: number, scale: number): Projection {
  return { kind: "plan", scale, point: ([x, y]) => [x * scale, (depth - y) * scale] };
}

// ---------------------------------------------------------------------------
// Boxes

export function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box3 {
  return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) };
}

/** A box from its centre on the floor plan, its size (w along x, d along y, h up) and where it starts. */
export function centred(cx: number, cy: number, w: number, d: number, h: number, z0 = 0): Box3 {
  return box(cx - w / 2, cx + w / 2, cy - d / 2, cy + d / 2, z0, z0 + h);
}

export function lift(b: Box3, dz: number): Box3 {
  return { ...b, z0: b.z0 + dz, z1: b.z1 + dz };
}

export function union(boxes: readonly Box3[]): Box3 {
  let { x0, x1, y0, y1, z0, z1 } = boxes[0]!;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x0);
    x1 = Math.max(x1, b.x1);
    y0 = Math.min(y0, b.y0);
    y1 = Math.max(y1, b.y1);
    z0 = Math.min(z0, b.z0);
    z1 = Math.max(z1, b.z1);
  }
  return { x0, x1, y0, y1, z0, z1 };
}

/** Whether two boxes share some volume (touching faces do not count). */
export function intersects(a: Box3, b: Box3, eps = 1e-6): boolean {
  return a.x0 < b.x1 - eps && b.x0 < a.x1 - eps && a.y0 < b.y1 - eps && b.y0 < a.y1 - eps && a.z0 < b.z1 - eps && b.z0 < a.z1 - eps;
}

export function insideRect(inner: Rect, outer: Rect, tolerance = 0): boolean {
  return (
    inner.x0 >= outer.x0 - tolerance &&
    inner.x1 <= outer.x1 + tolerance &&
    inner.y0 >= outer.y0 - tolerance &&
    inner.y1 <= outer.y1 + tolerance
  );
}

// ---------------------------------------------------------------------------
// Paint: what a node draws, in 3D (polygons, polylines) or straight in screen space.

export type Cmd =
  | readonly ["M", number, number]
  | readonly ["L", number, number]
  | readonly ["Q", number, number, number, number]
  | readonly ["C", number, number, number, number, number, number]
  | readonly ["Z"];

export type Paint =
  /** A flat polygon in 3D (a face), or an open polyline when open is set. */
  | { readonly t: "poly"; readonly pts: readonly Vec3[]; readonly cls: string; readonly open?: boolean }
  /** Many open polylines in one path (grids, boards, folds). */
  | { readonly t: "lines"; readonly lines: readonly (readonly Vec3[])[]; readonly cls: string }
  /** A shape built in screen space from the projection (curves: ellipses, cylinders, jars). */
  | { readonly t: "screen"; readonly cls: string; readonly build: (p: Projection) => readonly Cmd[] };

export const poly = (pts: readonly Vec3[], cls: string): Paint => ({ t: "poly", pts, cls });
export const line = (pts: readonly Vec3[], cls: string): Paint => ({ t: "poly", pts, cls, open: true });
export const lines = (list: readonly (readonly Vec3[])[], cls: string): Paint => ({ t: "lines", lines: list, cls });
export const screen = (cls: string, build: (p: Projection) => readonly Cmd[]): Paint => ({ t: "screen", cls, build });

/** A rectangle on the plane y (a face pointing to the street). */
export function onFront(y: number, x0: number, x1: number, z0: number, z1: number): Vec3[] {
  return [
    [x0, y, z0],
    [x1, y, z0],
    [x1, y, z1],
    [x0, y, z1],
  ];
}

/** A rectangle on the plane x (a face pointing right). */
export function onRight(x: number, y0: number, y1: number, z0: number, z1: number): Vec3[] {
  return [
    [x, y0, z0],
    [x, y1, z0],
    [x, y1, z1],
    [x, y0, z1],
  ];
}

/** A rectangle on the plane z (a top). */
export function onTop(z: number, x0: number, x1: number, y0: number, y1: number): Vec3[] {
  return [
    [x0, y0, z],
    [x1, y0, z],
    [x1, y1, z],
    [x0, y1, z],
  ];
}

export interface BoxStyle {
  /** Classes of the top, the street-facing (-y) and the right-facing (+x) face; "" leaves a face out. */
  readonly top: string;
  readonly front: string;
  readonly right: string;
}

/** The faces of a box that the isometric camera can see: front (-y), right (+x), top. Empty faces are left out. */
export function boxFaces(b: Box3, style: BoxStyle): Paint[] {
  const out: Paint[] = [];
  const w = b.x1 - b.x0;
  const d = b.y1 - b.y0;
  const h = b.z1 - b.z0;
  if (style.front && w > 1e-9 && h > 1e-9) out.push(poly(onFront(b.y0, b.x0, b.x1, b.z0, b.z1), style.front));
  if (style.right && d > 1e-9 && h > 1e-9) out.push(poly(onRight(b.x1, b.y0, b.y1, b.z0, b.z1), style.right));
  if (style.top && w > 1e-9 && d > 1e-9) out.push(poly(onTop(b.z1, b.x0, b.x1, b.y0, b.y1), style.top));
  return out;
}

/**
 * An extruded polygon (given counter-clockwise in plan): its side faces that
 * point toward the camera, sorted (smaller u + v first, then lower z), then
 * its top. Sides pointing more to the street than to the right take the
 * left-facing class.
 */
export function prismFaces(outline: readonly Vec2[], z0: number, z1: number, depth: number, cls: { top: string; front: string; right: string }): Paint[] {
  const sides: { pts: Vec3[]; key: number; cls: string }[] = [];
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i]!;
    const q = outline[(i + 1) % outline.length]!;
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    // Outward normal (dy, -dx); toward the camera when nx - ny > 0.
    if (dy + dx <= 1e-9) continue;
    const key = (p[0] + q[0]) / 2 + (depth - (p[1] + q[1]) / 2);
    sides.push({
      pts: [
        [p[0], p[1], z0],
        [q[0], q[1], z0],
        [q[0], q[1], z1],
        [p[0], p[1], z1],
      ],
      key,
      cls: dx > dy ? cls.front : cls.right,
    });
  }
  sides.sort((a, b) => a.key - b.key);
  const out: Paint[] = sides.map((side) => poly(side.pts, side.cls));
  if (cls.top) out.push(poly(outline.map(([x, y]) => [x, y, z1] as const), cls.top));
  return out;
}

// ---------------------------------------------------------------------------
// Curves in screen space

/** An ellipse that is the projection of the circle centre + cos t a + sin t b (exact for any parallel projection). */
export function ellipseOnPlane(p: Projection, centre: Vec3, a: Vec3, b: Vec3): Cmd[] {
  const c = p.point(centre);
  const pa = p.point([centre[0] + a[0], centre[1] + a[1], centre[2] + a[2]]);
  const pb = p.point([centre[0] + b[0], centre[1] + b[1], centre[2] + b[2]]);
  const A: Vec2 = [pa[0] - c[0], pa[1] - c[1]];
  const B: Vec2 = [pb[0] - c[0], pb[1] - c[1]];
  const at = (ca: number, cb: number): Vec2 => [c[0] + ca * A[0] + cb * B[0], c[1] + ca * A[1] + cb * B[1]];
  const k = KAPPA;
  const pts: [Vec2, Vec2, Vec2][] = [
    [at(1, k), at(k, 1), at(0, 1)],
    [at(-k, 1), at(-1, k), at(-1, 0)],
    [at(-1, -k), at(-k, -1), at(0, -1)],
    [at(k, -1), at(1, -k), at(1, 0)],
  ];
  const start = at(1, 0);
  return [["M", start[0], start[1]], ...pts.map(([c1, c2, e]) => ["C", c1[0], c1[1], c2[0], c2[1], e[0], e[1]] as const), ["Z"]];
}

/** A horizontal circle (a table top, a basin) as an ellipse. */
export function flatCircle(p: Projection, cx: number, cy: number, z: number, r: number): Cmd[] {
  return ellipseOnPlane(p, [cx, cy, z], [r, 0, 0], [0, r, 0]);
}

/** The screen radii of a horizontal circle of radius r (axis-aligned in both projections). */
function radii(p: Projection, r: number): Vec2 {
  return p.kind === "iso" ? [r * p.scale * Math.SQRT2 * COS30, r * p.scale * Math.SQRT2 * SIN30] : [r * p.scale, r * p.scale];
}

/** Half an axis-aligned ellipse, from its left end through its bottom (front) to its right end. */
function frontHalf(cx: number, cy: number, rx: number, ry: number, reverse = false): Cmd[] {
  const k = KAPPA;
  if (!reverse)
    return [
      ["C", cx - rx, cy + k * ry, cx - k * rx, cy + ry, cx, cy + ry],
      ["C", cx + k * rx, cy + ry, cx + rx, cy + k * ry, cx + rx, cy],
    ];
  return [
    ["C", cx + rx, cy + k * ry, cx + k * rx, cy + ry, cx, cy + ry],
    ["C", cx - k * rx, cy + ry, cx - rx, cy + k * ry, cx - rx, cy],
  ];
}

export interface CylinderStyle {
  readonly top: string;
  readonly left: string;
  readonly right: string;
  /** The outline class (fill none). */
  readonly outline: string;
}

/** An upright cylinder: two shaded halves of its side, its outline, then its top. */
export function cylinderPaint(cx: number, cy: number, r: number, z0: number, z1: number, style: CylinderStyle): Paint[] {
  const side = (p: Projection) => {
    const [rx, ry] = radii(p, r);
    const [bx, by] = p.point([cx, cy, z0]);
    const [, ty] = p.point([cx, cy, z1]);
    return { rx, ry, bx, by, ty };
  };
  const k = KAPPA;
  const out: Paint[] = [];
  if (z1 - z0 > 1e-9) {
    out.push(
      screen(style.left, (p) => {
        const { rx, ry, bx, by, ty } = side(p);
        return [
          ["M", bx - rx, ty],
          ["L", bx - rx, by],
          ["C", bx - rx, by + k * ry, bx - k * rx, by + ry, bx, by + ry],
          ["L", bx, ty + ry],
          ["C", bx - k * rx, ty + ry, bx - rx, ty + k * ry, bx - rx, ty],
          ["Z"],
        ];
      }),
      screen(style.right, (p) => {
        const { rx, ry, bx, by, ty } = side(p);
        return [
          ["M", bx, by + ry],
          ["C", bx + k * rx, by + ry, bx + rx, by + k * ry, bx + rx, by],
          ["L", bx + rx, ty],
          ["C", bx + rx, ty + k * ry, bx + k * rx, ty + ry, bx, ty + ry],
          ["Z"],
        ];
      }),
      screen(style.outline, (p) => {
        const { rx, ry, bx, by, ty } = side(p);
        return [["M", bx - rx, ty], ["L", bx - rx, by], ...frontHalf(bx, by, rx, ry), ["L", bx + rx, ty]];
      }),
    );
  }
  if (style.top) out.push(screen(style.top, (p) => flatCircle(p, cx, cy, z1, r)));
  return out;
}

/** Smooth closed or open curve through points (Catmull-Rom as cubic curves). */
export function smooth(points: readonly Vec2[], closed = false, tension = 1): Cmd[] {
  const n = points.length;
  if (n < 2) return [];
  const out: Cmd[] = [["M", points[0]![0], points[0]![1]]];
  const get = (i: number) => (closed ? points[(i + n) % n]! : points[Math.max(0, Math.min(n - 1, i))]!);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const t = tension / 6;
    out.push(["C", p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t, p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t, p2[0], p2[1]]);
  }
  if (closed) out.push(["Z"]);
  return out;
}

export interface Turned {
  /** The body (silhouette) path. */
  readonly body: readonly Cmd[];
  /** The shadowed right side of the body. */
  readonly shade: readonly Cmd[];
  /** The rim's top, around the opening. */
  readonly rim: readonly Cmd[];
  /** The dark opening. */
  readonly mouth: readonly Cmd[];
  /** A band (the front half of a circle) at a given profile index. */
  band(index: number): readonly Cmd[];
}

/**
 * A turned shape (a clay jar) from its profile, radius by height from the foot
 * up: the silhouette is the left and right ends of each level's circle, joined
 * smoothly, closed by the front half of the foot; the rim is the top circle.
 */
export function turned(p: Projection, cx: number, cy: number, z0: number, profile: readonly (readonly [number, number])[], mouthRatio = 0.78): Turned {
  const levels = profile.map(([r, z]) => {
    const [rx, ry] = radii(p, r);
    const [x, y] = p.point([cx, cy, z0 + z]);
    return { rx, ry, x, y };
  });
  const foot = levels[0]!;
  const top = levels[levels.length - 1]!;
  const right = levels.map((l) => [l.x + l.rx, l.y] as const);
  const left = levels.map((l) => [l.x - l.rx, l.y] as const).reverse();
  const rightCurve = smooth(right).slice(1);
  const leftCurve = smooth(left).slice(1);
  const body: Cmd[] = [
    ["M", foot.x - foot.rx, foot.y],
    ...frontHalf(foot.x, foot.y, foot.rx, foot.ry),
    ...rightCurve,
    ...frontHalf(top.x, top.y, top.rx, top.ry, true).map((c): Cmd => c),
    ...leftCurve,
    ["Z"],
  ];
  // The shade: the right third of the body, bounded by a curve through each level's 40% point.
  const inner = levels.map((l) => [l.x + l.rx * 0.38, l.y] as const);
  const shade: Cmd[] = [
    ["M", inner[0]![0], foot.y + foot.ry * 0.93],
    ["C", foot.x + foot.rx * 0.75, foot.y + foot.ry * 0.75, foot.x + foot.rx, foot.y + foot.ry * 0.4, foot.x + foot.rx, foot.y],
    ...rightCurve,
    ["L", inner[inner.length - 1]![0], top.y + top.ry * 0.9],
    ...smooth([...inner].reverse()).slice(1),
    ["Z"],
  ];
  const rim = ellipseOnPlane(p, [cx, cy, z0 + profile[profile.length - 1]![1]], [profile[profile.length - 1]![0], 0, 0], [0, profile[profile.length - 1]![0], 0]);
  const mr = profile[profile.length - 1]![0] * mouthRatio;
  const mouth = ellipseOnPlane(p, [cx, cy, z0 + profile[profile.length - 1]![1]], [mr, 0, 0], [0, mr, 0]);
  return {
    body,
    shade,
    rim,
    mouth,
    band: (index) => {
      const l = levels[index]!;
      return [["M", l.x - l.rx, l.y], ...frontHalf(l.x, l.y, l.rx, l.ry)];
    },
  };
}

// ---------------------------------------------------------------------------
// Nodes and painter's sorting

/**
 * A thing to draw: its bounding box (absolute metres) for sorting, what it
 * paints itself, and its children (sorted among themselves, or kept in the
 * given order). open/close wrap its markup (an SVG group with ids).
 */
export interface Node {
  readonly box: Box3;
  readonly paint?: readonly Paint[];
  readonly children?: readonly Node[];
  /** Keep the children in the given order instead of sorting them. */
  readonly keep?: boolean;
  readonly open?: string;
  readonly close?: string;
}

const EPS = 1e-6;

interface Hex {
  readonly h0: number;
  readonly h1: number;
  readonly a0: number;
  readonly a1: number;
  readonly c0: number;
  readonly c1: number;
}

/** The three screen intervals that bound a box's isometric outline (a hexagon). */
function hex(b: Box3, depth: number): Hex {
  const v0 = depth - b.y1;
  const v1 = depth - b.y0;
  return { h0: b.x0 - v1, h1: b.x1 - v0, a0: b.z0 - v1, a1: b.z1 - v0, c0: b.z0 - b.x1, c1: b.z1 - b.x0 };
}

function overlaps(p: Hex, q: Hex): boolean {
  return p.h0 < q.h1 - EPS && q.h0 < p.h1 - EPS && p.a0 < q.a1 - EPS && q.a0 < p.a1 - EPS && p.c0 < q.c1 - EPS && q.c0 < p.c1 - EPS;
}

/**
 * Whether a is behind b, from a separating axis: a is entirely to the left
 * (smaller x), entirely further back (larger y) or entirely below. Undefined
 * when the boxes share volume. When two boxes' outlines overlap, every
 * separating axis gives the same answer, so the first one found is right.
 */
export function behind(a: Box3, b: Box3): boolean | undefined {
  if (a.x1 <= b.x0 + EPS) return true;
  if (b.x1 <= a.x0 + EPS) return false;
  if (a.y0 >= b.y1 - EPS) return true;
  if (b.y0 >= a.y1 - EPS) return false;
  if (a.z1 <= b.z0 + EPS) return true;
  if (b.z1 <= a.z0 + EPS) return false;
  return undefined;
}

/**
 * Painter's order for nodes: a topological sort of "is behind" between nodes
 * whose outlines overlap, choosing among the free nodes by the base rule
 * (smaller u + v first, ties by lower z, then insertion order). The base rule
 * alone mis-sorts long walls against small things; the topological pass fixes
 * that. Nodes that share volume fall back to the base rule.
 */
export function depthSort<T extends Node>(nodes: readonly T[], depth: number): T[] {
  const n = nodes.length;
  if (n < 2) return [...nodes];
  const hexes = nodes.map((node) => hex(node.box, depth));
  const key = nodes.map((node) => {
    const b = node.box;
    return [(b.x0 + b.x1) / 2 + depth - (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2] as const;
  });
  const before = (i: number, j: number) => {
    const d = key[i]![0] - key[j]![0];
    if (Math.abs(d) > EPS) return d < 0;
    const z = key[i]![1] - key[j]![1];
    if (Math.abs(z) > EPS) return z < 0;
    return i < j;
  };
  const after: number[][] = nodes.map(() => []);
  const indegree = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!overlaps(hexes[i]!, hexes[j]!)) continue;
      const verdict = behind(nodes[i]!.box, nodes[j]!.box);
      const iFirst = verdict ?? before(i, j);
      if (iFirst) {
        after[i]!.push(j);
        indegree[j]!++;
      } else {
        after[j]!.push(i);
        indegree[i]!++;
      }
    }
  }
  const done = new Array<boolean>(n).fill(false);
  const order: T[] = [];
  for (let count = 0; count < n; count++) {
    let pick = -1;
    for (let i = 0; i < n; i++) {
      if (done[i] || indegree[i]! > 0) continue;
      if (pick < 0 || before(i, pick)) pick = i;
    }
    if (pick < 0) {
      // A cycle (rare with boxes): break it at the node the base rule draws first.
      for (let i = 0; i < n; i++) if (!done[i] && (pick < 0 || before(i, pick))) pick = i;
    }
    done[pick] = true;
    order.push(nodes[pick]!);
    for (const j of after[pick]!) indegree[j]!--;
  }
  return order;
}

// ---------------------------------------------------------------------------
// Serialisation

/** One decimal, no "-0". */
export function num(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded === 0 ? 0 : rounded);
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function emptyBounds(): Bounds {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

/**
 * Writes paths and text, and keeps track of the classes used (for the
 * stylesheet) and of every point drawn (for the viewBox), per floor group.
 */
export class Writer {
  readonly used = new Set<string>();
  bounds: Bounds = emptyBounds();

  /** Starts a new bounds record (for a floor group) and returns the previous one. */
  resetBounds(): Bounds {
    const previous = this.bounds;
    this.bounds = emptyBounds();
    return previous;
  }

  addPoint(x: number, y: number): void {
    const rx = Math.round(x * 10) / 10;
    const ry = Math.round(y * 10) / 10;
    const b = this.bounds;
    if (rx < b.minX) b.minX = rx;
    if (ry < b.minY) b.minY = ry;
    if (rx > b.maxX) b.maxX = rx;
    if (ry > b.maxY) b.maxY = ry;
  }

  private pair(x: number, y: number): string {
    this.addPoint(x, y);
    return `${num(x)} ${num(y)}`;
  }

  d(cmds: readonly Cmd[]): string {
    let out = "";
    for (const c of cmds) {
      switch (c[0]) {
        case "M":
        case "L":
          out += c[0] + this.pair(c[1], c[2]);
          break;
        case "Q":
          out += "Q" + this.pair(c[1], c[2]) + " " + this.pair(c[3], c[4]);
          break;
        case "C":
          out += "C" + this.pair(c[1], c[2]) + " " + this.pair(c[3], c[4]) + " " + this.pair(c[5], c[6]);
          break;
        case "Z":
          out += "Z";
          break;
      }
    }
    return out;
  }

  classes(cls: string): string {
    for (const c of cls.split(" ")) if (c) this.used.add(c);
    return cls;
  }

  path(cls: string, cmds: readonly Cmd[], attrs = ""): string {
    if (cmds.length === 0) return "";
    const c = cls ? ` class="${this.classes(cls)}"` : "";
    return `<path${c}${attrs} d="${this.d(cmds)}"/>`;
  }

  /** A paint in a projection. */
  paint(p: Paint, proj: Projection): string {
    if (p.t === "screen") return this.path(p.cls, p.build(proj));
    if (p.t === "lines") {
      const cmds: Cmd[] = [];
      for (const l of p.lines) {
        l.forEach((pt, i) => {
          const [x, y] = proj.point(pt);
          cmds.push([i === 0 ? "M" : "L", x, y]);
        });
      }
      return this.path(p.cls, cmds);
    }
    const cmds: Cmd[] = p.pts.map((pt, i) => {
      const [x, y] = proj.point(pt);
      return [i === 0 ? "M" : "L", x, y] as const;
    });
    if (!p.open) cmds.push(["Z"]);
    return this.path(p.cls, cmds);
  }

  /** Text, with an estimate of its box (Figtree-like widths) added to the bounds. */
  text(cls: string, x: number, y: number, content: string, size: number, anchor: "start" | "middle" | "end" = "middle"): string {
    const w = textWidth(content, size);
    const left = anchor === "start" ? x : anchor === "middle" ? x - w / 2 : x - w;
    this.addPoint(left, y - size * 0.8);
    this.addPoint(left + w, y + size * 0.25);
    const a = anchor === "start" ? "" : ` text-anchor="${anchor}"`;
    // The width is fixed (glyphs scaled to fit), so labels fit their pills whatever font the viewer has.
    return `<text class="${this.classes(cls)}" x="${num(x)}" y="${num(y)}"${a} textLength="${num(w)}" lengthAdjust="spacingAndGlyphs">${escapeXml(content)}</text>`;
  }

  /** Draws a node and its children in painter's order. */
  node(n: Node, proj: Projection, depth: number): string {
    let out = n.open ?? "";
    for (const p of n.paint ?? []) out += this.paint(p, proj);
    if (n.children) {
      const kids = n.keep ? n.children : depthSort(n.children, depth);
      for (const child of kids) out += this.node(child, proj, depth);
    }
    return out + (n.close ?? "");
  }
}

/** An estimate of a label's width: average Figtree advance widths by character class. */
export function textWidth(text: string, size: number): number {
  let units = 0;
  for (const ch of text) {
    if (ch === " ") units += 0.26;
    else if ("ilj'.,:;|!".includes(ch)) units += 0.25;
    else if ("ftrI()[]".includes(ch)) units += 0.36;
    else if ("mwMW".includes(ch)) units += 0.84;
    else if (ch >= "A" && ch <= "Z") units += 0.66;
    else if (ch >= "0" && ch <= "9") units += 0.56;
    else units += 0.54;
  }
  return units * size;
}

export function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Path commands for an axis-aligned rectangle in screen space, with optionally rounded corners (cubic). */
export function roundRect(x: number, y: number, w: number, h: number, r = 0): Cmd[] {
  if (r <= 0)
    return [
      ["M", x, y],
      ["L", x + w, y],
      ["L", x + w, y + h],
      ["L", x, y + h],
      ["Z"],
    ];
  const k = KAPPA * r;
  return [
    ["M", x + r, y],
    ["L", x + w - r, y],
    ["C", x + w - r + k, y, x + w, y + r - k, x + w, y + r],
    ["L", x + w, y + h - r],
    ["C", x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h],
    ["L", x + r, y + h],
    ["C", x + r - k, y + h, x, y + h - r + k, x, y + h - r],
    ["L", x, y + r],
    ["C", x, y + r - k, x + r - k, y, x + r, y],
    ["Z"],
  ];
}

/** A circle in screen space (cubic). */
export function circle(cx: number, cy: number, r: number): Cmd[] {
  const k = KAPPA * r;
  return [
    ["M", cx + r, cy],
    ["C", cx + r, cy + k, cx + k, cy + r, cx, cy + r],
    ["C", cx - k, cy + r, cx - r, cy + k, cx - r, cy],
    ["C", cx - r, cy - k, cx - k, cy - r, cx, cy - r],
    ["C", cx + k, cy - r, cx + r, cy - k, cx + r, cy],
    ["Z"],
  ];
}
