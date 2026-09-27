/**
 * Geometry for the carved stone jars of the illustrations: after the Iron Age
 * jars of the Plain of Jars, drawn as old stone rather than pottery. Each jar
 * is hewn by hand, so no outline is true: the sides bulge and flatten where
 * the mason worked them, the collar (carved from the same block, not a lid)
 * is thick and uneven, and centuries have left breaks, cracks, rain
 * stains and a damp foot. The unevenness comes from a seed, so every build
 * draws the same jars.
 *
 * Every function returns SVG path data in the jar's own space: the foot's
 * centre is (0, 0) and the jar rises into negative y. Points are rounded to
 * whole units so the inline SVG stays small.
 */

export interface JarSpec {
  /** Width at the belly, the widest point. */
  readonly w: number;
  /** Height from the foot to the top of the rim. */
  readonly h: number;
  /** Width of the foot, as a share of w. */
  readonly foot?: number;
  /** Height of the belly, as a share of the height below the collar. */
  readonly belly?: number;
  /** Width just under the collar, as a share of w. */
  readonly neck?: number;
  /** Width of the collar, as a share of w. */
  readonly lip?: number;
  /** Height of the collar, as a share of h. */
  readonly lipH?: number;
  /** How much of the rim's top shows: its height as a share of its width. More for a view from above. */
  readonly top?: number;
  /** Makes the left side a little narrower than the right. */
  readonly skew?: number;
  /** Which hand-hewn outline: any whole number. */
  readonly seed?: number;
  /** How uneven the stone is, as a share of w. */
  readonly rough?: number;
  /**
   * A piece broken out of the front of the rim: where (-1 left to 1 right of
   * the opening), how wide (a share of the opening's width) and how far down
   * (a share of h).
   */
  readonly bite?: { readonly at: number; readonly width: number; readonly depth: number };
  /** A crack running down from the rim: where (-1 to 1) and how long (a share of h). */
  readonly crack?: { readonly at: number; readonly length: number };
}

export interface JarGeometry {
  /** The silhouette, collar included. */
  readonly body: string;
  /** The top of the rim, around the opening. */
  readonly top: string;
  /** The dark opening. */
  readonly mouth: string;
  /** The shadow the collar throws on the neck. */
  readonly collar: string;
  /** Earth banked against the foot, where the jar has sunk into the ground. */
  readonly mound: string;
  /**
   * Weathering: rain streaks from under the collar and the damp foot, in one
   * shape, for a fill that fades from the collar downwards and darkens again
   * at the foot (its box runs from under the collar to the ground).
   */
  readonly stains: string;
  /** The broken piece, showing the dark inside ("" when whole). */
  readonly bite: string;
  /** The broken wall's edge that catches the light ("" when whole). */
  readonly biteEdge: string;
  /** A crack, drawn as a line ("" when there is none). */
  readonly crack: string;
  /** A box around the jar, for texture fills. */
  readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

type Point = readonly [number, number];

/** Rounds to one decimal, without "-0". */
export function num(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded === 0 ? 0 : rounded);
}

/** Rounds to a whole unit: the jars are drawn at a unit to a pixel or less, so decimals would only add bytes. */
function whole(value: number): string {
  const rounded = Math.round(value);
  return String(rounded === 0 ? 0 : rounded);
}

const pt = ([x, y]: Point) => `${whole(x)} ${whole(y)}`;
const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** A smooth but uneven line through the points' midpoints (a quadratic B-spline), from the first point to the last. */
function spline(points: readonly Point[]): string {
  if (points.length < 3) return points.slice(1).map((p) => `L${pt(p)}`).join("");
  let d = `L${pt(mid(points[0]!, points[1]!))}`;
  for (let i = 1; i < points.length - 1; i++) d += `Q${pt(points[i]!)} ${pt(mid(points[i]!, points[i + 1]!))}`;
  return d + `L${pt(points[points.length - 1]!)}`;
}

/** A closed smooth loop through the points' midpoints. */
function loop(points: readonly Point[]): string {
  const n = points.length;
  let d = `M${pt(mid(points[n - 1]!, points[0]!))}`;
  for (let i = 0; i < n; i++) d += `Q${pt(points[i]!)} ${pt(mid(points[i]!, points[(i + 1) % n]!))}`;
  return d + "Z";
}

/** Small deterministic random numbers, so the drawing is the same on every build. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function stoneJar(spec: JarSpec): JarGeometry {
  const {
    w,
    h,
    foot = 0.8,
    belly = 0.42,
    neck = 0.84,
    lip = 0.92,
    lipH = 0.1,
    top = 0.1,
    skew = 0.03,
    seed = 1,
    rough = 0.03,
    bite,
    crack,
  } = spec;
  const random = seeded(seed * 7919 + 17);
  const jitter = (amount: number) => (random() - 0.5) * 2 * amount;

  const half = w / 2;
  const rimX = half * lip;
  const ry = rimX * top;
  const yTop = -h + ry; // centre of the rim's top ellipse: the back of the rim reaches -h
  const yNeck = -(1 - lipH) * h; // where the collar meets the neck
  const chamfer = (yNeck - yTop) * 0.3; // the neck flares out into the collar

  // The sides, foot to neck: fast out to the belly, then a long shoulder in to the neck. Hewn, so uneven.
  const width = (t: number, wf: number, wb: number, wn: number) =>
    t <= belly
      ? wf + (wb - wf) * Math.sin(((t / belly) * Math.PI) / 2)
      : wb - (wb - wn) * (1 - Math.cos((((t - belly) / (1 - belly)) * Math.PI) / 2));
  const heights = [0, 0.2, 0.46, 0.74, 1];
  const side = (sign: 1 | -1): Point[] => {
    const wf = half * foot * (1 + sign * skew * 0.5);
    const wb = half * (1 + sign * skew);
    const wn = half * neck;
    return heights.map((t, index) => {
      const edge = index === 0 || index === heights.length - 1;
      const x = sign * (width(t, wf, wb, wn) + (edge ? 0 : rough * w * (random() - 0.35)));
      const y = index === 0 ? -2 : t * yNeck + (edge ? 0 : jitter(h * 0.012));
      return [x, y] as const;
    });
  };
  const right = side(1);
  const left = side(-1);

  // The collar's faces bulge a little; its ends are not quite level.
  const rimR = rimX * (1 + jitter(0.015));
  const rimL = rimX * (1 + jitter(0.015));
  const lipOut = top > 0.15 ? 0 : rimX * 0.035; // seen from above, a bulge would stick out at the rim's ends
  const collarMid = (yNeck + yTop) / 2;

  // The back of the rim, right to left, worn uneven: more points when it is seen from higher up.
  const steps = top > 0.15 ? 10 : 6;
  const back: Point[] = [[rimR, yTop]];
  for (let i = 1; i < steps; i++) {
    const angle = (Math.PI * i) / steps;
    back.push([Math.cos(angle) * rimX + jitter(rimX * 0.012), yTop - Math.sin(angle) * ry + jitter(ry * 0.22)]);
  }
  back.push([-rimL, yTop]);
  // Seen low, the worn edge is a run of short straight edges; seen from above, a smooth line (straight runs would show).
  const backEdge = top > 0.15 ? spline(back) : back.slice(1).map((p) => `L${pt(p)}`).join("");

  const body =
    `M${pt(left[0]!)}Q0 ${whole(h * 0.02 + 3)} ${pt(right[0]!)}` +
    spline(right) +
    `L${pt([rimR, yNeck - chamfer])}Q${pt([rimR + lipOut, collarMid])} ${pt([rimR, yTop])}` +
    backEdge +
    `Q${pt([-rimL - lipOut, collarMid])} ${pt([-rimL, yNeck - chamfer])}` +
    `L${pt(left[left.length - 1]!)}` +
    spline([...left].reverse()) +
    "Z";

  // The top of the rim: the same worn back edge, and a front edge of its own.
  const front: Point[] = [];
  for (let i = 1; i < 5; i++) {
    const angle = (Math.PI * i) / 5;
    front.push([-Math.cos(angle) * rimX + jitter(rimX * 0.015), yTop + Math.sin(angle) * ry + jitter(ry * 0.3)]);
  }
  const topFace = `M${pt([rimR, yTop])}` + backEdge + spline([[-rimL, yTop], ...front, [rimR, yTop]]) + "Z";

  // Thick stone walls: a narrow opening in a broad rim, set a little back.
  const mouthX = rimX * 0.68;
  const mouthY = ry * 0.52;
  const mouthC = yTop - ry * 0.04;
  // Two half-ellipses of different depths, so the opening is not quite true.
  const backDepth = mouthY * (1 + jitter(0.15));
  const mouth =
    `M${pt([-mouthX, mouthC])}A${whole(mouthX)} ${whole(backDepth)} 0 0 1 ${pt([mouthX, mouthC])}` +
    `A${whole(mouthX)} ${whole(mouthY * (1 + jitter(0.15)))} 0 0 1 ${pt([-mouthX, mouthC])}Z`;

  // Where the front of the collar meets the neck, seen a little from above.
  const neckFront = (x: number) => yNeck + ry * Math.sqrt(Math.max(0, 1 - (x / rimX) ** 2));
  const shade = Math.max(4, h * 0.035);
  const collar =
    `M${pt([-rimX, yNeck])}A${whole(rimX)} ${whole(ry)} 0 0 0 ${pt([rimX, yNeck])}` +
    `L${pt([rimX, yNeck + shade])}A${whole(rimX)} ${whole(ry * 1.15)} 0 0 1 ${pt([-rimX, yNeck + shade])}Z`;

  // Weathering, in one shape for one fill that fades down from the collar and darkens again at the foot:
  // a broad rain streak from under the collar, and the damp foot.
  const streak = (at: number, length: number, spread: number) => {
    const x = at * half * neck;
    const y0 = neckFront(x);
    const y1 = y0 + length * h;
    return loop([
      [x - spread * 0.5, y0],
      [x + spread * 0.5, y0],
      [x + spread * (0.32 + jitter(0.14)), y1 - (y1 - y0) * 0.35],
      [x + jitter(spread * 0.15), y1],
      [x - spread * (0.45 + jitter(0.14)), y0 + (y1 - y0) * 0.5],
    ]);
  };
  const footLine: Point[] = [];
  for (let i = 0; i <= 4; i++) footLine.push([-half * 1.1 + (half * 2.2 * i) / 4, -h * (0.08 + jitter(0.03))]);
  const stains =
    streak(-0.36 + jitter(0.12), 0.4 + jitter(0.1), w * 0.24) +
    `M${pt([-half * 1.1, 6])}` +
    spline(footLine) +
    `L${pt([half * 1.1, 6])}Z`;

  // A broken piece: from the front of the opening, down through the collar into the body, with a ragged floor.
  let biteShape = "";
  let biteEdge = "";
  if (bite) {
    const span = bite.width * 2 * mouthX;
    const x1 = bite.at * mouthX - span / 2;
    const x2 = bite.at * mouthX + span / 2;
    const onMouth = (x: number): Point => [x, mouthC + mouthY * Math.sqrt(Math.max(0, 1 - (x / mouthX) ** 2))];
    const floor = (share: number, drop: number): Point => {
      const x = x1 + span * share;
      return [x + jitter(span * 0.05), neckFront(x) + bite.depth * h * drop + jitter(h * 0.01)];
    };
    const a = onMouth(x1);
    const b = onMouth(x2);
    const outline = [a, floor(0.06, 0.55), floor(0.3, 1), floor(0.5, 0.78), floor(0.72, 0.95), floor(0.95, 0.45), b];
    biteShape = `M${pt(a)}` + outline.slice(1).map((p) => `L${pt(p)}`).join("") + "Z";
    // The broken wall's thickness, lit along the far side and the floor.
    biteEdge = `M${pt(outline[2]!)}` + outline.slice(3).map((p) => `L${pt(p)}`).join("");
  }

  // A crack: a few sharp turns down the front.
  let crackLine = "";
  if (crack) {
    const x = crack.at * rimX;
    let d = `M${pt([x, neckFront(x) - (yNeck - yTop) * 0.5])}`;
    for (let i = 0; i < 4; i++) d += `l${whole(jitter(w * 0.04))} ${whole((crack.length * h) / 4)}`;
    crackLine = d;
  }

  // Centuries of soil have banked up against the foot.
  const mound =
    `M${pt([-half * 1.2, 8])}` +
    spline([
      [-half * 1.2, 8],
      [-half * 0.7, -h * (0.03 + jitter(0.01))],
      [half * 0.5, -h * (0.035 + jitter(0.01))],
      [half * 1.25, 8],
    ]) +
    "Z";

  return {
    body,
    top: topFace,
    mouth,
    collar,
    mound,
    stains,
    bite: biteShape,
    biteEdge,
    crack: crackLine,
    box: {
      x: Math.round(-half * 1.15),
      y: Math.round(-h - 2),
      width: Math.round(half * 2.3),
      height: Math.round(h + 12),
    },
  };
}

/**
 * A stone lid lying on the ground, as they lie beside the jars at the real
 * sites: a thick, worn disc seen from a low angle, with a piece off its rim.
 */
export function stoneLid(rx: number, ry: number, thickness: number, seed = 3): { top: string; side: string } {
  const random = seeded(seed);
  const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
  const rim: Point[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10;
    // A piece is missing from the front left.
    const chipped = i === 6 ? 0.8 : 1;
    rim.push([Math.cos(angle) * rx * chipped * (1 + jitter(0.03)), Math.sin(angle) * ry * chipped * (1 + jitter(0.06))]);
  }
  const edge: Point[] = [];
  for (let i = 0; i <= 6; i++) {
    const angle = (Math.PI * i) / 6;
    edge.push([Math.cos(angle) * rx, Math.sin(angle) * ry + thickness * (0.85 + jitter(0.15))]);
  }
  return {
    top: loop(rim),
    side: `M${pt([rx, 0])}L${pt(edge[0]!)}` + spline(edge) + `L${pt([-rx, 0])}A${whole(rx)} ${whole(ry)} 0 0 0 ${pt([rx, 0])}Z`,
  };
}

/**
 * Dots as one path of zero-length segments: drawn with a round-capped stroke,
 * the stroke's width is each dot's size. A quarter of the bytes of circles.
 */
export function specks(points: readonly (readonly [number, number])[]): string {
  return points.map(([x, y]) => `M${pt([x, y])}h0`).join("");
}

/** A patch of lichen: small specks scattered around a centre, denser in the middle. */
export function lichen(seed: number, cx: number, cy: number, spread: number, count: number): string {
  const random = seeded(seed);
  const points: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const distance = spread * random();
    points.push([cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance * 0.8]);
  }
  return specks(points);
}
