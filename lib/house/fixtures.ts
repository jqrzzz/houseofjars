/**
 * The fixture library: how each kind of thing in the house is drawn, in the
 * house's style (ink outlines, flat fills, teak and cream, jar orange,
 * lamplight). For the isometric views each fixture becomes a few parts
 * (boxes, cylinders, panels, curves) that the painter's sort puts in order;
 * for the plans each becomes a simple top-down symbol.
 *
 * Builders get the fixture's box in absolute metres (z above the street-level
 * floor). They draw only what the camera can see (tops, faces toward the
 * street, faces toward the right), so the drawings stay small.
 */
import {
  type Cmd,
  type Node,
  type Paint,
  type Projection,
  type Vec2,
  type Vec3,
  box,
  boxFaces,
  boxOutline,
  circle,
  cylinderPaint,
  ellipseOnPlane,
  flatCircle,
  line,
  lines,
  onFront,
  onRight,
  onTop,
  planeText,
  poly,
  prismFaces,
  screen,
  shapes,
  turned,
  union,
} from "./geometry";
import { type MaterialName, fill } from "./palette";
import type { Box3, Facing, Fixture } from "./types";

export interface FixtureContext {
  /** The floor's height above the street-level floor. */
  readonly z: number;
  /** The interior depth (for sorting faces of turned and extruded shapes). */
  readonly depth: number;
  /** An absolute height above which this fixture is cut away (the cutaway's low facade line), if any. */
  readonly cut?: number;
  /** How far the floor above is from this one (a flight of stairs climbs that far). */
  readonly rise?: number;
  /**
   * "simple": the paper outfit's detail. Fewer pieces, never fewer fixtures: a pod is a teak box with a
   * curtain front and a lamp dot, a stack of lockers one block (its other lockers keep their empty groups).
   */
  readonly detail?: "full" | "simple";
  /** The other fixtures on the floor (a locker finds its stack). */
  readonly siblings?: readonly Fixture[];
}

const c = (m: MaterialName, tone: 0 | 1 | 2, extra = "") => (extra ? `${fill(m, tone)} ${extra}` : fill(m, tone));

const part = (b: Box3, paint: readonly Paint[]): Node => ({ box: b, paint });

/** A box in one material (or one per face), its visible faces in the three tones. */
function solid(b: Box3, m: MaterialName, extra = "", per: { top?: MaterialName; front?: MaterialName; right?: MaterialName } = {}): Node {
  return part(b, boxFaces(b, { top: c(per.top ?? m, 0, extra), front: c(per.front ?? m, 1, extra), right: c(per.right ?? m, 2, extra) }));
}

function decorate(n: Node, more: readonly Paint[]): Node {
  return { ...n, paint: [...(n.paint ?? []), ...more] };
}

/** A thin upright line (a leg, a rail, a chain) as its own sortable part. */
function stick(x: number, y: number, z0: number, z1: number, cls = "o"): Node {
  return part(box(x, x, y, y, z0, z1), [line([[x, y, z0], [x, y, z1]], cls)]);
}

function cylinder(cx: number, cy: number, r: number, z0: number, z1: number, m: MaterialName, topM: MaterialName = m): Node {
  return part(
    box(cx - r, cx + r, cy - r, cy + r, z0, z1),
    cylinderPaint(cx, cy, r, z0, z1, { top: c(topM, 0), left: c(m, 1, "ns"), right: c(m, 2, "ns"), outline: "n" }),
  );
}

/** Lines across a face, every step (tiles, boards). */
function gridFront(y: number, x0: number, x1: number, z0: number, z1: number, sx: number, sz: number): Vec3[][] {
  const out: Vec3[][] = [];
  if (sx > 0) for (let x = x0 + sx; x < x1 - 1e-6; x += sx) out.push([[x, y, z0], [x, y, z1]]);
  if (sz > 0) for (let z = z0 + sz; z < z1 - 1e-6; z += sz) out.push([[x0, y, z], [x1, y, z]]);
  return out;
}

function gridRight(x: number, y0: number, y1: number, z0: number, z1: number, sy: number, sz: number): Vec3[][] {
  const out: Vec3[][] = [];
  if (sy > 0) for (let y = y0 + sy; y < y1 - 1e-6; y += sy) out.push([[x, y, z0], [x, y, z1]]);
  if (sz > 0) for (let z = z0 + sz; z < z1 - 1e-6; z += sz) out.push([[x, y0, z], [x, y1, z]]);
  return out;
}

function gridTop(z: number, x0: number, x1: number, y0: number, y1: number, sx: number, sy: number): Vec3[][] {
  const out: Vec3[][] = [];
  if (sx > 0) for (let x = x0 + sx; x < x1 - 1e-6; x += sx) out.push([[x, y0, z], [x, y1, z]]);
  if (sy > 0) for (let y = y0 + sy; y < y1 - 1e-6; y += sy) out.push([[x0, y, z], [x1, y, z]]);
  return out;
}

/** A round plate on a right-facing plane. */
function plateRight(x: number, y: number, z: number, r: number, cls: string): Paint {
  return screen(cls, (p) => ellipseOnPlane(p, [x, y, z], [0, r, 0], [0, 0, r]));
}

/** A round thing on a street-facing plane. */
function plateFront(x: number, y: number, z: number, r: number, cls: string): Paint {
  return screen(cls, (p) => ellipseOnPlane(p, [x, y, z], [r, 0, 0], [0, 0, r]));
}

/** An arched outline (flat bottom, half-ellipse top) on a plane facing the street or the right. */
function arch(plane: "front" | "right", at: number, centre: number, width: number, z0: number, z1: number, rise = width / 2, steps = 10): Vec3[] {
  const half = width / 2;
  const spring = z1 - rise;
  const pts: Vec3[] = [];
  const put = (a: number, z: number): Vec3 => (plane === "front" ? [a, at, z] : [at, a, z]);
  pts.push(put(centre - half, z0));
  for (let i = 0; i <= steps; i++) {
    const t = Math.PI - (Math.PI * i) / steps;
    pts.push(put(centre + half * Math.cos(t), spring + rise * Math.sin(t)));
  }
  pts.push(put(centre + half, z0));
  return pts;
}

/** Clips a flat polygon (on any vertical plane) to z <= zMax (Sutherland-Hodgman against one plane); null when nothing is left. */
function clipBelow(pts: readonly Vec3[], zMax: number | undefined): Vec3[] | null {
  if (zMax === undefined) return [...pts];
  const out: Vec3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const ina = a[2] <= zMax + 1e-9;
    const inb = b[2] <= zMax + 1e-9;
    if (ina) out.push(a);
    if (ina !== inb) {
      const t = (zMax - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, zMax]);
    }
  }
  return out.length >= 3 ? out : null;
}

/** Clips a rectangle on a vertical plane at height zMax (null when entirely above). */
function under(pts: readonly Vec3[], zMax: number | undefined): Vec3[] | null {
  if (zMax === undefined) return [...pts];
  if (Math.min(...pts.map((p) => p[2])) >= zMax - 1e-6) return null;
  return pts.map(([x, y, z]) => [x, y, Math.min(z, zMax)] as const);
}

function cutBox(b: Box3, zMax: number | undefined): Box3 | null {
  if (zMax === undefined) return b;
  if (b.z0 >= zMax - 1e-6) return null;
  return { ...b, z1: Math.min(b.z1, zMax) };
}

/** A solid that may be cut: its top drawn as a hairline cut when clipped. */
function cutSolid(b: Box3, m: MaterialName, zMax: number | undefined, extra = ""): Node | null {
  const clipped = cutBox(b, zMax);
  if (!clipped) return null;
  const isCut = clipped.z1 < b.z1 - 1e-6;
  return part(clipped, boxFaces(clipped, { top: c(m, 0, isCut ? "h" : extra), front: c(m, 1, extra), right: c(m, 2, extra) }));
}

const present = (list: readonly (Node | null | undefined | false)[]): Node[] => list.filter((n): n is Node => Boolean(n));

// ---------------------------------------------------------------------------
// Furniture

/** Four legs under a top, with stretchers: drawn back to front. */
function legs(cx: number, cy: number, a: number, z0: number, z1: number, stretcher?: number): Node {
  const back: Vec3 = [cx - a, cy + a, 0];
  const left: Vec3 = [cx - a, cy - a, 0];
  const right: Vec3 = [cx + a, cy + a, 0];
  const front: Vec3 = [cx + a, cy - a, 0];
  const leg = (p: Vec3) => line([[p[0], p[1], z0], [p[0], p[1], z1]], "o");
  const bar = (p: Vec3, q: Vec3) => line([[p[0], p[1], stretcher!], [q[0], q[1], stretcher!]], "h");
  const paint: Paint[] = [leg(back)];
  if (stretcher !== undefined) paint.push(bar(back, left), bar(back, right));
  paint.push(leg(left), leg(right));
  if (stretcher !== undefined) paint.push(bar(left, front), bar(right, front));
  paint.push(leg(front));
  return part(box(cx - a, cx + a, cy - a, cy + a, z0, z1), paint);
}

function roundTop(b: Box3, top: MaterialName, thick: number, legM: { spread: number; stretcher?: number }): Node[] {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const r = (b.x1 - b.x0) / 2;
  return [
    legs(cx, cy, r * legM.spread, b.z0, b.z1 - thick, legM.stretcher === undefined ? undefined : b.z0 + (b.z1 - b.z0) * legM.stretcher),
    cylinder(cx, cy, r, b.z1 - thick, b.z1, top),
  ];
}

function table(b: Box3): Node[] {
  const t = 0.05;
  const i = 0.04;
  const l = 0.05;
  return [
    solid(box(b.x0 + i, b.x0 + i + l, b.y1 - i - l, b.y1 - i, b.z0, b.z1 - t), "woodDark"),
    solid(box(b.x0 + i, b.x0 + i + l, b.y0 + i, b.y0 + i + l, b.z0, b.z1 - t), "woodDark"),
    solid(box(b.x1 - i - l, b.x1 - i, b.y1 - i - l, b.y1 - i, b.z0, b.z1 - t), "woodDark"),
    solid(box(b.x1 - i - l, b.x1 - i, b.y0 + i, b.y0 + i + l, b.z0, b.z1 - t), "woodDark"),
    decorate(solid(box(b.x0, b.x1, b.y0, b.y1, b.z1 - t, b.z1), "wood"), [lines(gridTop(b.z1, b.x0, b.x1, b.y0, b.y1, 0, (b.y1 - b.y0) / 3), "tg")]),
  ];
}

function chair(fx: Fixture, b: Box3): Node[] {
  const seat = b.z0 + 0.45;
  const backAtFront = fx.faces === "+y"; // facing +y: the back is on the street side
  const backBox = backAtFront ? box(b.x0, b.x1, b.y0, b.y0 + 0.04, seat, b.z1) : box(b.x0, b.x1, b.y1 - 0.04, b.y1, seat, b.z1);
  const slats = gridFront(backBox.y0, b.x0, b.x1, seat + 0.06, b.z1 - 0.1, (b.x1 - b.x0) / 3, 0);
  const a = 0.03;
  return [
    part(box(b.x0, b.x1, b.y0, b.y1, b.z0, seat - 0.04), [
      line([[b.x0 + a, b.y1 - a, b.z0], [b.x0 + a, b.y1 - a, seat - 0.04]], "o"),
      line([[b.x1 - a, b.y1 - a, b.z0], [b.x1 - a, b.y1 - a, seat - 0.04]], "o"),
      line([[b.x0 + a, b.y0 + a, b.z0], [b.x0 + a, b.y0 + a, seat - 0.04]], "o"),
      line([[b.x1 - a, b.y0 + a, b.z0], [b.x1 - a, b.y0 + a, seat - 0.04]], "o"),
    ]),
    solid(box(b.x0, b.x1, b.y0, b.y1, seat - 0.04, seat), "wood"),
    decorate(solid(backBox, "woodDark"), backAtFront ? [lines(slats, "h")] : []),
  ];
}

function bench(b: Box3): Node[] {
  const top = b.z1 - 0.07;
  return [
    solid(box(b.x0 + 0.06, b.x0 + 0.11, b.y0 + 0.03, b.y1 - 0.03, b.z0, top), "woodDark"),
    solid(box(b.x1 - 0.11, b.x1 - 0.06, b.y0 + 0.03, b.y1 - 0.03, b.z0, top), "woodDark"),
    decorate(solid(box(b.x0, b.x1, b.y0, b.y1, top, b.z1), "wood"), [lines(gridTop(b.z1, b.x0, b.x1, b.y0, b.y1, 0, (b.y1 - b.y0) / 2), "tg")]),
  ];
}

function benchSeat(b: Box3): Node[] {
  const base = b.z0 + 0.35;
  const seat = b.z0 + 0.45;
  const len = b.y1 - b.y0;
  const pillows: Node[] = [];
  for (let i = 0; i < 3; i++) {
    const yc = b.y0 + (len * (i + 0.5)) / 3;
    const pb = box(b.x1 - 0.2, b.x1 - 0.03, yc - 0.3, yc + 0.3, seat, b.z1);
    pillows.push(decorate(solid(pb, "pillow"), [line([[pb.x0, yc, pb.z1], [pb.x0 + 0.03, yc, pb.z0 + 0.08]], "tg")]));
  }
  return [
    solid(box(b.x0, b.x1, b.y0, b.y1, b.z0, base), "plaster", "", { top: "plaster" }),
    solid(box(b.x0 + 0.02, b.x1, b.y0 + 0.02, b.y1 - 0.02, base, seat), "cushion"),
    ...pillows,
  ];
}

function jar(b: Box3, profile: readonly (readonly [number, number])[], bandAt: number): Node[] {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const shape = (p: Projection) => turned(p, cx, cy, b.z0, profile);
  return [
    part(b, [
      screen(c("terracotta", 1), (p) => shape(p).body),
      screen(c("terracotta", 2, "ns"), (p) => shape(p).shade),
      screen("n", (p) => shape(p).body),
      screen("tg", (p) => shape(p).band(bandAt)),
      screen(c("terracotta", 0), (p) => shape(p).rim),
      screen(c("shadow", 0), (p) => shape(p).mouth),
    ]),
  ];
}

const BIG_JAR: readonly (readonly [number, number])[] = [
  [0.19, 0],
  [0.25, 0.12],
  [0.3, 0.36],
  [0.285, 0.56],
  [0.23, 0.72],
  [0.19, 0.79],
  [0.21, 0.85],
];

const TALL_JAR: readonly (readonly [number, number])[] = [
  [0.065, 0],
  [0.09, 0.18],
  [0.125, 0.44],
  [0.115, 0.54],
  [0.08, 0.63],
  [0.07, 0.66],
  [0.08, 0.7],
];

function plant(b: Box3): Node[] {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const r = Math.min(b.x1 - b.x0, b.y1 - b.y0) / 2;
  const potH = Math.min(0.32, (b.z1 - b.z0) * 0.38);
  const potTop = b.z0 + potH;
  const pot: readonly (readonly [number, number])[] = [
    [r * 0.62, 0],
    [r * 0.8, potH * 0.85],
    [r * 0.9, potH],
  ];
  const leafLen = b.z1 - potTop;
  // Leaves fan out from the top of the pot: angles in screen space (0 = up), longer in the middle.
  const leaves: readonly (readonly [number, number])[] = [
    [-62, 0.62],
    [48, 0.66],
    [-30, 0.92],
    [22, 0.96],
    [-8, 1],
    [70, 0.5],
    [-80, 0.48],
  ];
  return [
    part(box(cx - r, cx + r, cy - r, cy + r, b.z0, potTop), [
      screen(c("terracotta", 1), (p) => turned(p, cx, cy, b.z0, pot).body),
      screen(c("shadow", 0), (p) => turned(p, cx, cy, b.z0, pot, 0.85).rim),
    ]),
    part(box(cx - r, cx + r, cy - r, cy + r, potTop, b.z1), [
      ...leaves.map(([deg, len]) =>
        screen(c("sage", deg > 0 ? 2 : 1), (p) => {
          const [x0, y0] = p.point([cx, cy, potTop]);
          const L = leafLen * p.scale * len;
          const a = (deg * Math.PI) / 180;
          const tip: Vec2 = [x0 + Math.sin(a) * L, y0 - Math.cos(a) * L];
          const w = L * 0.22;
          const nx = Math.cos(a) * w;
          const ny = Math.sin(a) * w;
          const mid: Vec2 = [(x0 + tip[0]) / 2, (y0 + tip[1]) / 2];
          return [
            ["M", x0, y0],
            ["Q", mid[0] - nx, mid[1] - ny, tip[0], tip[1]],
            ["Q", mid[0] + nx, mid[1] + ny, x0, y0],
            ["Z"],
          ];
        }),
      ),
    ]),
  ];
}

// ---------------------------------------------------------------------------
// The front: door, shop window, awning, signs, outdoor AC units

function frontDoor(fx: Fixture, b: Box3, ctx: FixtureContext): Node[] {
  const cols = fx.grid?.cols ?? 2;
  const rows = fx.grid?.rows ?? 6;
  const y = b.y0;
  const bar = 0.05;
  const frame = under(onFront(y, b.x0, b.x1, b.z0, b.z1), ctx.cut);
  if (!frame) return [];
  const paint: Paint[] = [poly(frame, c("copper", 1))];
  const pw = (b.x1 - b.x0 - bar) / cols;
  const ph = (b.z1 - b.z0 - bar) / rows;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const pane = under(onFront(y, b.x0 + bar + i * pw, b.x0 + (i + 1) * pw, b.z0 + bar + j * ph, b.z0 + (j + 1) * ph), ctx.cut);
      if (pane) paint.push(poly(pane, c("glass", 1, "h")));
    }
  const handle = under([[b.x1 - 0.12, y, b.z0 + 0.95], [b.x1 - 0.12, y, b.z0 + 1.15]], ctx.cut);
  if (handle && handle[1]![2] > handle[0]![2]) paint.push(line(handle, "b"));
  const top = ctx.cut !== undefined ? Math.min(b.z1, ctx.cut) : b.z1;
  return [part({ ...b, z1: top }, paint)];
}

function shopWindow(fx: Fixture, b: Box3, ctx: FixtureContext): Node[] {
  const cols = fx.grid?.cols ?? 4;
  const rows = fx.grid?.rows ?? 3;
  const sill = b.z0 + 0.95;
  const panel = box(b.x0, b.x1, b.y0 + 0.05, b.y1, b.z0, sill);
  const out: Node[] = [decorate(solid(panel, "facadeDeep"), [line([[b.x0 + 0.08, panel.y0, sill - 0.08], [b.x1 - 0.08, panel.y0, sill - 0.08]], "tg")])];
  const gy = b.y0 + 0.07;
  const frame = under(onFront(gy, b.x0, b.x1, sill, b.z1), ctx.cut);
  if (frame) {
    const paint: Paint[] = [poly(frame, c("copper", 1))];
    const bar = 0.05;
    const pw = (b.x1 - b.x0 - bar) / cols;
    const ph = (b.z1 - sill - bar) / rows;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const pane = under(onFront(gy, b.x0 + bar + i * pw, b.x0 + (i + 1) * pw, sill + bar + j * ph, sill + (j + 1) * ph), ctx.cut);
        if (pane) paint.push(poly(pane, c("glass", 1, "h")));
      }
    out.push(part(box(b.x0, b.x1, gy, gy, sill, ctx.cut !== undefined ? Math.min(ctx.cut, b.z1) : b.z1), paint));
  }
  // The bamboo blind, rolled down over the top third.
  const blind = under(onFront(b.y0 + 0.04, b.x0 + 0.04, b.x1 - 0.04, b.z1 - 0.62, b.z1 - 0.05), ctx.cut);
  if (blind) {
    const slats = gridFront(b.y0 + 0.04, b.x0 + 0.04, b.x1 - 0.04, b.z1 - 0.62, b.z1 - 0.05, 0, 0.07);
    out.push(
      part(box(b.x0 + 0.04, b.x1 - 0.04, b.y0 + 0.04, b.y0 + 0.04, b.z1 - 0.62, b.z1 - 0.05), [
        poly(blind, c("bamboo", 1)),
        lines(slats.map((l) => l.map(([x, yy, z]) => [x, yy, Math.min(z, ctx.cut ?? z)] as const)), "tg"),
      ]),
    );
    const roll = cutBox(box(b.x0 + 0.02, b.x1 - 0.02, b.y0, b.y0 + 0.04, b.z1 - 0.08, b.z1), ctx.cut);
    if (roll) out.push(solid(roll, "bamboo"));
  }
  return out;
}

function upperWindow(b: Box3, ctx: FixtureContext): Node[] {
  const frame = under(onFront(b.y0, b.x0, b.x1, b.z0, b.z1), ctx.cut);
  if (!frame) return [];
  const glass = under(onFront(b.y0, b.x0 + 0.05, b.x1 - 0.05, b.z0 + 0.05, b.z1 - 0.05), ctx.cut);
  const paint: Paint[] = [poly(frame, c("slate", 1))];
  if (glass) paint.push(poly(glass, c("glass", 1, "h")));
  return [part({ ...b, z1: Math.min(b.z1, ctx.cut ?? b.z1) }, paint)];
}

function acOutdoor(b: Box3): Node[] {
  const w = b.x1 - b.x0;
  const h = b.z1 - b.z0;
  const fanX = b.x0 + w * 0.4;
  const fanZ = b.z0 + h / 2;
  const r = h * 0.36;
  return [
    stick(b.x0 + 0.12, b.y1, b.z0 - 0.12, b.z0, "h"),
    stick(b.x1 - 0.12, b.y1, b.z0 - 0.12, b.z0, "h"),
    decorate(solid(b, "white"), [
      plateFront(fanX, b.y0, fanZ, r, c("steel", 1)),
      plateFront(fanX, b.y0, fanZ, r * 0.28, c("white", 1)),
      lines(gridRight(b.x1, b.y0, b.y1, b.z0 + 0.08, b.z1 - 0.08, 0, 0.08), "tg"),
      lines(gridFront(b.y0, b.x0 + w * 0.78, b.x1 - 0.06, b.z0 + 0.1, b.z1 - 0.1, 0, 0.07), "tg"),
    ]),
  ];
}

function awning(b: Box3): Node[] {
  const beam = 0.15;
  const fascia = box(b.x0, b.x1, b.y0, b.y0 + beam, b.z0, b.z1);
  const roof = box(b.x0, b.x1, b.y0 + beam, b.y1, b.z1 - 0.09, b.z1);
  const boards = gridTop(b.z1, b.x0, b.x1, b.y0 + beam, b.y1, 0.28, 0);
  // Only the street view shows the awning: its roof is drawn see-through (gh), so the shopfront under it
  // (the glass door, the grid window, the bamboo blind, the hanging sign) still reads, as in photo f1-01.
  return [
    decorate(solid(roof, "woodDark", "gh"), [lines(boards, "tg")]),
    decorate(solid(fascia, "wood"), [line([[b.x0, b.y0, b.z0 + 0.1], [b.x1, b.y0, b.z0 + 0.1]], "tg")]),
  ];
}

function post(b: Box3, ctx: FixtureContext): Node[] {
  return present([cutSolid(b, "wood", ctx.cut)]);
}

/** The "hostel" sign on the awning: white letters on an orange plate (photo f1-01). */
function signHostel(b: Box3): Node[] {
  const y = b.y0;
  return [
    decorate(solid(b, "jar"), [
      line([[b.x0 + 0.04, y, b.z0 + 0.05], [b.x1 - 0.04, y, b.z0 + 0.05]], "tg"),
      planeText("lsn", [(b.x0 + b.x1) / 2, y, (b.z0 + b.z1) / 2], "front", "hostel", 12),
    ]),
  ];
}

function signHanging(b: Box3): Node[] {
  const boardTop = b.z0 + 0.5;
  const board = box(b.x0, b.x1, b.y0, b.y1, b.z0, boardTop);
  const xc = (b.x0 + b.x1) / 2;
  return [
    stick(b.x0 + 0.12, (b.y0 + b.y1) / 2, boardTop, b.z1, "h"),
    stick(b.x1 - 0.12, (b.y0 + b.y1) / 2, boardTop, b.z1, "h"),
    decorate(solid(board, "woodDark"), [
      poly(onFront(b.y0, b.x0 + 0.06, b.x1 - 0.06, b.z0 + 0.06, boardTop - 0.06), c("paper", 1)),
      poly(arch("front", b.y0, xc + 0.22, 0.16, b.z0 + 0.12, boardTop - 0.1), c("jar", 1, "ns")),
      lines(
        [
          [[b.x0 + 0.14, b.y0, b.z0 + 0.32], [xc + 0.06, b.y0, b.z0 + 0.32]],
          [[b.x0 + 0.14, b.y0, b.z0 + 0.22], [xc, b.y0, b.z0 + 0.22]],
        ],
        "h",
      ),
    ]),
  ];
}

// ---------------------------------------------------------------------------
// The café and the front desk

function counter(b: Box3): Node[] {
  const step = 0.15;
  return [
    decorate(solid(b, "tile"), [
      lines(gridTop(b.z1, b.x0, b.x1, b.y0, b.y1, step, step), "tg"),
      lines(gridFront(b.y0, b.x0, b.x1, b.z0, b.z1, step, step), "tg"),
      lines(gridRight(b.x1, b.y0, b.y1, b.z0, b.z1, step, step), "tg"),
    ]),
  ];
}

function backCounter(b: Box3): Node[] {
  const checks: Paint[] = [];
  const s = 0.3;
  for (let i = 0; i * s < b.y1 - b.y0 - 1e-6; i++)
    for (let j = 0; j * s < b.z1 - b.z0 - 0.05 - 1e-6; j++) {
      if ((i + j) % 2 === 0) continue;
      const y0 = b.y0 + i * s;
      const z0 = b.z0 + j * s;
      checks.push(poly(onRight(b.x1, y0, Math.min(y0 + s, b.y1), z0, Math.min(z0 + s, b.z1 - 0.05)), c("woodDark", 2, "ns")));
    }
  return [
    decorate(solid(b, "tile"), [...checks, line([[b.x1, b.y0, b.z1 - 0.05], [b.x1, b.y1, b.z1 - 0.05]], "h")]),
  ];
}

function shelves(fx: Fixture, b: Box3): Node[] {
  const cols = fx.grid?.cols ?? 8;
  const rows = fx.grid?.rows ?? 4;
  const t = 0.04;
  const cw = (b.y1 - b.y0 - t) / cols;
  const ch = (b.z1 - b.z0 - t) / rows;
  const paint: Paint[] = [];
  const bookColours: MaterialName[] = ["jar", "sage", "curtain", "cream", "woodDark", "terracotta"];
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const y0 = b.y0 + t + i * cw;
      const z0 = b.z0 + t + j * ch;
      paint.push(poly(onRight(b.x1, y0, y0 + cw - t, z0, z0 + ch - t), c("shadow", 2)));
      // Books in some of the cubbies, standing on the shelf.
      if ((i * 3 + j * 5) % 4 === 0) {
        for (let k = 0; k < 4; k++) {
          const by = y0 + 0.03 + k * 0.055;
          const tall = ch - t - 0.06 - ((k + i) % 3) * 0.03;
          paint.push(poly(onRight(b.x1, by, by + 0.045, z0, z0 + tall), c(bookColours[(i + j + k) % bookColours.length]!, 2)));
        }
      } else if ((i + j) % 5 === 2) {
        // A round wooden box or a jar on the shelf.
        paint.push(poly(onRight(b.x1, y0 + 0.08, y0 + cw - t - 0.08, z0, z0 + ch * 0.5), c("wood", 2)));
      }
    }
  return [decorate(solid(b, "wood"), paint)];
}

function fridge(b: Box3): Node[] {
  const paint: Paint[] = [poly(onRight(b.x1, b.y0 + 0.05, b.y1 - 0.05, b.z0 + 0.15, b.z1 - 0.08), c("fridgeGlass", 2))];
  const shelvesZ = [0.5, 0.9, 1.3];
  const bottle: MaterialName[] = ["jar", "sage", "paper", "terracotta", "jar"];
  for (const z of shelvesZ) {
    paint.push(line([[b.x1, b.y0 + 0.05, b.z0 + z], [b.x1, b.y1 - 0.05, b.z0 + z]], "h"));
    for (let k = 0; k < 5; k++) {
      const y = b.y0 + 0.09 + k * 0.085;
      paint.push(poly(onRight(b.x1, y, y + 0.05, b.z0 + z, b.z0 + z + 0.22), c(bottle[(k + Math.round(z * 10)) % bottle.length]!, 2)));
    }
  }
  return [decorate(solid(b, "dark"), paint)];
}

function acIndoor(fx: Fixture, b: Box3): Node[] {
  const paint: Paint[] = [];
  if (fx.faces === "+x") paint.push(line([[b.x1, b.y0 + 0.05, b.z0 + 0.07], [b.x1, b.y1 - 0.05, b.z0 + 0.07]], "h"));
  if (fx.faces === "+y" || fx.faces === "-y") paint.push(line([[b.x0 + 0.05, b.y0, b.z0 + 0.07], [b.x1 - 0.05, b.y0, b.z0 + 0.07]], "h"));
  return [decorate(solid(b, "white"), paint)];
}

function coffeeMachine(b: Box3): Node[] {
  return [
    decorate(solid(b, "steel", "", { top: "dark" }), [
      poly(onRight(b.x1, b.y0 + 0.08, b.y1 - 0.08, b.z0 + 0.18, b.z1 - 0.06), c("dark", 2)),
      line([[b.x1, b.y0 + 0.16, b.z0 + 0.12], [b.x1, b.y1 - 0.16, b.z0 + 0.12]], "b"),
    ]),
  ];
}

function sink(b: Box3): Node[] {
  return [
    decorate(part(b, [poly(onTop(b.z1, b.x0, b.x1, b.y0, b.y1), c("steel", 0))]), [
      poly(onTop(b.z1, b.x0 + 0.05, b.x1 - 0.05, b.y0 + 0.05, b.y1 - 0.05), c("steel", 2)),
      line([[b.x0 + 0.04, (b.y0 + b.y1) / 2, b.z1], [b.x0 + 0.04, (b.y0 + b.y1) / 2, b.z1 + 0.22], [b.x0 + 0.14, (b.y0 + b.y1) / 2, b.z1 + 0.22]], "b"),
    ]),
  ];
}

function dehumidifier(b: Box3): Node[] {
  return [decorate(solid(b, "white"), [lines(gridFront(b.y0, b.x0 + 0.05, b.x1 - 0.05, b.z1 - 0.2, b.z1 - 0.06, 0, 0.045), "tg")])];
}

function outline(b: Box3, cls: string): Node[] {
  const z = b.z0 + 0.005;
  return [part({ ...b, z1: z }, [poly(onTop(z, b.x0, b.x1, b.y0, b.y1), cls)])];
}

function doormat(b: Box3): Node[] {
  const z = b.z0 + 0.01;
  const stripes: Paint[] = [];
  const colours: MaterialName[] = ["jar", "sage", "curtain", "cushion", "slate"];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const x0 = b.x0 + ((b.x1 - b.x0) * i) / n;
    stripes.push(poly(onTop(z, x0, x0 + (b.x1 - b.x0) / n, b.y0, b.y1), c(colours[i % colours.length]!, 0, "ns")));
  }
  return [part({ ...b, z1: z }, [...stripes, poly(onTop(z, b.x0, b.x1, b.y0, b.y1), "n")])];
}

function windowLedge(b: Box3): Node[] {
  const top = b.z1 - 0.05;
  return [
    solid(box(b.x0 + 0.1, b.x0 + 0.15, b.y0, b.y1 - 0.05, b.z0, top), "woodDark"),
    solid(box(b.x1 - 0.15, b.x1 - 0.1, b.y0, b.y1 - 0.05, b.z0, top), "woodDark"),
    solid(box(b.x0, b.x1, b.y0, b.y1, top, b.z1), "woodDark"),
  ];
}

/**
 * A flight of stairs, climbing toward its `faces` (see climbOf) from `climb.from` to `climb.to` (heights
 * relative to its floor; without `climb`, from the box's bottom to the floor above). "solid": masonry from
 * the floor (the ground floor's first flight and landing); otherwise steps on a stringer along the side the
 * camera sees. "landing": a flat slab at the flight's height. A cut (ctx.cut) clips it like the cutaway's
 * partitions, its cut tops in hairline.
 */
function stairs(fx: Fixture, b: Box3, ctx: FixtureContext): Node[] {
  const tokens = (fx.variant ?? "").split(" ");
  const masonry = tokens.includes("solid");
  const from = ctx.z + (fx.climb?.from ?? fx.box.z0);
  const to = ctx.z + (fx.climb?.to ?? ctx.rise ?? fx.box.z1);
  if (tokens.includes("landing")) {
    const z0 = masonry ? b.z0 : Math.max(b.z0, to - 0.2);
    if (ctx.cut !== undefined && z0 >= ctx.cut - 1e-6) return [];
    const cut = ctx.cut !== undefined && to > ctx.cut;
    const lb = box(b.x0, b.x1, b.y0, b.y1, z0, cut ? ctx.cut! : to);
    return [part(lb, boxFaces(lb, { top: c("terracotta", 0, cut ? "h" : ""), front: c(masonry ? "plaster" : "terracotta", 1), right: c(masonry ? "plaster" : "terracotta", 2) }))];
  }
  const dir = climbOf(fx);
  const alongX = dir === "+x" || dir === "-x";
  const sign = dir === "+x" || dir === "+y" ? 1 : -1;
  const lo = alongX ? b.x0 : b.y0;
  const hi = alongX ? b.x1 : b.y1;
  const n = Math.max(2, Math.round((to - from) / 0.19));
  const r = (to - from) / n;
  const run = (hi - lo) / (n - 1);
  const start = sign > 0 ? lo : hi;
  // A box over the run from a to e (either order), the flight's full width, between two heights.
  const span = (a: number, e: number, z0: number, z1: number): Box3 =>
    alongX ? box(Math.min(a, e), Math.max(a, e), b.y0, b.y1, z0, z1) : box(b.x0, b.x1, Math.min(a, e), Math.max(a, e), z0, z1);
  // A point at run position s, a share t across the width, height z.
  const at = (s: number, t: number, z: number): Vec3 => (alongX ? [s, b.y0 + (b.y1 - b.y0) * t, z] : [b.x0 + (b.x1 - b.x0) * t, s, z]);
  // The risers face back down the flight; the faces along it are its sides (plaster on masonry).
  const riser = (face: "front" | "right") => (face === "front" ? dir === "+y" : dir === "-x");
  const side = (face: "front" | "right", tone: 1 | 2) => c(masonry && !riser(face) ? "plaster" : "terracotta", tone);
  const out: Node[] = [];
  for (let k = 1; k < n; k++) {
    const tz = Math.min(from + k * r, b.z1);
    const s0 = start + sign * (k - 1) * run;
    const s1 = s0 + sign * run;
    const z0 = masonry ? b.z0 : Math.max(b.z0, tz - 0.32);
    if (ctx.cut !== undefined && z0 >= ctx.cut - 1e-6) continue;
    const cut = ctx.cut !== undefined && tz > ctx.cut;
    const z1 = cut ? ctx.cut! : tz;
    const sb = span(s0, s1, z0, z1);
    const grout = cut ? [] : [line([at(s0, 1 / 3, z1), at(s1, 1 / 3, z1)], "tg"), line([at(s0, 2 / 3, z1), at(s1, 2 / 3, z1)], "tg")];
    out.push(part(sb, [...boxFaces(sb, { top: c("terracotta", 0, cut ? "h" : ""), front: side("front", 1), right: side("right", 2) }), ...grout]));
  }
  if (masonry) return out;
  // The stringer along the side the camera sees, under the nosings: the flight reads as one piece, not a stack of blocks.
  const slope = r / run;
  const end = start + sign * (n - 1) * run;
  const noseAt = (s: number) => from + Math.abs(s - start) * slope - 0.03;
  const face = alongX ? b.y0 - 0.004 : b.x1 + 0.004;
  const pt = (s: number, z: number): Vec3 => (alongX ? [s, face, z] : [face, s, z]);
  const onFloor = from <= b.z0 + 0.05;
  const outline = clipBelow(
    onFloor
      ? [pt(start, from), pt(end, noseAt(end)), pt(end, noseAt(end) - 0.3), pt(start + (sign * 0.33) / slope, from)]
      : [pt(start, from), pt(end, noseAt(end)), pt(end, noseAt(end) - 0.3), pt(start, from - 0.33)],
    ctx.cut,
  );
  if (outline) {
    const zs = outline.map((q) => q[2]);
    const sb = alongX ? box(Math.min(start, end), Math.max(start, end), face, b.y0, Math.min(...zs), Math.max(...zs)) : box(b.x1, face, Math.min(start, end), Math.max(start, end), Math.min(...zs), Math.max(...zs));
    out.push(part(sb, [poly(outline, c("wood", alongX ? 1 : 2))]));
  }
  return out;
}

function waterDispenser(b: Box3): Node[] {
  const body = box(b.x0, b.x1, b.y0, b.y1, b.z0, b.z0 + 1.1);
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const r = (b.x1 - b.x0) * 0.46;
  const z0 = body.z1;
  const basketBands: Paint[] = [0.33, 0.66].map((t) =>
    screen("tg", (p) => {
      const [x, y] = p.point([cx, cy, z0 + (b.z1 - z0) * t]);
      const rx = r * p.scale * 1.2247;
      const ry = r * p.scale * 0.7071;
      return [
        ["M", x - rx, y],
        ["C", x - rx, y + 0.55 * ry, x - 0.55 * rx, y + ry, x, y + ry],
        ["C", x + 0.55 * rx, y + ry, x + rx, y + 0.55 * ry, x + rx, y],
      ];
    }),
  );
  return [
    decorate(solid(body, "steel"), [
      poly(onFront(b.y0, b.x0 + 0.04, b.x1 - 0.04, b.z0 + 0.08, body.z1 - 0.12), c("slate", 1)),
      poly(onFront(b.y0, b.x0 + 0.08, b.x1 - 0.08, body.z1 - 0.32, body.z1 - 0.24), c("jar", 1, "ns")),
    ]),
    decorate(cylinder(cx, cy, r, z0, b.z1, "bamboo"), basketBands),
  ];
}

function toilet(fx: Fixture, b: Box3): Node[] {
  // Laid out facing -y, then turned for -x or +x.
  const alongX = fx.faces === "-x" || fx.faces === "+x";
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const depth = alongX ? b.x1 - b.x0 : b.y1 - b.y0;
  const width = alongX ? b.y1 - b.y0 : b.x1 - b.x0;
  // In local coordinates: a runs along the width, d from the front (0) to the back (depth).
  const at = (a: number, d: number): Vec2 => (fx.faces === "-x" ? [b.x0 + d, cy + a] : fx.faces === "+x" ? [b.x1 - d, cy + a] : [cx + a, b.y0 + d]);
  const rect = (a0: number, a1: number, d0: number, d1: number, z0: number, z1: number): Box3 => {
    const p = at(a0, d0);
    const q = at(a1, d1);
    return box(p[0], q[0], p[1], q[1], z0, z1);
  };
  const ring: Vec2[] = [];
  for (let i = 0; i < 14; i++) {
    const t = (2 * Math.PI * i) / 14;
    ring.push(at(Math.cos(t) * width * 0.42, depth * 0.4 + Math.sin(t) * depth * 0.32));
  }
  if (fx.faces === "-x") ring.reverse();
  const bowlTop = b.z0 + 0.42;
  return [
    solid(rect(-width * 0.18, width * 0.18, depth * 0.25, depth * 0.62, b.z0, b.z0 + 0.25), "white"),
    part(
      union([rect(-width * 0.42, width * 0.42, depth * 0.08, depth * 0.72, b.z0 + 0.25, bowlTop)]),
      [
        ...prismFaces(ring, b.z0 + 0.25, bowlTop, 16, { top: c("white", 0), front: c("white", 1, "ns"), right: c("white", 2, "ns") }),
        screen(c("white", 2, "h"), (p) => {
          const centre = at(0, depth * 0.4);
          return ellipseOnPlane(
            p,
            [centre[0], centre[1], bowlTop],
            alongX ? [0, width * 0.26, 0] : [width * 0.26, 0, 0],
            alongX ? [depth * 0.2, 0, 0] : [0, depth * 0.2, 0],
          );
        }),
      ],
    ),
    solid(rect(-width * 0.45, width * 0.45, depth * 0.75, depth, b.z0 + 0.35, b.z1), "white"),
  ];
}

/** A hand-wash basin on a wall, under an arched mirror. The mirror shows only on a wall facing the camera (+x). */
function basinWall(fx: Fixture, b: Box3): Node[] {
  const top = b.z0 + 0.2;
  const yc = (b.y0 + b.y1) / 2;
  const out: Node[] = [
    decorate(solid(box(b.x0, b.x1, b.y0, b.y1, b.z0, top), "white"), [
      poly(onTop(top, b.x0 + 0.06, b.x1 - 0.06, b.y0 + 0.06, b.y1 - 0.06), c("white", 2)),
    ]),
  ];
  if (fx.faces === "+x")
    out.push(
      part(box(b.x0, b.x0 + 0.01, b.y0 - 0.02, b.y1 + 0.02, top + 0.25, b.z1), [
        poly(arch("right", b.x0 + 0.01, yc, b.y1 - b.y0 + 0.04, top + 0.25, b.z1, 0.2), c("glass", 2)),
      ]),
    );
  else if (fx.faces === "-y") {
    // On a wall across the house: the arched mirror on the wall behind it, facing the camera.
    const xc = (b.x0 + b.x1) / 2;
    out.push(
      part(box(b.x0 - 0.02, b.x1 + 0.02, b.y1 - 0.01, b.y1, top + 0.25, b.z1), [
        poly(arch("front", b.y1 - 0.01, xc, b.x1 - b.x0 + 0.04, top + 0.25, b.z1, 0.2), c("glass", 1)),
      ]),
    );
  }
  return out;
}

function vessel(b: Box3): Node[] {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const r = (b.x1 - b.x0) / 2;
  return [
    decorate(cylinder(cx, cy, r, b.z0, b.z1, "white"), [screen(c("bathTile", 2), (p) => flatCircle(p, cx, cy, b.z1, r * 0.75))]),
  ];
}

function sinkSmall(b: Box3): Node[] {
  return [decorate(solid(b, "white"), [poly(onTop(b.z1, b.x0 + 0.05, b.x1 - 0.05, b.y0 + 0.05, b.y1 - 0.05), c("white", 2))])];
}

function wallBox(b: Box3, m: MaterialName, faces: Fixture["faces"]): Node[] {
  const paint: Paint[] = [];
  if (faces === "+x") paint.push(line([[b.x1, b.y0 + 0.04, b.z0 + 0.05], [b.x1, b.y1 - 0.04, b.z0 + 0.05]], "h"));
  else if (faces === "-y") paint.push(line([[b.x0 + 0.04, b.y0, b.z0 + 0.05], [b.x1 - 0.04, b.y0, b.z0 + 0.05]], "h"));
  return [decorate(solid(b, m), paint)];
}

function extinguisher(b: Box3): Node[] {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const r = (b.x1 - b.x0) / 2;
  const body = b.z1 - 0.1;
  return [
    decorate(cylinder(cx, cy, r * 0.9, b.z0, body, "red"), [
      screen("n h", (p) => {
        const [x, y] = p.point([cx, cy, body - 0.12]);
        const rx = r * 0.9 * p.scale * 1.2247;
        return [
          ["M", x - rx, y],
          ["C", x - rx * 0.5, y + rx * 0.35, x + rx * 0.5, y + rx * 0.35, x + rx, y],
        ];
      }),
    ]),
    part(box(cx - 0.03, cx + 0.06, cy - 0.03, cy + 0.03, body, b.z1), [
      line([[cx, cy, body], [cx, cy, b.z1 - 0.02], [cx + 0.06, cy - 0.02, b.z1]], "b"),
    ]),
  ];
}

function bin(b: Box3): Node[] {
  const r = (b.x1 - b.x0) / 2;
  return [cylinder((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, r, b.z0, b.z1, "dark")];
}

function staffLockers(fx: Fixture, b: Box3): Node[] {
  const doors = fx.faces === "+x" ? [lines(gridRight(b.x1, b.y0, b.y1, b.z0, b.z1, (b.y1 - b.y0) / 3, (b.z1 - b.z0) / 2), "h")] : [];
  return [decorate(solid(b, "wood"), doors)];
}

/** Cabinet doors (about 50 cm each) along a counter's or cupboard's visible face. */
function doorLines(fx: Fixture, b: Box3, z0: number, z1: number): Paint[] {
  if (fx.faces === "+x") {
    const n = Math.max(1, Math.round((b.y1 - b.y0) / 0.5));
    return [lines(gridRight(b.x1, b.y0, b.y1, z0, z1, (b.y1 - b.y0) / n, 0), "h")];
  }
  if (fx.faces === "-y") {
    const n = Math.max(1, Math.round((b.x1 - b.x0) / 0.5));
    return [lines(gridFront(b.y0, b.x0, b.x1, z0, z1, (b.x1 - b.x0) / n, 0), "h")];
  }
  return [];
}

/** A kitchen counter: dark wooden cabinets under a black granite top (photo gf-08). */
function kitchenCounter(fx: Fixture, b: Box3): Node[] {
  return [decorate(solid(b, "brown", "", { top: "dark" }), doorLines(fx, b, b.z0 + 0.1, b.z1 - 0.06))];
}

/** A closed cupboard: teak (or dark wood, variant "dark"), its doors on the face it turns to, in rows (grid.rows). */
function cupboard(fx: Fixture, b: Box3): Node[] {
  const m: MaterialName = fx.variant?.includes("dark") ? "brown" : "wood";
  const paint = doorLines(fx, b, b.z0 + 0.03, b.z1 - 0.03);
  const rows = fx.grid?.rows ?? 1;
  for (let i = 1; i < rows; i++) {
    const z = b.z0 + ((b.z1 - b.z0) * i) / rows;
    if (fx.faces === "+x") paint.push(line([[b.x1, b.y0, z], [b.x1, b.y1, z]], "h"));
    if (fx.faces === "-y") paint.push(line([[b.x0, b.y0, z], [b.x1, b.y0, z]], "h"));
  }
  return [decorate(solid(b, m), paint)];
}

/**
 * A closed door, flush on a wall (a closet door): a panel on the wall's face, its handles, a small
 * orange sign when it has a label ("Staff Only"). "double": two leaves.
 */
function doorPanel(fx: Fixture, b: Box3): Node[] {
  const alongY = b.x1 - b.x0 < b.y1 - b.y0;
  const [a0, a1] = alongY ? [b.y0, b.y1] : [b.x0, b.x1];
  const face = (u0: number, u1: number, z0: number, z1: number) => (alongY ? onRight(b.x1, u0, u1, z0, z1) : onFront(b.y0, u0, u1, z0, z1));
  const tone = alongY ? 2 : 1;
  const paint: Paint[] = [poly(face(a0, a1, b.z0, b.z1), c("wood", tone, "h"))];
  const handleZ = b.z0 + Math.min(1.0, (b.z1 - b.z0) * 0.55);
  const handles = fx.variant?.includes("double") ? [(a0 + a1) / 2 - 0.05, (a0 + a1) / 2 + 0.02] : [a1 - 0.09];
  if (fx.variant?.includes("double")) {
    const m = (a0 + a1) / 2;
    paint.push(line(alongY ? [[b.x1, m, b.z0], [b.x1, m, b.z1]] : [[m, b.y0, b.z0], [m, b.y0, b.z1]], "h"));
  }
  for (const u of handles) paint.push(poly(face(u, u + 0.03, handleZ, handleZ + 0.08), c("steel", tone, "ns")));
  if (fx.label) {
    const m = a0 + (a1 - a0) * 0.3;
    paint.push(poly(face(m - 0.09, m + 0.09, b.z1 - 0.35, b.z1 - 0.29), c("jar", tone, "ns")));
  }
  return [part(b, paint)];
}

/** The kitchen's fridge: tall, plain, two doors. */
function fridgeTall(b: Box3): Node[] {
  return [decorate(solid(b, "steel"), [line([[b.x1, b.y0, b.z1 - 0.62], [b.x1, b.y1, b.z1 - 0.62]], "h"), line([[b.x0, b.y0, b.z1 - 0.62], [b.x1, b.y0, b.z1 - 0.62]], "h")])];
}

/** Steel shelving: four shelves on corner posts. */
function rack(b: Box3): Node[] {
  const out: Node[] = [];
  for (const [x, y] of [
    [b.x0 + 0.02, b.y0 + 0.02],
    [b.x1 - 0.02, b.y0 + 0.02],
    [b.x1 - 0.02, b.y1 - 0.02],
    [b.x0 + 0.02, b.y1 - 0.02],
  ] as const)
    out.push(stick(x, y, b.z0, b.z1));
  for (let i = 0; i < 4; i++) {
    const z = b.z0 + 0.15 + (i * (b.z1 - b.z0 - 0.15)) / 3;
    out.push(solid(box(b.x0, b.x1, b.y0, b.y1, z - 0.03, z), "steel"));
  }
  return out;
}

/** A ribbed plastic water tank (photo gf-07). */
function waterTank(b: Box3): Node[] {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const r = (b.x1 - b.x0) / 2;
  const ribs: Paint[] = [0.2, 0.4, 0.6, 0.8].map((t) =>
    screen("tg", (p) => {
      const [x, y] = p.point([cx, cy, b.z0 + (b.z1 - b.z0) * t]);
      const rx = r * p.scale * 1.2247;
      const ry = r * p.scale * 0.7071;
      return [
        ["M", x - rx, y],
        ["C", x - rx, y + 0.55 * ry, x - 0.55 * rx, y + ry, x, y + ry],
        ["C", x + 0.55 * rx, y + ry, x + rx, y + 0.55 * ry, x + rx, y],
      ];
    }),
  );
  return [decorate(cylinder(cx, cy, r, b.z0, b.z1, "bamboo"), ribs)];
}

/** A small shrine: a dark table with marigold offerings and a glass of coloured water. */
function shrine(b: Box3): Node[] {
  const top = b.z0 + 0.8;
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  return [
    stick(b.x0 + 0.04, b.y0 + 0.04, b.z0, top - 0.04),
    stick(b.x1 - 0.04, b.y0 + 0.04, b.z0, top - 0.04),
    stick(b.x1 - 0.04, b.y1 - 0.04, b.z0, top - 0.04),
    solid(box(b.x0, b.x1, b.y0, b.y1, top - 0.04, top), "dark"),
    cylinder(cx, cy - 0.12, 0.06, top, Math.min(b.z1, top + 0.3), "jar"),
    cylinder(cx, cy + 0.12, 0.06, top, Math.min(b.z1, top + 0.24), "jar"),
    cylinder(cx + 0.05, cy, 0.035, top, top + 0.12, "sage"),
  ];
}

/** A teak lattice door, on a wall facing the street (the staff room's back door, photo gf-07). */
function latticeDoor(b: Box3): Node[] {
  return [
    part(b, [
      poly(onFront(b.y0, b.x0, b.x1, b.z0, b.z1), c("wood", 1)),
      lines(gridFront(b.y0, b.x0 + 0.04, b.x1 - 0.04, b.z0 + 0.04, b.z1 - 0.04, (b.x1 - b.x0 - 0.08) / 6, (b.z1 - b.z0 - 0.08) / 9), "h"),
    ]),
  ];
}

/** A light in the ceiling: a round downlight, or a strip light (variant "tube"). */
function ceilingLight(fx: Fixture, b: Box3): Node[] {
  if (fx.variant === "tube") return [solid(b, "white", "", { front: "lamp", right: "lamp" })];
  return [cylinder((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.x1 - b.x0) / 2, b.z0, b.z1, "lamp")];
}

/** A track light: a dark rail under the ceiling with two spots hanging from it. */
function trackLight(b: Box3): Node[] {
  const alongX = b.x1 - b.x0 >= b.y1 - b.y0;
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const rail = alongX ? box(b.x0, b.x1, cy - 0.02, cy + 0.02, b.z1 - 0.04, b.z1) : box(cx - 0.02, cx + 0.02, b.y0, b.y1, b.z1 - 0.04, b.z1);
  const spots = [0.25, 0.75].map((t) =>
    cylinder(alongX ? b.x0 + (b.x1 - b.x0) * t : cx, alongX ? cy : b.y0 + (b.y1 - b.y0) * t, 0.04, b.z0, b.z1 - 0.04, "dark", "lamp"),
  );
  return [solid(rail, "dark"), ...spots];
}

// ---------------------------------------------------------------------------
// Doors

function doorLeaf(fx: Fixture, b: Box3): Node[] {
  const alongY = b.x1 - b.x0 < b.y1 - b.y0;
  const m: MaterialName = (fx.variant ?? "").split(" ").includes("dark") ? "brown" : "woodDark";
  const paint: Paint[] = [];
  const signZ = b.z0 + 1.5;
  if (alongY) {
    paint.push(poly(onRight(b.x1, b.y0 + 0.1, b.y1 - 0.1, b.z0 + 0.15, b.z1 - 0.15), c(m, 2, "tg")));
    if (fx.label) paint.push(poly(onRight(b.x1, b.y0 + (fx.label.length > 2 ? 0.25 : 0.38), b.y1 - (fx.label.length > 2 ? 0.25 : 0.38), signZ, signZ + 0.16), c("jar", 2, "ns")));
  } else {
    paint.push(poly(onFront(b.y0, b.x0 + 0.1, b.x1 - 0.1, b.z0 + 0.15, b.z1 - 0.15), c(m, 1, "tg")));
    if (fx.label) paint.push(poly(onFront(b.y0, b.x0 + 0.25, b.x1 - 0.25, signZ, signZ + 0.16), c("jar", 1, "ns")));
  }
  return [decorate(solid(b, m), paint)];
}

// ---------------------------------------------------------------------------
// The dorms

function pod(fx: Fixture, b: Box3): Node[] {
  if (fx.faces === "-y") return podAcross(fx, b);
  const variant = fx.variant ?? "";
  const left = variant.includes("left");
  const upper = variant.includes("upper");
  const open = variant.includes("open");
  const deck = 0.12;
  const end = 0.04;
  const rail = 0.06;
  const zf = b.z0 + deck;
  const out: Node[] = [
    decorate(solid(box(b.x0, b.x1, b.y0, b.y1, b.z0, zf), "woodDark"), []),
    decorate(solid(box(b.x0, b.x1, b.y0, b.y0 + end, zf, b.z1), "wood"), [
      poly(onFront(b.y0, b.x0 + 0.08, b.x1 - 0.08, zf + 0.08, b.z1 - 0.1), c("wood", 1, "tg")),
    ]),
    solid(box(b.x0, b.x1, b.y1 - end, b.y1, zf, b.z1), "wood"),
  ];
  const y0 = b.y0 + end;
  const y1 = b.y1 - end;
  if (upper) {
    const roof = left ? box(b.x0, b.x1 - rail, y0, y1, b.z1 - 0.03, b.z1) : box(b.x0 + rail, b.x1, y0, y1, b.z1 - 0.03, b.z1);
    out.push(solid(roof, "wood"));
  }
  const railBox = left ? box(b.x1 - rail, b.x1, y0, y1, b.z1 - rail, b.z1) : box(b.x0, b.x0 + rail, y0, y1, b.z1 - rail, b.z1);
  out.push(
    decorate(
      solid(railBox, "woodDark"),
      left ? [poly(onRight(b.x1, y0 + 0.75, y0 + 1.05, b.z1 - rail + 0.012, b.z1 - 0.012), c("steel", 2, "ns"))] : [],
    ),
  );
  if (!left) {
    // Against the right party wall. The cutaway's section plane takes the wall and the pods' outer panels with it,
    // so these pods show their insides: the curtain from within, the white mattress and pillow, the reading light.
    const cz1r = b.z1 - rail;
    const bandR = zf + (cz1r - zf) * 0.2;
    const mTop = zf + 0.14;
    out.push(
      part(box(b.x0, b.x0 + 0.03, y0, y1, zf, cz1r), [
        poly(onRight(b.x0 + 0.03, y0, y1, zf, cz1r), c("curtain", 2)),
        poly(onRight(b.x0 + 0.03, y0, y1, zf, bandR), c("curtainBand", 2)),
      ]),
      decorate(solid(box(b.x0 + 0.03, b.x1, y0, y1, zf, mTop), "linen"), [line([[b.x1, y0 + 0.5, mTop], [b.x1, y0 + 0.5, zf + 0.02]], "tg")]),
      // A folded blanket across the middle and the pillow at the back end, against the back panel: a bed, not a shelf.
      solid(box(b.x0 + 0.03, b.x1, (y0 + y1) / 2 - 0.26, (y0 + y1) / 2 + 0.06, mTop, mTop + 0.035), "sage"),
      solid(box(b.x0 + 0.22, b.x1 - 0.1, y1 - 0.42, y1 - 0.06, mTop, mTop + 0.14), "linen"),
      part(box(b.x0 + 0.5, b.x0 + 0.62, y1 - 0.001, y1 - 0.001, cz1r - 0.32, cz1r - 0.22), [
        poly(onFront(y1 - 0.001, b.x0 + 0.5, b.x0 + 0.62, cz1r - 0.32, cz1r - 0.22), c("lamp", 1)),
      ]),
    );
    return out;
  }
  // The aisle side: the woven curtain, grey-brown with a cream band at the bottom.
  const cz1 = b.z1 - rail;
  const band = zf + (cz1 - zf) * 0.2;
  const cy0 = open ? y0 + (y1 - y0) * 0.58 : y0;
  const folds = (from: number, to: number) => {
    const out2: Vec3[][] = [];
    for (let y = from + 0.17; y < to - 0.05; y += 0.17) out2.push([[b.x1, y, zf + 0.02], [b.x1, y, cz1 - 0.02]]);
    return out2;
  };
  out.push(
    part(box(b.x1 - 0.03, b.x1, cy0, y1, zf, cz1), [
      poly(onRight(b.x1, cy0, y1, zf, cz1), c("curtain", 2)),
      poly(onRight(b.x1, cy0, y1, zf, band), c("curtainBand", 2)),
      lines(folds(cy0, y1), "tg"),
    ]),
  );
  if (open) {
    // Through the open curtain: the back wall, the white mattress and pillow, the reading light.
    const mTop = zf + 0.14;
    out.push(
      decorate(solid(box(b.x0, b.x0 + 0.03, y0, cy0, zf, cz1), "wood"), [
        poly(onRight(b.x0 + 0.03, y0 + 0.35, y0 + 0.47, mTop + 0.42, mTop + 0.5), c("lamp", 2)),
      ]),
      solid(box(b.x0 + 0.03, b.x1 - 0.04, y0, cy0, zf, mTop), "linen"),
      solid(box(b.x0 + 0.1, b.x1 - 0.2, y0 + 0.06, y0 + 0.38, mTop, mTop + 0.1), "linen"),
      part(box(b.x1 - 0.03, b.x1, y0, cy0, zf, cz1), [
        poly(onRight(b.x1, y0, y0 + 0.1, zf, cz1), c("curtain", 2)),
        poly(onRight(b.x1, y0, y0 + 0.1, zf, band), c("curtainBand", 2)),
      ]),
    );
  }
  return out;
}

/**
 * A pod lying across the house (the stack just inside the dorm's door), its back against the wall behind it
 * and its curtain on the front, which the camera sees.
 */
function podAcross(fx: Fixture, b: Box3): Node[] {
  const upper = (fx.variant ?? "").includes("upper");
  const deck = 0.12;
  const end = 0.04;
  const rail = 0.06;
  const zf = b.z0 + deck;
  const x0 = b.x0 + end;
  const x1 = b.x1 - end;
  const cz1 = b.z1 - rail;
  const band = zf + (cz1 - zf) * 0.2;
  const folds: Vec3[][] = [];
  for (let x = x0 + 0.17; x < x1 - 0.05; x += 0.17) folds.push([[x, b.y0, zf + 0.02], [x, b.y0, cz1 - 0.02]]);
  const out: Node[] = [
    solid(box(b.x0, b.x1, b.y0, b.y1, b.z0, zf), "woodDark"),
    solid(box(b.x0, b.x1, b.y1 - end, b.y1, zf, b.z1), "wood"),
    solid(box(b.x0, x0, b.y0, b.y1, zf, b.z1), "wood"),
    decorate(solid(box(x1, b.x1, b.y0, b.y1, zf, b.z1), "wood"), [
      poly(onRight(b.x1, b.y0 + 0.08, b.y1 - 0.08, zf + 0.08, b.z1 - 0.1), c("wood", 2, "tg")),
    ]),
  ];
  if (upper) out.push(solid(box(x0, x1, b.y0 + rail, b.y1 - end, b.z1 - 0.03, b.z1), "wood"));
  out.push(
    solid(box(x0, x1, b.y0, b.y0 + rail, cz1, b.z1), "woodDark"),
    part(box(x0, x1, b.y0, b.y0 + 0.03, zf, cz1), [
      poly(onFront(b.y0, x0, x1, zf, cz1), c("curtain", 1)),
      poly(onFront(b.y0, x0, x1, zf, band), c("curtainBand", 1)),
      lines(folds, "tg"),
    ]),
  );
  return out;
}

/** A pod's ladder: two rails and the rungs between them, standing along y (or along x for a pod lying across). */
function ladder(b: Box3): Node[] {
  const alongX = b.x1 - b.x0 > b.y1 - b.y0;
  const t = 0.035;
  const railA = alongX ? box(b.x0, b.x0 + t, b.y0, b.y1, b.z0, b.z1) : box(b.x0, b.x1, b.y1 - t, b.y1, b.z0, b.z1);
  const railB = alongX ? box(b.x1 - t, b.x1, b.y0, b.y1, b.z0, b.z1) : box(b.x0, b.x1, b.y0, b.y0 + t, b.z0, b.z1);
  const out: Node[] = [solid(railA, "wood")];
  for (let z = b.z0 + 0.42; z < b.z1 - 0.2; z += 0.4)
    out.push(solid(alongX ? box(b.x0 + t, b.x1 - t, b.y0 + 0.015, b.y1 - 0.015, z, z + t) : box(b.x0 + 0.015, b.x1 - 0.015, b.y0 + t, b.y1 - t, z, z + t), "wood"));
  out.push(solid(railB, "wood"));
  return out;
}

function locker(fx: Fixture, b: Box3): Node[] {
  const paint: Paint[] = [];
  const yc = (b.y0 + b.y1) / 2;
  if (fx.faces === "+x") {
    paint.push(poly(onRight(b.x1, b.y0 + 0.03, b.y1 - 0.03, b.z0 + 0.03, b.z1 - 0.03), c("wood", 2, "h")));
    paint.push(plateRight(b.x1, yc, b.z1 - 0.2, 0.035, c("steel", 2)));
  } else if (fx.faces === "-y") {
    paint.push(poly(onFront(b.y0, b.x0 + 0.03, b.x1 - 0.03, b.z0 + 0.03, b.z1 - 0.03), c("wood", 1, "h")));
    paint.push(plateFront((b.x0 + b.x1) / 2, b.y0, b.z1 - 0.2, 0.035, c("steel", 1)));
  }
  return [decorate(solid(b, "wood"), paint)];
}

/** A ceiling fan: three solid blades around a small motor, on a rod to the ceiling (not a lamp-like disc). */
function fan(b: Box3, ceiling: number): Node[] {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const r = (b.x1 - b.x0) / 2;
  const z = b.z0 + 0.04;
  const at = (a: number, d: number): Vec3 => [cx + Math.cos(a) * d, cy + Math.sin(a) * d, z];
  const blades = [0, 1, 2].map((k) => {
    const a = (k * 2 * Math.PI) / 3 + 0.4;
    return poly([at(a - 0.35, 0.05), at(a - 0.2, r * 0.97), at(a, r), at(a + 0.2, r * 0.97), at(a + 0.35, 0.05)], c("white", k === 0 ? 1 : 0));
  });
  return [
    part(box(cx - r, cx + r, cy - r, cy + r, z, z), blades),
    cylinder(cx, cy, 0.075, b.z0, b.z0 + 0.1, "white"),
    part(box(cx, cx, cy, cy, b.z0 + 0.1, ceiling), [line([[cx, cy, b.z0 + 0.1], [cx, cy, ceiling]], "o")]),
  ];
}

function fanExhaust(b: Box3): Node[] {
  const xc = (b.x0 + b.x1) / 2;
  const zc = (b.z0 + b.z1) / 2;
  const r = (b.x1 - b.x0) * 0.36;
  return [
    decorate(solid(b, "white"), [
      plateFront(xc, b.y0, zc, r, c("steel", 1)),
      plateFront(xc, b.y0, zc, r * 0.3, c("white", 1)),
    ]),
  ];
}

function shoeCubbies(fx: Fixture, b: Box3): Node[] {
  const cols = fx.grid?.cols ?? 5;
  const rows = fx.grid?.rows ?? 6;
  const t = 0.05;
  const cw = (b.y1 - b.y0 - t) / cols;
  const ch = (b.z1 - b.z0 - t) / rows;
  const paint: Paint[] = [];
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const y0 = b.y0 + t + i * cw;
      const z0 = b.z0 + t + j * ch;
      paint.push(poly(onRight(b.x1, y0, y0 + cw - t, z0, z0 + ch - t), c("shadow", 2)));
      // A few pairs of shoes, seen from the back of the shelves.
      if ((i * 7 + j * 3) % 5 === 1) {
        paint.push(poly(onRight(b.x1, y0 + 0.06, y0 + cw / 2 - 0.02, z0, z0 + 0.08), c("white", 2)));
        paint.push(poly(onRight(b.x1, y0 + cw / 2 + 0.01, y0 + cw - t - 0.06, z0, z0 + 0.08), c("white", 2)));
      }
    }
  return [decorate(solid(b, "dormPlaster"), paint)];
}

function wallLamp(fx: Fixture, b: Box3): Node[] {
  const zc = (b.z0 + b.z1) / 2;
  const glow: Vec3[] = [];
  if (fx.faces === "-y") {
    // On a wall facing the street: the wall is at y1, the lamp stands out toward -y.
    const xc = (b.x0 + b.x1) / 2;
    for (let i = 0; i < 16; i++) {
      const t = (2 * Math.PI * i) / 16;
      glow.push([xc + Math.cos(t) * 0.55, b.y1 - 0.005, zc + Math.sin(t) * 0.42]);
    }
    return [
      part(box(xc - 0.55, xc + 0.55, b.y1 - 0.005, b.y1, zc - 0.42, zc + 0.42), [poly(glow, "gw")]),
      decorate(solid(box(b.x0, b.x1, b.y0, b.y1 - 0.005, b.z0, b.z1), "dark"), [poly(onFront(b.y0, b.x0 + 0.04, b.x1 - 0.04, b.z0 + 0.06, b.z1 - 0.06), c("lamp", 1))]),
    ];
  }
  const yc = (b.y0 + b.y1) / 2;
  for (let i = 0; i < 16; i++) {
    const t = (2 * Math.PI * i) / 16;
    glow.push([b.x0 + 0.005, yc + Math.cos(t) * 0.55, zc + Math.sin(t) * 0.42]);
  }
  return [
    part(box(b.x0, b.x0 + 0.005, yc - 0.55, yc + 0.55, zc - 0.42, zc + 0.42), [poly(glow, "gw")]),
    decorate(solid(box(b.x0 + 0.005, b.x1, b.y0, b.y1, b.z0, b.z1), "dark"), [
      poly(onRight(b.x1, b.y0 + 0.04, b.y1 - 0.04, b.z0 + 0.06, b.z1 - 0.06), c("lamp", 2)),
    ]),
  ];
}

/** A pendant lamp: a jar-orange dome on a cord from the ceiling, its light falling in a soft cone below (as in house.svg). */
function pendantLamp(b: Box3): Node[] {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const r = (b.x1 - b.x0) / 2;
  const domeH = 0.16;
  const base = b.z0 + 0.02;
  const shape = (p: Projection) => {
    const [x, y] = p.point([cx, cy, base]);
    const rx = r * p.scale * 1.2247;
    const h = domeH * p.scale;
    return { x, y, rx, h };
  };
  return [
    part(b, [
      screen("gw", (p) => {
        const { x, y, rx } = shape(p);
        const down = 0.85 * p.scale;
        return [["M", x - rx * 0.6, y], ["L", x - rx * 2.1, y + down], ["L", x + rx * 2.1, y + down], ["L", x + rx * 0.6, y], ["Z"]];
      }),
      line([[cx, cy, base + domeH], [cx, cy, b.z1]], "h"),
      screen(c("jar", 1), (p) => {
        const { x, y, rx, h } = shape(p);
        return [
          ["M", x - rx, y],
          ["C", x - rx, y - h * 0.75, x - rx * 0.45, y - h, x, y - h],
          ["C", x + rx * 0.45, y - h, x + rx, y - h * 0.75, x + rx, y],
          ["Z"],
        ];
      }),
      screen(c("lamp", 0, "h"), (p) => {
        const { x, y, rx } = shape(p);
        return [["M", x - rx * 0.8, y], ["C", x - rx * 0.4, y + rx * 0.22, x + rx * 0.4, y + rx * 0.22, x + rx * 0.8, y], ["Z"]];
      }),
    ]),
  ];
}

/** The front desk's printer on a low wooden stand. */
function printer(b: Box3): Node[] {
  const standTop = b.z0 + 0.7;
  const i = 0.03;
  const leg = (x: number, y: number) => solid(box(x, x + 0.04, y, y + 0.04, b.z0, standTop - 0.04), "woodDark");
  const body = box(b.x0 + 0.04, b.x1 - 0.04, b.y0 + 0.02, b.y1 - 0.02, standTop, b.z1);
  return [
    leg(b.x0 + i, b.y1 - i - 0.04),
    leg(b.x0 + i, b.y0 + i),
    leg(b.x1 - i - 0.04, b.y1 - i - 0.04),
    leg(b.x1 - i - 0.04, b.y0 + i),
    solid(box(b.x0, b.x1, b.y0, b.y1, standTop - 0.04, standTop), "wood"),
    decorate(solid(body, "dark"), [
      poly(onTop(body.z1, body.x0 + 0.06, body.x1 - 0.06, body.y0 + 0.04, body.y1 - 0.04), c("dark", 2)),
      line([[body.x1, body.y0 + 0.04, body.z0 + 0.08], [body.x1, body.y1 - 0.04, body.z0 + 0.08]], "h"),
    ]),
  ];
}

// ---------------------------------------------------------------------------
// The bathrooms

function vanity(b: Box3): Node[] {
  const s = 0.3;
  return [
    decorate(solid(b, "bathTile"), [
      lines(gridTop(b.z1, b.x0, b.x1, b.y0, b.y1, 0, s), "tg"),
      lines(gridRight(b.x1, b.y0, b.y1, b.z0, b.z1, s, s), "tg"),
      lines(gridFront(b.y0, b.x0, b.x1, b.z0, b.z1, 0, s), "tg"),
    ]),
  ];
}

function ladderWall(b: Box3): Node[] {
  const out: Node[] = [solid(box(b.x0, b.x1, b.y1 - 0.04, b.y1, b.z0, b.z1), "woodDark")];
  for (let z = b.z0 + 0.35; z < b.z1 - 0.1; z += 0.35) out.push(solid(box(b.x0 + 0.03, b.x1 - 0.03, b.y0 + 0.04, b.y1 - 0.04, z, z + 0.04), "woodDark"));
  out.push(solid(box(b.x0, b.x1, b.y0, b.y0 + 0.04, b.z0, b.z1), "woodDark"));
  return out;
}

function stall(fx: Fixture, b: Box3): Node[] {
  const t = 0.05;
  const front = box(b.x0, b.x1 - t, b.y0, b.y0 + t, b.z0, b.z1);
  const dx0 = b.x0 + 0.1;
  const dx1 = b.x1 - t - 0.12;
  const doorTop = b.z0 + 1.95;
  const door: Vec3[] = onFront(b.y0, dx0, dx1, b.z0 + 0.04, doorTop);
  const side = decorate(solid(box(b.x1 - t, b.x1, b.y0, b.y1, b.z0, b.z1), "bathTile"), [line([[b.x1, b.y0, b.z0 + 1.2], [b.x1, b.y1, b.z0 + 1.2]], "tg")]);
  if (fx.variant === "cut") {
    // Cut open low (70 cm), as the cutaway cuts the facade, its cut tops in hairline: the toilet inside shows.
    const cut = b.z0 + 0.7;
    const panel = (pb: Box3) => part(pb, boxFaces(pb, { top: c("bathTile", 0, "h"), front: c("bathTile", 1), right: c("bathTile", 2) }));
    return [
      panel(box(b.x1 - t, b.x1, b.y0, b.y1, b.z0, cut)),
      decorate(panel(box(b.x0, b.x1 - t, b.y0, b.y0 + t, b.z0, cut)), [poly(onFront(b.y0, dx0, dx1, b.z0 + 0.04, cut), c("steel", 1))]),
    ];
  }
  return [
    side,
    decorate(solid(front, "bathTile"), [
      line([[b.x0, b.y0, b.z0 + 1.2], [b.x1 - t, b.y0, b.z0 + 1.2]], "tg"),
      poly(door, c("steel", 1)),
      poly(onFront(b.y0, b.x0 + 0.24, b.x1 - t - 0.26, b.z0 + 1.5, b.z0 + 1.62), c("jar", 1, "ns")),
      line([[b.x1 - t - 0.2, b.y0, b.z0 + 0.95], [b.x1 - t - 0.17, b.y0, b.z0 + 0.95]], "b"),
    ]),
  ];
}

function shower(b: Box3): Node[] {
  const t = 0.04;
  const yc = (b.y0 + b.y1) / 2;
  return [
    // The hot-water heater on the left wall, and the shower head.
    decorate(solid(box(b.x0, b.x0 + 0.08, yc - 0.13, yc + 0.13, b.z0 + 1.45, b.z0 + 1.85), "slate"), [
      poly(onRight(b.x0 + 0.08, yc - 0.06, yc + 0.06, b.z0 + 1.62, b.z0 + 1.72), c("lamp", 2, "ns")),
    ]),
    part(box(b.x0, b.x0 + 0.25, yc - 0.4, yc - 0.3, b.z0 + 1.3, b.z0 + 1.65), [
      line([[b.x0, yc - 0.35, b.z0 + 1.6], [b.x0 + 0.2, yc - 0.35, b.z0 + 1.6], [b.x0 + 0.22, yc - 0.35, b.z0 + 1.45]], "b"),
    ]),
    decorate(solid(box(b.x0, b.x1 - t, b.y1 - t, b.y1, b.z0, b.z1), "bathTile"), []),
    decorate(solid(box(b.x0, b.x1 - t, b.y0, b.y0 + t, b.z0, b.z1), "bathTile"), [line([[b.x0, b.y0, b.z0 + 1.2], [b.x1 - t, b.y0, b.z0 + 1.2]], "tg")]),
    decorate(solid(box(b.x1 - t, b.x1, b.y0, b.y1, b.z0, b.z1), "bathTile"), [
      poly(onRight(b.x1, b.y0 + 0.1, b.y1 - 0.1, b.z0 + 0.04, b.z0 + 1.95), c("white", 2)),
      poly(onRight(b.x1, b.y0 + 0.28, b.y1 - 0.28, b.z0 + 1.5, b.z0 + 1.62), c("jar", 2, "ns")),
      line([[b.x1, b.y0 + 0.2, b.z0 + 0.95], [b.x1, b.y0 + 0.24, b.z0 + 0.95]], "b"),
    ]),
  ];
}

// ---------------------------------------------------------------------------

/**
 * The isometric parts of a fixture, in absolute metres, or [] when the view
 * does not show it. ceiling is the absolute height of its floor's ceiling.
 */
export function isoParts(fx: Fixture, ctx: FixtureContext, ceiling: number): Node[] {
  const b: Box3 = { ...fx.box, z0: fx.box.z0 + ctx.z, z1: fx.box.z1 + ctx.z };
  if (ctx.cut !== undefined && b.z0 >= ctx.cut - 1e-6) return [];
  if (ctx.detail === "simple") {
    const parts = simpleParts(fx, b, ctx, ceiling);
    if (parts) return parts;
  }
  switch (fx.type) {
    case "door":
      return frontDoor(fx, b, ctx);
    case "window":
      return fx.variant === "shopfront" ? shopWindow(fx, b, ctx) : upperWindow(b, ctx);
    case "ac-outdoor":
      // It hangs on the part of the facade the cutaway takes away.
      return ctx.cut !== undefined && b.z1 > ctx.cut ? [] : acOutdoor(b);
    case "awning":
      return awning(b);
    case "post":
      return post(b, ctx);
    case "sign-hostel":
      return signHostel(b);
    case "sign-hanging":
      return signHanging(b);
    case "bench":
      return bench(b);
    case "table-small-round":
      return roundTop(b, "wood", 0.05, { spread: 0.52, stretcher: 0.35 });
    case "table-tall-round":
      return roundTop(b, "wood", 0.05, { spread: 0.55, stretcher: 0.3 });
    case "stool-low":
      return roundTop(b, "wood", 0.05, { spread: 0.55, stretcher: 0.4 });
    case "stool-bar":
      return roundTop(b, "wood", 0.05, { spread: 0.55, stretcher: 0.35 });
    case "plant":
      return plant(b);
    case "doormat":
      return doormat(b);
    case "window-ledge":
      return windowLedge(b);
    case "table":
      return table(b);
    case "chair":
      return chair(fx, b);
    case "bench-seat":
      return benchSeat(b);
    case "jar-big":
      return jar(b, BIG_JAR, 3);
    case "jar-clay":
      return jar(b, TALL_JAR, 3);
    case "ac-indoor":
      return acIndoor(fx, b);
    case "counter":
      return counter(b);
    case "back-counter":
      return backCounter(b);
    case "sink":
      return sink(b);
    case "coffee-machine":
      return coffeeMachine(b);
    case "shelves":
      return shelves(fx, b);
    case "fridge-drinks":
      return fridge(b);
    case "dehumidifier":
      return dehumidifier(b);
    case "luggage-space":
      return outline(b, "dl");
    case "stairs":
      return stairs(fx, b, ctx);
    case "water-dispenser":
      return waterDispenser(b);
    case "bin":
      return bin(b);
    case "toilet":
      return toilet(fx, b);
    case "sink-small":
      return sinkSmall(b);
    case "basin":
      return fx.variant === "vessel" ? vessel(b) : basinWall(fx, b);
    case "hand-dryer":
    case "hair-dryer":
      return wallBox(b, "white", fx.faces);
    case "extinguisher":
      return extinguisher(b);
    case "staff-lockers":
      return staffLockers(fx, b);
    case "kitchen-counter":
      return kitchenCounter(fx, b);
    case "door-leaf":
      return doorLeaf(fx, b);
    case "pod":
      return pod(fx, b);
    case "ladder":
      return ladder(b);
    case "locker":
      return locker(fx, b);
    case "fan-ceiling":
    case "fan":
      return fan(b, ceiling);
    case "fan-exhaust":
      return fanExhaust(b);
    case "shoe-cubbies":
      return shoeCubbies(fx, b);
    case "wall-lamp":
      return wallLamp(fx, b);
    case "cupboard":
      return cupboard(fx, b);
    case "door-panel":
      return doorPanel(fx, b);
    case "fridge":
      return fridgeTall(b);
    case "rack":
      return rack(b);
    case "water-tank":
      return waterTank(b);
    case "fuse-box":
    case "picture-frame":
      return wallBox(b, fx.type === "fuse-box" ? "white" : "wood", fx.faces);
    case "shrine":
      return shrine(b);
    case "lattice-door":
      return latticeDoor(b);
    case "ceiling-light":
      return ceilingLight(fx, b);
    case "track-light":
      return trackLight(b);
    case "vanity":
      return vanity(b);
    case "ladder-wall":
      return ladderWall(b);
    case "toilet-stall":
      return stall(fx, b);
    case "shower":
      return shower(b);
    case "mirror":
      return [part(b, [poly(arch("right", b.x0, (b.y0 + b.y1) / 2, b.y1 - b.y0, b.z0, b.z1), c("glass", 2))])];
    case "sign-plate":
      return [solid(b, "paper")];
    case "pendant-lamp":
      return pendantLamp(b);
    case "printer":
      return printer(b);
  }
}

// ---------------------------------------------------------------------------
// The paper outfit's simple detail: each fixture in fewer, flatter pieces (sheets of paper), with inner
// detail ("id": window bars, cords, curtain folds) and sticks of ink ("sk": legs, rods) as the only lines.

/** The silhouettes of several boxes as one shape (pillows, rails): one fill, one element. */
function hulls(boxes: readonly Box3[], cls: string): Paint {
  return screen(cls, (p) => boxes.flatMap((b) => outlineCmds(boxOutline(b, cls), p)));
}

function outlineCmds(paint: Paint, p: Projection): readonly Cmd[] {
  return paint.t === "screen" ? paint.build(p) : [];
}

/** Several round plates on one plane, as one shape. */
function plates(plane: "front" | "right", at: number, centres: readonly (readonly [number, number])[], r: number, cls: string): Paint {
  return screen(cls, (p) =>
    centres.flatMap(([a, z]) => (plane === "front" ? ellipseOnPlane(p, [a, at, z], [r, 0, 0], [0, 0, r]) : ellipseOnPlane(p, [at, a, z], [0, r, 0], [0, 0, r]))),
  );
}

/** The side and the top of a short upright cylinder (a stool's seat, a table's round top). */
function drum(cx: number, cy: number, r: number, z0: number, z1: number, m: MaterialName): Paint[] {
  const k = 0.5523;
  return [
    screen(c(m, 1), (p) => {
      const rx = r * p.scale * Math.SQRT2 * Math.cos(Math.PI / 6);
      const ry = r * p.scale * Math.SQRT2 * 0.5;
      const [bx, by] = p.point([cx, cy, z0]);
      const [, ty] = p.point([cx, cy, z1]);
      return [
        ["M", bx - rx, ty],
        ["L", bx - rx, by],
        ["C", bx - rx, by + k * ry, bx - k * rx, by + ry, bx, by + ry],
        ["C", bx + k * rx, by + ry, bx + rx, by + k * ry, bx + rx, by],
        ["L", bx + rx, ty],
        ["C", bx + rx, ty + k * ry, bx + k * rx, ty + ry, bx, ty + ry],
        ["C", bx - k * rx, ty + ry, bx - rx, ty + k * ry, bx - rx, ty],
        ["Z"],
      ];
    }),
    screen(c(m, 0), (p) => flatCircle(p, cx, cy, z1, r)),
  ];
}

/** Upright lines between two heights at points of the plan: legs, posts, rods. */
function sticks(points: readonly (readonly [number, number])[], z0: number, z1: number): Paint {
  return lines(points.map(([x, y]) => [[x, y, z0], [x, y, z1]] as Vec3[]), "sk");
}

/**
 * A pod: a teak box. Its side toward the camera shows the woven curtain with its cream band, a few folds
 * and the reading lamp's dot, or (a few upper pods, drawn half open) the bed behind the curtain; the pods
 * against the right wall, which the cutaway takes away with their outer panels, show their beds.
 */
/** The paper pod's frame: the deck under the bed, the rail over the curtain, the ends (metres). */
export const PAPER_POD = { deck: 0.12, end: 0.05, rail: 0.07 } as const;

function paperPod(fx: Fixture, b: Box3): Node[] {
  const variant = fx.variant ?? "";
  const { deck, end, rail } = PAPER_POD;
  const zf = b.z0 + deck;
  const zc = b.z1 - rail;
  const band = zf + (zc - zf) * 0.2;
  const lamp = zc - 0.15;
  const paint: Paint[] = boxFaces(b, { top: c("wood", 0), front: c("wood", 1), right: c("wood", 2) });
  if (fx.faces === "-y") {
    const x0 = b.x0 + end;
    const x1 = b.x1 - end;
    const folds: Vec3[][] = [];
    for (let x = x0 + 0.3; x < x1 - 0.1; x += 0.3) folds.push([[x, b.y0, band], [x, b.y0, zc - 0.03]]);
    paint.push(
      poly(onFront(b.y0, x0, x1, zf, zc), c("curtain", 1)),
      poly(onFront(b.y0, x0, x1, zf, band), c("curtainBand", 1)),
      lines(folds, "id"),
      plates("front", b.y0, [[x1 - 0.2, lamp]], 0.05, c("lamp", 1)),
    );
    return [part(b, paint)];
  }
  const y0 = b.y0 + end;
  const y1 = b.y1 - end;
  if (variant.includes("left")) {
    const open = variant.includes("open");
    const cy0 = open ? y0 + (y1 - y0) * 0.55 : y0;
    const folds: Vec3[][] = [];
    for (let y = cy0 + 0.3; y < y1 - 0.1; y += 0.3) folds.push([[b.x1, y, band], [b.x1, y, zc - 0.03]]);
    if (open)
      paint.push(
        poly(onRight(b.x1, y0, cy0, zf, zc), c("shadow", 2)),
        poly(onRight(b.x1, y0, cy0, zf, zf + 0.15), c("linen", 2)),
        poly(onRight(b.x1, y0 + 0.06, y0 + 0.42, zf + 0.15, zf + 0.27), c("linen", 1)),
      );
    paint.push(
      poly(onRight(b.x1, cy0, y1, zf, zc), c("curtain", 2)),
      poly(onRight(b.x1, cy0, y1, zf, band), c("curtainBand", 2)),
      lines(folds, "id"),
      plates("right", b.x1, [[open ? y0 + 0.62 : y1 - 0.22, lamp]], 0.05, c("lamp", 2)),
    );
    return [part(b, paint)];
  }
  const mid = (y0 + y1) / 2;
  paint.push(
    poly(onRight(b.x1, y0, y1, zf, zc), c("shadow", 2)),
    poly(onRight(b.x1, y0, y1, zf, zf + 0.15), c("linen", 2)),
    poly(onRight(b.x1, mid - 0.35, mid + 0.1, zf + 0.15, zf + 0.2), c("sage", 2)),
    poly(onRight(b.x1, y1 - 0.45, y1 - 0.08, zf + 0.15, zf + 0.29), c("linen", 1)),
    plates("right", b.x1, [[y1 - 0.25, lamp]], 0.05, c("lamp", 2)),
  );
  return [part(b, paint)];
}

/** A ladder: its two rails as thin sheets, its rungs as sticks between them. */
function paperLadder(b: Box3): Node[] {
  const alongX = b.x1 - b.x0 > b.y1 - b.y0;
  const t = 0.035;
  const railA = alongX ? box(b.x0, b.x0 + t, b.y0, b.y1, b.z0, b.z1) : box(b.x0, b.x1, b.y1 - t, b.y1, b.z0, b.z1);
  const railB = alongX ? box(b.x1 - t, b.x1, b.y0, b.y1, b.z0, b.z1) : box(b.x0, b.x1, b.y0, b.y0 + t, b.z0, b.z1);
  const xm = (b.x0 + b.x1) / 2;
  const ym = (b.y0 + b.y1) / 2;
  const rungs: Vec3[][] = [];
  for (let z = b.z0 + 0.42; z < b.z1 - 0.2; z += 0.4) rungs.push(alongX ? [[b.x0 + t, ym, z], [b.x1 - t, ym, z]] : [[xm, b.y0 + t, z], [xm, b.y1 - t, z]]);
  return [part(b, [boxOutline(railA, c("wood", 1)), lines(rungs, "sk"), boxOutline(railB, c("wood", 1))])];
}

/** A wall ladder (to the bathroom's hatch): two rails against the wall, rungs between. */
function paperLadderWall(b: Box3): Node[] {
  const railA = box(b.x0, b.x1, b.y1 - 0.04, b.y1, b.z0, b.z1);
  const railB = box(b.x0, b.x1, b.y0, b.y0 + 0.04, b.z0, b.z1);
  const rungs: Vec3[][] = [];
  for (let z = b.z0 + 0.35; z < b.z1 - 0.1; z += 0.35) rungs.push([[b.x1 - 0.03, b.y0 + 0.04, z], [b.x1 - 0.03, b.y1 - 0.04, z]]);
  return [part(b, [boxOutline(railA, c("woodDark", 1)), lines(rungs, "sk"), boxOutline(railB, c("woodDark", 1))])];
}

/**
 * A locker, as one block for its whole stack: the lowest locker of a stack draws the block, its doors split
 * as inner detail with a number plate each; the lockers above keep their (empty) groups and ids.
 */
function paperLocker(fx: Fixture, b: Box3, ctx: FixtureContext): Node[] {
  const f = fx.box;
  const stack = (ctx.siblings ?? []).filter((g) => g.type === "locker" && g.box.x0 < f.x1 && f.x0 < g.box.x1 && g.box.y0 < f.y1 && f.y0 < g.box.y1);
  if (!stack.includes(fx)) stack.push(fx);
  const low = Math.min(...stack.map((g) => g.box.z0));
  const high = Math.max(...stack.map((g) => g.box.z1));
  if (f.z0 > low + 1e-6) return [part(b, [])];
  const block = box(b.x0, b.x1, b.y0, b.y1, b.z0, ctx.z + high);
  const tops = stack.map((g) => ctx.z + g.box.z1).filter((z) => z < block.z1 - 1e-6);
  const paint: Paint[] = boxFaces(block, { top: c("wood", 0), front: c("wood", 1), right: c("wood", 2) });
  if (fx.faces === "+x") {
    paint.push(lines(tops.map((z) => [[b.x1, b.y0 + 0.03, z], [b.x1, b.y1 - 0.03, z]]), "id"));
    paint.push(plates("right", b.x1, stack.map((g) => [(b.y0 + b.y1) / 2, ctx.z + g.box.z1 - 0.2] as const), 0.04, c("steel", 2)));
  } else if (fx.faces === "-y") {
    paint.push(lines(tops.map((z) => [[b.x0 + 0.03, b.y0, z], [b.x1 - 0.03, b.y0, z]]), "id"));
    paint.push(plates("front", b.y0, stack.map((g) => [(b.x0 + b.x1) / 2, ctx.z + g.box.z1 - 0.2] as const), 0.04, c("steel", 1)));
  }
  return [part(block, paint)];
}

function paperChair(fx: Fixture, b: Box3): Node[] {
  const seat = b.z0 + 0.45;
  const backAtFront = fx.faces === "+y";
  const back = backAtFront ? box(b.x0, b.x1, b.y0, b.y0 + 0.04, seat, b.z1) : box(b.x0, b.x1, b.y1 - 0.04, b.y1, seat, b.z1);
  const a = 0.03;
  const top = box(b.x0, b.x1, b.y0, b.y1, seat - 0.04, seat);
  return [
    part(box(b.x0, b.x1, b.y0, b.y1, b.z0, seat - 0.04), [
      sticks(
        [
          [b.x0 + a, b.y1 - a],
          [b.x1 - a, b.y1 - a],
          [b.x0 + a, b.y0 + a],
          [b.x1 - a, b.y0 + a],
        ],
        b.z0,
        seat - 0.04,
      ),
    ]),
    part(top, [boxOutline(top, c("wood", 0))]),
    part(back, [boxOutline(back, c("woodDark", 1))]),
  ];
}

/** The legs of a rectangular top, as sticks, a little in from its corners. */
function cornerSticks(b: Box3, inset: number, z0: number, z1: number): Paint {
  return sticks(
    [
      [b.x0 + inset, b.y1 - inset],
      [b.x1 - inset, b.y1 - inset],
      [b.x0 + inset, b.y0 + inset],
      [b.x1 - inset, b.y0 + inset],
    ],
    z0,
    z1,
  );
}

function paperTable(b: Box3): Node[] {
  const t = 0.05;
  const top = box(b.x0, b.x1, b.y0, b.y1, b.z1 - t, b.z1);
  return [part(b, [cornerSticks(b, 0.06, b.z0, b.z1 - t), ...boxFaces(top, { top: c("wood", 0), front: c("wood", 1), right: c("wood", 2) })])];
}

function paperBench(b: Box3): Node[] {
  const top = b.z1 - 0.07;
  const seat = box(b.x0, b.x1, b.y0, b.y1, top, b.z1);
  return [part(b, [cornerSticks(b, 0.08, b.z0, top), ...boxFaces(seat, { top: c("wood", 0), front: c("wood", 1), right: c("wood", 2) })])];
}

function paperBenchSeat(b: Box3): Node[] {
  const base = b.z0 + 0.35;
  const seat = b.z0 + 0.45;
  const len = b.y1 - b.y0;
  const pillows: Box3[] = [];
  for (let i = 0; i < 3; i++) {
    const yc = b.y0 + (len * (i + 0.5)) / 3;
    pillows.push(box(b.x1 - 0.2, b.x1 - 0.03, yc - 0.3, yc + 0.3, seat, b.z1));
  }
  return [
    solid(box(b.x0, b.x1, b.y0, b.y1, b.z0, base), "plaster"),
    solid(box(b.x0 + 0.02, b.x1, b.y0 + 0.02, b.y1 - 0.02, base, seat), "cushion"),
    part(box(b.x1 - 0.2, b.x1 - 0.03, b.y0, b.y1, seat, b.z1), [hulls(pillows, c("pillow", 1))]),
  ];
}

/** A round table or stool: a drum of a top on sticks. */
function paperRoundTop(b: Box3, spread: number): Node[] {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const r = (b.x1 - b.x0) / 2;
  const a = r * spread;
  const top = b.z1 - 0.05;
  return [
    part(box(cx - a, cx + a, cy - a, cy + a, b.z0, top), [
      sticks(
        [
          [cx - a, cy + a],
          [cx + a, cy + a],
          [cx - a, cy - a],
          [cx + a, cy - a],
        ],
        b.z0,
        top,
      ),
    ]),
    part(box(cx - r, cx + r, cy - r, cy + r, top, b.z1), drum(cx, cy, r, top, b.z1, "wood")),
  ];
}

function paperPlant(b: Box3): Node[] {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const r = Math.min(b.x1 - b.x0, b.y1 - b.y0) / 2;
  const potH = Math.min(0.32, (b.z1 - b.z0) * 0.38);
  const potTop = b.z0 + potH;
  const pot: readonly (readonly [number, number])[] = [
    [r * 0.62, 0],
    [r * 0.8, potH * 0.85],
    [r * 0.9, potH],
  ];
  const leafLen = b.z1 - potTop;
  const leaves: readonly (readonly [number, number])[] = [
    [-62, 0.62],
    [48, 0.66],
    [-30, 0.92],
    [22, 0.96],
    [-8, 1],
    [70, 0.5],
    [-80, 0.48],
  ];
  const leafCmds = (p: Projection, list: readonly (readonly [number, number])[]): Cmd[] =>
    list.flatMap(([deg, len]): Cmd[] => {
      const [x0, y0] = p.point([cx, cy, potTop]);
      const L = leafLen * p.scale * len;
      const a = (deg * Math.PI) / 180;
      const tip: Vec2 = [x0 + Math.sin(a) * L, y0 - Math.cos(a) * L];
      const w = L * 0.22;
      const mid: Vec2 = [(x0 + tip[0]) / 2, (y0 + tip[1]) / 2];
      return [
        ["M", x0, y0],
        ["Q", mid[0] - Math.cos(a) * w, mid[1] - Math.sin(a) * w, tip[0], tip[1]],
        ["Q", mid[0] + Math.cos(a) * w, mid[1] + Math.sin(a) * w, x0, y0],
        ["Z"],
      ];
    });
  return [
    part(box(cx - r, cx + r, cy - r, cy + r, b.z0, potTop), [
      screen(c("terracotta", 1), (p) => turned(p, cx, cy, b.z0, pot).body),
      screen(c("shadow", 0), (p) => turned(p, cx, cy, b.z0, pot, 0.85).rim),
    ]),
    part(box(cx - r, cx + r, cy - r, cy + r, potTop, b.z1), [
      screen(c("sage", 1), (p) => leafCmds(p, leaves.filter(([deg]) => deg <= 0))),
      screen(c("sage", 2), (p) => leafCmds(p, leaves.filter(([deg]) => deg > 0))),
    ]),
  ];
}

/** A glazed door: its frame, its panes as one sheet of glass, a handle. */
function paperDoor(fx: Fixture, b: Box3, ctx: FixtureContext): Node[] {
  const cols = fx.grid?.cols ?? 2;
  const rows = fx.grid?.rows ?? 6;
  const y = b.y0;
  const bar = 0.05;
  const frame = under(onFront(y, b.x0, b.x1, b.z0, b.z1), ctx.cut);
  if (!frame) return [];
  const pw = (b.x1 - b.x0 - bar) / cols;
  const ph = (b.z1 - b.z0 - bar) / rows;
  const panes: Vec3[][] = [];
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const pane = under(onFront(y, b.x0 + bar + i * pw, b.x0 + (i + 1) * pw, b.z0 + bar + j * ph, b.z0 + (j + 1) * ph), ctx.cut);
      if (pane) panes.push(pane);
    }
  const paint: Paint[] = [poly(frame, c("copper", 1)), shapes(panes, c("glass", 1))];
  const handle = under([[b.x1 - 0.12, y, b.z0 + 0.95], [b.x1 - 0.12, y, b.z0 + 1.15]], ctx.cut);
  if (handle && handle[1]![2] > handle[0]![2]) paint.push(line(handle, "sk"));
  return [part({ ...b, z1: ctx.cut !== undefined ? Math.min(b.z1, ctx.cut) : b.z1 }, paint)];
}

function paperShopWindow(fx: Fixture, b: Box3, ctx: FixtureContext): Node[] {
  const cols = fx.grid?.cols ?? 4;
  const rows = fx.grid?.rows ?? 3;
  const sill = b.z0 + 0.95;
  const out: Node[] = [solid(box(b.x0, b.x1, b.y0 + 0.05, b.y1, b.z0, sill), "facadeDeep")];
  const gy = b.y0 + 0.07;
  const frame = under(onFront(gy, b.x0, b.x1, sill, b.z1), ctx.cut);
  if (frame) {
    const bar = 0.05;
    const pw = (b.x1 - b.x0 - bar) / cols;
    const ph = (b.z1 - sill - bar) / rows;
    const panes: Vec3[][] = [];
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const pane = under(onFront(gy, b.x0 + bar + i * pw, b.x0 + (i + 1) * pw, sill + bar + j * ph, sill + (j + 1) * ph), ctx.cut);
        if (pane) panes.push(pane);
      }
    out.push(part(box(b.x0, b.x1, gy, gy, sill, ctx.cut !== undefined ? Math.min(ctx.cut, b.z1) : b.z1), [poly(frame, c("copper", 1)), shapes(panes, c("glass", 1))]));
  }
  // The bamboo blind, rolled down over the top third, and its roll.
  const blind = under(onFront(b.y0 + 0.04, b.x0 + 0.04, b.x1 - 0.04, b.z1 - 0.62, b.z1 - 0.05), ctx.cut);
  const roll = cutBox(box(b.x0 + 0.02, b.x1 - 0.02, b.y0, b.y0 + 0.04, b.z1 - 0.08, b.z1), ctx.cut);
  if (blind) out.push(part(box(b.x0 + 0.04, b.x1 - 0.04, b.y0 + 0.04, b.y0 + 0.04, b.z1 - 0.62, b.z1 - 0.05), [poly(blind, c("bamboo", 1))]));
  if (roll) out.push(part(roll, [boxOutline(roll, c("bamboo", 0))]));
  return out;
}

function paperAcOutdoor(b: Box3): Node[] {
  const w = b.x1 - b.x0;
  const h = b.z1 - b.z0;
  return [decorate(solid(b, "white"), [plates("front", b.y0, [[b.x0 + w * 0.4, b.z0 + h / 2]], h * 0.36, c("steel", 1))])];
}

/** The hanging "House of Jars" board: two rods, the board, its paper face with the arch and two lines of lettering. */
function paperSignHanging(b: Box3): Node[] {
  const boardTop = b.z0 + 0.5;
  const board = box(b.x0, b.x1, b.y0, b.y1, b.z0, boardTop);
  const xc = (b.x0 + b.x1) / 2;
  const ym = (b.y0 + b.y1) / 2;
  return [
    part(box(b.x0, b.x1, ym, ym, boardTop, b.z1), [
      sticks(
        [
          [b.x0 + 0.12, ym],
          [b.x1 - 0.12, ym],
        ],
        boardTop,
        b.z1,
      ),
    ]),
    decorate(solid(board, "woodDark"), [
      poly(onFront(b.y0, b.x0 + 0.06, b.x1 - 0.06, b.z0 + 0.06, boardTop - 0.06), c("paper", 1)),
      poly(arch("front", b.y0, xc + 0.22, 0.16, b.z0 + 0.12, boardTop - 0.1), c("jar", 1)),
      lines(
        [
          [[b.x0 + 0.14, b.y0, b.z0 + 0.32], [xc + 0.06, b.y0, b.z0 + 0.32]],
          [[b.x0 + 0.14, b.y0, b.z0 + 0.22], [xc, b.y0, b.z0 + 0.22]],
        ],
        "id",
      ),
    ]),
  ];
}

function paperBackCounter(b: Box3): Node[] {
  const checks: Vec3[][] = [];
  const s = 0.3;
  for (let i = 0; i * s < b.y1 - b.y0 - 1e-6; i++)
    for (let j = 0; j * s < b.z1 - b.z0 - 0.05 - 1e-6; j++) {
      if ((i + j) % 2 === 0) continue;
      const y0 = b.y0 + i * s;
      const z0 = b.z0 + j * s;
      checks.push(onRight(b.x1, y0, Math.min(y0 + s, b.y1), z0, Math.min(z0 + s, b.z1 - 0.05)));
    }
  return [decorate(solid(b, "tile"), [shapes(checks, c("woodDark", 2))])];
}

function paperShelves(fx: Fixture, b: Box3): Node[] {
  const cols = fx.grid?.cols ?? 8;
  const rows = fx.grid?.rows ?? 4;
  const t = 0.04;
  const cw = (b.y1 - b.y0 - t) / cols;
  const ch = (b.z1 - b.z0 - t) / rows;
  const cubbies: Vec3[][] = [];
  const books: Record<"jar" | "sage" | "cream", Vec3[][]> = { jar: [], sage: [], cream: [] };
  const boxes: Vec3[][] = [];
  const colours = ["jar", "sage", "cream"] as const;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const y0 = b.y0 + t + i * cw;
      const z0 = b.z0 + t + j * ch;
      cubbies.push(onRight(b.x1, y0, y0 + cw - t, z0, z0 + ch - t));
      if ((i * 3 + j * 5) % 4 === 0) {
        for (let k = 0; k < 4; k++) {
          const by = y0 + 0.03 + k * 0.055;
          const tall = ch - t - 0.06 - ((k + i) % 3) * 0.03;
          books[colours[(i + j + k) % colours.length]!].push(onRight(b.x1, by, by + 0.045, z0, z0 + tall));
        }
      } else if ((i + j) % 5 === 2) boxes.push(onRight(b.x1, y0 + 0.08, y0 + cw - t - 0.08, z0, z0 + ch * 0.5));
    }
  return [
    decorate(solid(b, "wood"), [
      shapes(cubbies, c("shadow", 2)),
      ...colours.filter((k) => books[k].length > 0).map((k) => shapes(books[k], c(k, 2))),
      shapes(boxes, c("wood", 2)),
    ]),
  ];
}

/** The drinks fridge: its glass door, lit, with the bottles on its shelves as one row of shapes. */
function paperFridge(b: Box3): Node[] {
  const bottles: Vec3[][] = [];
  for (const z of [0.5, 0.9, 1.3])
    for (let k = 0; k < 5; k++) {
      const y = b.y0 + 0.09 + k * 0.085;
      bottles.push(onRight(b.x1, y, y + 0.05, b.z0 + z, b.z0 + z + 0.22));
    }
  return [decorate(solid(b, "dark"), [poly(onRight(b.x1, b.y0 + 0.05, b.y1 - 0.05, b.z0 + 0.15, b.z1 - 0.08), c("fridgeGlass", 2)), shapes(bottles, c("jar", 2))])];
}

function paperDoormat(b: Box3): Node[] {
  const z = b.z0 + 0.01;
  const n = 8;
  const stripes: Vec3[][] = [];
  for (let i = 1; i < n; i += 2) {
    const x0 = b.x0 + ((b.x1 - b.x0) * i) / n;
    stripes.push(onTop(z, x0, x0 + (b.x1 - b.x0) / n, b.y0, b.y1));
  }
  return [part({ ...b, z1: z }, [poly(onTop(z, b.x0, b.x1, b.y0, b.y1), c("jar", 0)), shapes(stripes, c("sage", 0))])];
}

function paperLedge(b: Box3): Node[] {
  const top = b.z1 - 0.05;
  const slab = box(b.x0, b.x1, b.y0, b.y1, top, b.z1);
  return [part(b, [cornerSticks(b, 0.12, b.z0, top), ...boxFaces(slab, { top: c("woodDark", 0), front: c("woodDark", 1), right: c("woodDark", 2) })])];
}

function paperToilet(fx: Fixture, b: Box3): Node[] {
  const alongX = fx.faces === "-x" || fx.faces === "+x";
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const depth = alongX ? b.x1 - b.x0 : b.y1 - b.y0;
  const width = alongX ? b.y1 - b.y0 : b.x1 - b.x0;
  const at = (a: number, d: number): Vec2 => (fx.faces === "-x" ? [b.x0 + d, cy + a] : fx.faces === "+x" ? [b.x1 - d, cy + a] : [cx + a, b.y0 + d]);
  const rect = (a0: number, a1: number, d0: number, d1: number, z0: number, z1: number): Box3 => {
    const p = at(a0, d0);
    const q = at(a1, d1);
    return box(p[0], q[0], p[1], q[1], z0, z1);
  };
  const [bx, by] = at(0, depth * 0.4);
  const r = Math.min(width * 0.42, depth * 0.34);
  const top = b.z0 + 0.42;
  return [
    part(box(bx - r, bx + r, by - r, by + r, b.z0, top), [
      ...drum(bx, by, r, b.z0, top, "white"),
      screen(c("white", 2), (p) => flatCircle(p, bx, by, top, r * 0.6)),
    ]),
    solid(rect(-width * 0.45, width * 0.45, depth * 0.75, depth, b.z0 + 0.35, b.z1), "white"),
  ];
}

function paperFan(b: Box3, ceiling: number): Node[] {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const r = (b.x1 - b.x0) / 2;
  const z = b.z0 + 0.04;
  const at = (a: number, d: number): Vec3 => [cx + Math.cos(a) * d, cy + Math.sin(a) * d, z];
  const blades = [0, 1, 2].map((k) => {
    const a = (k * 2 * Math.PI) / 3 + 0.4;
    return [at(a - 0.35, 0.05), at(a - 0.2, r * 0.97), at(a, r), at(a + 0.2, r * 0.97), at(a + 0.35, 0.05)];
  });
  return [
    part(box(cx, cx, cy, cy, b.z0 + 0.1, ceiling), [sticks([[cx, cy]], b.z0 + 0.1, ceiling)]),
    part(box(cx - r, cx + r, cy - r, cy + r, z, z), [shapes(blades, c("white", 0)), screen(c("white", 1), (p) => flatCircle(p, cx, cy, z + 0.02, 0.07))]),
  ];
}

function paperCubbies(fx: Fixture, b: Box3): Node[] {
  const cols = fx.grid?.cols ?? 5;
  const rows = fx.grid?.rows ?? 6;
  const t = 0.05;
  const cw = (b.y1 - b.y0 - t) / cols;
  const ch = (b.z1 - b.z0 - t) / rows;
  const cells: Vec3[][] = [];
  const shoes: Vec3[][] = [];
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const y0 = b.y0 + t + i * cw;
      const z0 = b.z0 + t + j * ch;
      cells.push(onRight(b.x1, y0, y0 + cw - t, z0, z0 + ch - t));
      if ((i * 7 + j * 3) % 5 === 1) {
        shoes.push(onRight(b.x1, y0 + 0.06, y0 + cw / 2 - 0.02, z0, z0 + 0.08));
        shoes.push(onRight(b.x1, y0 + cw / 2 + 0.01, y0 + cw - t - 0.06, z0, z0 + 0.08));
      }
    }
  return [decorate(solid(b, "dormPlaster"), [shapes(cells, c("shadow", 2)), shapes(shoes, c("white", 2))])];
}

/** A pendant lamp: its cord, the jar-orange dome and the lit underside; the stage lights it, no cone. */
function paperPendant(b: Box3): Node[] {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const r = (b.x1 - b.x0) / 2;
  const domeH = 0.16;
  const base = b.z0 + 0.02;
  const shape = (p: Projection) => {
    const [x, y] = p.point([cx, cy, base]);
    return { x, y, rx: r * p.scale * 1.2247, h: domeH * p.scale };
  };
  return [
    part(b, [
      line([[cx, cy, base + domeH], [cx, cy, b.z1]], "id"),
      screen(c("jar", 1), (p) => {
        const { x, y, rx, h } = shape(p);
        return [["M", x - rx, y], ["C", x - rx, y - h * 0.75, x - rx * 0.45, y - h, x, y - h], ["C", x + rx * 0.45, y - h, x + rx, y - h * 0.75, x + rx, y], ["Z"]];
      }),
      screen(c("lamp", 0), (p) => {
        const { x, y, rx } = shape(p);
        return [["M", x - rx * 0.8, y], ["C", x - rx * 0.4, y + rx * 0.22, x + rx * 0.4, y + rx * 0.22, x + rx * 0.8, y], ["Z"]];
      }),
    ]),
  ];
}

function paperPrinter(b: Box3): Node[] {
  const standTop = b.z0 + 0.7;
  const stand = box(b.x0, b.x1, b.y0, b.y1, standTop - 0.04, standTop);
  const body = box(b.x0 + 0.04, b.x1 - 0.04, b.y0 + 0.02, b.y1 - 0.02, standTop, b.z1);
  return [part(box(b.x0, b.x1, b.y0, b.y1, b.z0, standTop), [cornerSticks(b, 0.05, b.z0, standTop - 0.04), boxOutline(stand, c("wood", 0))]), solid(body, "dark")];
}

function paperRack(b: Box3): Node[] {
  const shelves: Box3[] = [];
  for (let i = 0; i < 4; i++) {
    const z = b.z0 + 0.15 + (i * (b.z1 - b.z0 - 0.15)) / 3;
    shelves.push(box(b.x0, b.x1, b.y0, b.y1, z - 0.03, z));
  }
  return [
    part(b, [
      sticks(
        [
          [b.x0 + 0.02, b.y1 - 0.02],
          [b.x0 + 0.02, b.y0 + 0.02],
          [b.x1 - 0.02, b.y1 - 0.02],
        ],
        b.z0,
        b.z1,
      ),
      hulls(shelves, c("steel", 0)),
      sticks([[b.x1 - 0.02, b.y0 + 0.02]], b.z0, b.z1),
    ]),
  ];
}

function paperLattice(b: Box3): Node[] {
  return [
    part(b, [
      poly(onFront(b.y0, b.x0, b.x1, b.z0, b.z1), c("wood", 1)),
      lines(gridFront(b.y0, b.x0 + 0.04, b.x1 - 0.04, b.z0 + 0.04, b.z1 - 0.04, (b.x1 - b.x0 - 0.08) / 6, (b.z1 - b.z0 - 0.08) / 9), "id"),
    ]),
  ];
}

/** The simple version of a fixture, or undefined where the full one is simple enough already (its lines go through the paper pen). */
function simpleParts(fx: Fixture, b: Box3, ctx: FixtureContext, ceiling: number): Node[] | undefined {
  switch (fx.type) {
    case "pod":
      return paperPod(fx, b);
    case "ladder":
      return paperLadder(b);
    case "ladder-wall":
      return paperLadderWall(b);
    case "locker":
      return paperLocker(fx, b, ctx);
    case "chair":
      return paperChair(fx, b);
    case "table":
      return paperTable(b);
    case "bench":
      return paperBench(b);
    case "bench-seat":
      return paperBenchSeat(b);
    case "table-small-round":
      return paperRoundTop(b, 0.52);
    case "table-tall-round":
    case "stool-low":
    case "stool-bar":
      return paperRoundTop(b, 0.55);
    case "plant":
      return paperPlant(b);
    case "door":
      return paperDoor(fx, b, ctx);
    case "window":
      return fx.variant === "shopfront" ? paperShopWindow(fx, b, ctx) : undefined;
    case "ac-outdoor":
      return ctx.cut !== undefined && b.z1 > ctx.cut ? [] : paperAcOutdoor(b);
    case "sign-hanging":
      return paperSignHanging(b);
    case "back-counter":
      return paperBackCounter(b);
    case "shelves":
      return paperShelves(fx, b);
    case "fridge-drinks":
      return paperFridge(b);
    case "doormat":
      return paperDoormat(b);
    case "window-ledge":
      return paperLedge(b);
    case "toilet":
      return paperToilet(fx, b);
    case "fan-ceiling":
    case "fan":
      return paperFan(b, ceiling);
    case "shoe-cubbies":
      return paperCubbies(fx, b);
    case "pendant-lamp":
      return paperPendant(b);
    case "printer":
      return paperPrinter(b);
    case "rack":
      return paperRack(b);
    case "lattice-door":
      return paperLattice(b);
    case "luggage-space":
      // A dashed outline on the floor: paper draws no dashes.
      return [];
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Plan symbols (top-down)

export type PlanMark =
  | { readonly kind: "path"; readonly cls: string; readonly cmds: readonly Cmd[] }
  | { readonly kind: "text"; readonly cls: string; readonly x: number; readonly y: number; readonly text: string; readonly size: number };

const mark = (cls: string, cmds: readonly Cmd[]): PlanMark => ({ kind: "path", cls, cmds });

function planRect(p: Projection, x0: number, x1: number, y0: number, y1: number): Cmd[] {
  const a = p.point([x0, y0, 0]);
  const b2 = p.point([x1, y1, 0]);
  const left = Math.min(a[0], b2[0]);
  const top = Math.min(a[1], b2[1]);
  const right = Math.max(a[0], b2[0]);
  const bottom = Math.max(a[1], b2[1]);
  return [
    ["M", left, top],
    ["L", right, top],
    ["L", right, bottom],
    ["L", left, bottom],
    ["Z"],
  ];
}

function planCircle(p: Projection, x: number, y: number, r: number): Cmd[] {
  const [cx, cy] = p.point([x, y, 0]);
  return circle(cx, cy, r * p.scale);
}

function planLine(p: Projection, pts: readonly (readonly [number, number])[]): Cmd[] {
  return pts.map(([x, y], i) => {
    const [sx, sy] = p.point([x, y, 0]);
    return [i === 0 ? "M" : "L", sx, sy] as const;
  });
}

function planText(p: Projection, x: number, y: number, text: string, size: number, cls: string): PlanMark {
  const [sx, sy] = p.point([x, y, 0]);
  return { kind: "text", cls, x: sx, y: sy + size * 0.35, text, size };
}

/** A quarter circle (a door's swing), from the hinge: radius along a, swinging toward b. */
export function swing(p: Projection, hinge: readonly [number, number], a: readonly [number, number], b: readonly [number, number]): Cmd[] {
  const k = 0.5523;
  const P0 = p.point([hinge[0] + a[0], hinge[1] + a[1], 0]);
  const P3 = p.point([hinge[0] + b[0], hinge[1] + b[1], 0]);
  const C1 = p.point([hinge[0] + a[0] + b[0] * k, hinge[1] + a[1] + b[1] * k, 0]);
  const C2 = p.point([hinge[0] + b[0] + a[0] * k, hinge[1] + b[1] + a[1] * k, 0]);
  return [
    ["M", P0[0], P0[1]],
    ["C", C1[0], C1[1], C2[0], C2[1], P3[0], P3[1]],
  ];
}

/** The way a flight climbs: its `faces`; without one, a "flight" climbs toward the front and other stairs toward the back. */
export function climbOf(fx: Fixture): Facing {
  return fx.faces ?? (fx.variant === "flight" ? "-y" : "+y");
}

/** The opposite way (a flight's way down). */
export function reverse(d: Facing): Facing {
  return ({ "+x": "-x", "-x": "+x", "+y": "-y", "-y": "+y" } as const)[d];
}

/** One arrow on a flight in plan: the way you walk, and "Up" or "Down". */
export interface StairArrow {
  readonly toward: Facing;
  readonly label: string;
}

/**
 * Stairs in plan, the usual way: treads, and an arrow that starts where you stand and points the way you
 * walk, its label at the tail. Two arrows (a flight up over the flight down, as on Floor 1) share the
 * width, split by a diagonal break line.
 */
/** A flight in plan: its treads across the way it climbs (`climb`; none for a landing) and its arrows. */
export function planStairs(b: Box3, p: Projection, arrows: readonly StairArrow[], climb: Facing | null = arrows[0]?.toward ?? "+y"): PlanMark[] {
  const out: PlanMark[] = [mark(c("terracotta", 0), planRect(p, b.x0, b.x1, b.y0, b.y1))];
  if (climb === null) return out;
  // Laid out along y (the run) and x (the width), then turned for a flight along x.
  const alongX = climb === "+x" || climb === "-x";
  const [r0, r1, w0, w1] = alongX ? [b.x0, b.x1, b.y0, b.y1] : [b.y0, b.y1, b.x0, b.x1];
  const pt = (run: number, across: number): [number, number] => (alongX ? [run, across] : [across, run]);
  const treads: [number, number][][] = [];
  for (let s = r0 + 0.19; s < r1 - 0.05; s += 0.19) treads.push([pt(s, w0), pt(s, w1)]);
  out.push(mark("tg", treads.flatMap((t) => planLine(p, t))));
  if (arrows.length === 0) return out;
  const width = (w1 - w0) / arrows.length;
  arrows.forEach(({ toward, label }, i) => {
    const sign = toward === "+x" || toward === "+y" ? 1 : -1;
    const cw = w0 + width * (i + 0.5);
    const from = sign > 0 ? r0 + 0.4 : r1 - 0.4;
    const to = sign > 0 ? r1 - 0.4 : r0 + 0.4;
    const head = Math.min(0.18, width * 0.3);
    out.push(mark("b n", planLine(p, [pt(from + sign * 0.55, cw), pt(to, cw)])));
    out.push(mark("b n", planLine(p, [pt(to - sign * 0.25, cw - head), pt(to, cw), pt(to - sign * 0.25, cw + head)])));
    const [lx, ly] = pt(from + sign * 0.2, cw);
    out.push(planText(p, lx, ly, label, 11, "ls"));
  });
  if (arrows.length > 1) {
    const m = (r0 + r1) / 2;
    out.push(mark("h n", planLine(p, [pt(m - 0.35, w0), pt(m + 0.35, w1)])));
  }
  return out;
}

export interface PlanMarkOptions {
  /** The arrows of a flight of stairs (default: one arrow "Up" the way it rises). */
  readonly stairs?: readonly StairArrow[];
  /** The numbers of every locker in a stack, for the label on its bottom one (default: its own number). */
  readonly lockerStack?: readonly string[];
}

/** The plan symbol of a fixture: simple shapes, a number where it helps. */
export function planMarks(fx: Fixture, p: Projection, opts: PlanMarkOptions = {}): PlanMark[] {
  const b = fx.box;
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const r = Math.min(b.x1 - b.x0, b.y1 - b.y0) / 2;
  const rect = (cls: string, inset = 0) => mark(cls, planRect(p, b.x0 + inset, b.x1 - inset, b.y0 + inset, b.y1 - inset));
  switch (fx.type) {
    case "pod": {
      const upper = fx.variant?.includes("upper");
      const left = fx.variant?.includes("left");
      const across = fx.faces === "-y";
      const curtainX = left ? b.x1 - 0.05 : b.x0 + 0.05;
      // A stack lying across is too shallow for the two numbers one above the other: they sit side by side.
      const [tx, ty] = across ? [cx + (upper ? 0.5 : -0.5), cy + 0.42] : [cx, cy];
      if (upper)
        return [
          mark("dl", planRect(p, b.x0 + 0.09, b.x1 - 0.09, b.y0 + 0.09, b.y1 - 0.09)),
          planText(p, tx, ty + (across ? -0.25 : 0.42), fx.label ?? "", 13, "ls"),
          planText(p, tx, ty + (across ? -0.55 : 0.12), "upper", 9, "lc"),
        ];
      return [
        rect(c("wood", 0)),
        mark(c("paper", 0), planRect(p, b.x0 + 0.06, b.x1 - 0.06, b.y0 + 0.06, b.y1 - 0.06)),
        mark("o n kcu", planLine(p, across ? [[b.x0 + 0.08, b.y0 + 0.05], [b.x1 - 0.08, b.y0 + 0.05]] : [[curtainX, b.y0 + 0.08], [curtainX, b.y1 - 0.08]])),
        planText(p, tx, ty + (across ? -0.25 : -0.28), fx.label ?? "", 13, "ls"),
        planText(p, tx, ty + (across ? -0.55 : -0.58), "lower", 9, "lc"),
      ];
    }
    case "locker": {
      if (b.z0 > 0.01) return [];
      // Where a stack stands and which numbers it holds stays unwritten until the house confirms it
      // (docs/DESIGN.md §9: no locker position stated as firm): an unconfirmed stack is drawn bare.
      if (fx.confirmed === false) return [rect(c("wood", 0))];
      // One label for the whole stack, from its lowest number to its highest: H01–H03.
      const stack = [...(opts.lockerStack ?? [fx.label ?? ""])].filter(Boolean).sort();
      if (stack.length === 0) return [rect(c("wood", 0))];
      const text = stack.length > 1 ? `${stack[0]}–${stack[stack.length - 1]}` : stack[0]!;
      return [rect(c("wood", 0)), planText(p, cx, cy, text, 9, "ln")];
    }
    case "ladder":
    case "ladder-wall":
      return [rect(c("wood", 0)), mark("h n", planLine(p, b.x1 - b.x0 < b.y1 - b.y0 ? [[cx, b.y0], [cx, b.y1]] : [[b.x0, cy], [b.x1, cy]]))];
    case "table":
    case "window-ledge":
    case "bench":
      return [rect(c("wood", 0))];
    case "chair": {
      const backY = fx.faces === "+y" ? b.y0 + 0.03 : b.y1 - 0.03;
      return [rect(c("wood", 0), 0.03), mark("b n", planLine(p, [[b.x0 + 0.02, backY], [b.x1 - 0.02, backY]]))];
    }
    case "table-small-round":
    case "table-tall-round":
      return [mark(c("wood", 0), planCircle(p, cx, cy, r))];
    case "stool-low":
    case "stool-bar":
      return [mark(c("wood", 0), planCircle(p, cx, cy, r * 0.85))];
    case "bin":
      return [mark(c("dark", 0), planCircle(p, cx, cy, r))];
    case "extinguisher":
      return [mark(c("red", 0), planCircle(p, cx, cy, r))];
    case "jar-big":
    case "jar-clay":
      return [mark(c("terracotta", 0), planCircle(p, cx, cy, r)), mark(c("shadow", 0), planCircle(p, cx, cy, r * 0.62))];
    case "plant":
      return [mark(c("sage", 0), planCircle(p, cx, cy, Math.max(r, 0.16))), mark(c("terracotta", 0), planCircle(p, cx, cy, Math.max(r, 0.16) * 0.45))];
    case "bench-seat":
      return [rect(c("plaster", 0)), mark(c("cushion", 0), planRect(p, b.x0 + 0.04, b.x1 - 0.04, b.y0 + 0.04, b.y1 - 0.04))];
    case "counter":
      return [rect(c("tile", 0))];
    case "back-counter":
    case "vanity":
    case "kitchen-counter":
      return [rect(c(fx.type === "vanity" ? "bathTile" : "tile", 0))];
    case "sink":
    case "sink-small":
      return [rect(c("steel", 0), 0.02)];
    case "basin":
      return fx.variant === "vessel"
        ? [mark(c("white", 0), planCircle(p, cx, cy, r)), mark("h n", planCircle(p, cx, cy, r * 0.6))]
        : [rect(c("white", 0)), mark("h n", planCircle(p, cx + 0.03, cy, r * 0.55))];
    case "coffee-machine":
    case "dehumidifier":
      return [rect(c(fx.type === "coffee-machine" ? "dark" : "white", 0))];
    case "shelves":
    case "staff-lockers":
      return [rect(c("wood", 0)), mark("tg", planLine(p, [[b.x1 - 0.06, b.y0], [b.x1 - 0.06, b.y1]]))];
    case "fridge-drinks":
      return [rect(c("dark", 0)), mark("b n kfg", planLine(p, [[b.x1 - 0.03, b.y0 + 0.05], [b.x1 - 0.03, b.y1 - 0.05]]))];
    case "luggage-space":
      return [rect("dl")];
    case "doormat":
      return [rect(c("jar", 0)), mark("tg", planLine(p, [[b.x0, cy], [b.x1, cy]]))];
    case "water-dispenser":
      return [rect(c("steel", 0)), mark(c("bamboo", 0), planCircle(p, cx, cy, r * 0.8))];
    case "toilet": {
      const f = fx.faces;
      const tank = f === "-x" ? planRect(p, b.x1 - 0.18, b.x1, b.y0, b.y1) : f === "+x" ? planRect(p, b.x0, b.x0 + 0.18, b.y0, b.y1) : planRect(p, b.x0, b.x1, b.y1 - 0.18, b.y1);
      const bowl = f === "-x" ? planEllipse(p, b.x0 + 0.26, cy, 0.24, 0.17) : f === "+x" ? planEllipse(p, b.x1 - 0.26, cy, 0.24, 0.17) : planEllipse(p, cx, b.y0 + 0.26, 0.17, 0.24);
      return [mark(c("white", 0), tank), mark(c("white", 0), bowl)];
    }
    case "shower":
      return [
        rect(c("bathTile", 0), 0.04),
        mark(c("slate", 0), planCircle(p, cx, cy, 0.05)),
        mark("h n", planLine(p, [[b.x1 - 0.04, b.y0 + 0.1], [b.x1 - 0.04, b.y1 - 0.1]])),
      ];
    case "toilet-stall":
      return [
        mark("wl", planLine(p, [[b.x1, b.y0], [b.x1, b.y1]])),
        mark("wl", planLine(p, [[b.x0, b.y0], [b.x0 + 0.08, b.y0]])),
        mark("wl", planLine(p, [[b.x1 - 0.12, b.y0], [b.x1, b.y0]])),
        mark("h n", swing(p, [b.x0 + 0.08, b.y0], [0.7, 0], [0, 0.7])),
      ];
    case "stairs":
      return fx.variant?.includes("landing")
        ? planStairs(b, p, [], null)
        : planStairs(b, p, opts.stairs ?? [{ toward: climbOf(fx), label: "Up" }], climbOf(fx));
    case "shoe-cubbies": {
      const cols = fx.grid?.cols ?? 5;
      const cells: [number, number][][] = [];
      for (let i = 1; i < cols; i++) {
        const y = b.y0 + ((b.y1 - b.y0) * i) / cols;
        cells.push([
          [b.x0, y],
          [b.x1, y],
        ]);
      }
      return [rect(c("dormPlaster", 0)), mark("h n", cells.flatMap((t) => planLine(p, t)))];
    }
    case "door-leaf": {
      // Drawn open. The hinge is at the (x0, y0) corner unless the variant says hinge-x1 / hinge-y1; the arc
      // runs from the leaf's free end to where it closes, across the opening beside the hinge.
      const alongY = b.x1 - b.x0 < b.y1 - b.y0;
      const len = alongY ? b.y1 - b.y0 : b.x1 - b.x0;
      const tokens = (fx.variant ?? "").split(" ");
      const hx = tokens.includes("hinge-x1") ? b.x1 : b.x0;
      const hy = tokens.includes("hinge-y1") ? b.y1 : b.y0;
      const sx = hx === b.x1 ? -1 : 1;
      const sy = hy === b.y1 ? -1 : 1;
      const arc = alongY ? swing(p, [hx, hy], [0, sy * len], [sx * len, 0]) : swing(p, [hx, hy], [sx * len, 0], [0, sy * len]);
      return [rect(c(tokens.includes("dark") ? "brown" : "woodDark", 0)), mark("h n", arc)];
    }
    case "awning":
      return [rect("dl")];
    case "post":
      return [rect(c("wood", 0))];
    case "sign-hostel":
    case "sign-hanging":
    case "sign-plate":
    case "hand-dryer":
    case "hair-dryer":
    case "mirror":
      return [rect(c(fx.type === "mirror" ? "glass" : fx.type === "sign-hostel" ? "jar" : "white", 0))];
    case "ac-indoor":
    case "ac-outdoor":
      return [rect("dl")];
    case "fan-ceiling":
    case "fan":
      return [mark("dl", planCircle(p, cx, cy, r * 0.9))];
    case "fan-exhaust":
    case "wall-lamp":
      return [rect(c(fx.type === "wall-lamp" ? "lamp" : "white", 0))];
    case "door":
      return [mark(c("glass", 0), planRect(p, b.x0, b.x1, b.y0, b.y1))];
    case "pendant-lamp":
      return [mark("dl", planCircle(p, cx, cy, r * 0.8))];
    case "printer":
      return [rect(c("wood", 0)), mark(c("dark", 0), planRect(p, b.x0 + 0.04, b.x1 - 0.04, b.y0 + 0.02, b.y1 - 0.02))];
    case "cupboard":
      return [rect(c(fx.variant?.includes("dark") ? "brown" : "wood", 0))];
    case "door-panel":
    case "lattice-door":
    case "picture-frame":
      return [rect(c("woodDark", 0))];
    case "fridge":
      return [rect(c("steel", 0))];
    case "rack":
      return [rect(c("steel", 0)), mark("tg", planLine(p, [[b.x0, b.y0], [b.x1, b.y1]]))];
    case "water-tank":
      return [mark(c("bamboo", 0), planCircle(p, cx, cy, r))];
    case "fuse-box":
      return [rect(c("white", 0))];
    case "shrine":
      return [rect(c("dark", 0)), mark(c("jar", 0), planCircle(p, cx, cy, Math.min(r, 0.08)))];
    case "ceiling-light":
      return fx.variant === "tube" ? [rect("dl")] : [mark("dl", planCircle(p, cx, cy, r))];
    case "track-light":
      return [rect("dl")];
    case "window":
      return fx.variant === "shopfront" ? [mark(c("glass", 0), planRect(p, b.x0, b.x1, -0.1, -0.05))] : [mark(c("glass", 0), planRect(p, b.x0, b.x1, -0.11, -0.05))];
  }
  return [];
}

function planEllipse(p: Projection, x: number, y: number, rx: number, ry: number): Cmd[] {
  return ellipseOnPlane(p, [x, y, 0], [rx, 0, 0], [0, ry, 0]);
}
