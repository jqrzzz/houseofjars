/**
 * Geometry for the carved stone jars of the illustrations: after the Iron Age
 * jars of the Plain of Jars, drawn as stone rather than pottery. The rim is a
 * thick ledge carved from the same block (not a lid), its flat top catches the
 * light, the chisel left a few flat planes on the body, and old jars have
 * chipped rims and lichen.
 *
 * Every function returns SVG path data in the jar's own space: the foot's
 * centre is (0, 0) and the jar rises into negative y. Output is rounded to one
 * decimal so the inline SVG stays small.
 */

export interface JarSpec {
  /** Width at the belly, the widest point. */
  readonly w: number;
  /** Height from the foot to the top of the rim. */
  readonly h: number;
  /** Width of the foot, as a share of w. */
  readonly foot?: number;
  /** Height of the belly, as a share of h. */
  readonly belly?: number;
  /** Width just under the rim, as a share of w. */
  readonly neck?: number;
  /** Width of the rim ledge, as a share of w. */
  readonly lip?: number;
  /** Height of the rim ledge, as a share of h. */
  readonly lipH?: number;
  /** How much of the rim's flat top shows: its height as a share of its width. More for a view from above. */
  readonly top?: number;
  /** Where a chip is missing from the back of the rim, 0 (right) to 1 (left). Omit for an unbroken rim. */
  readonly notch?: number;
  /** Makes the left side a little narrower than the right: no two jars were carved alike. */
  readonly skew?: number;
}

export interface JarGeometry {
  /** The silhouette, rim included. */
  readonly body: string;
  /** The flat top of the rim. */
  readonly top: string;
  /** The dark opening inside the rim. */
  readonly mouth: string;
  /** The front face of the rim ledge. */
  readonly ledge: string;
  /** The shadow the ledge throws on the neck: the carved line of the mark, as stone. */
  readonly under: string;
  /** Chisel planes turned to the light, and away from it. */
  readonly litPlanes: string;
  readonly darkPlanes: string;
  /** Weathering: dark streaks running down from the rim. */
  readonly streaks: string;
  /** A box around the jar, for texture fills. */
  readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

/** Rounds to one decimal, without "-0". */
export function num(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded === 0 ? 0 : rounded);
}

const pt = (x: number, y: number) => `${num(x)} ${num(y)}`;

/** A point on the back (upper) half of an ellipse: t = 0 is the right end, t = π the left. */
function backPoint(rx: number, ry: number, cy: number, t: number): [number, number] {
  return [rx * Math.cos(t), cy - ry * Math.sin(t)];
}

/** The back edge of the rim, right to left, with an optional chip. */
function backArc(rx: number, ry: number, cy: number, notch: number | undefined): string {
  const end = `A${num(rx)} ${num(ry)} 0 0 0 ${pt(-rx, cy)}`;
  if (notch === undefined) return end;
  const t1 = Math.PI * Math.max(0.08, notch - 0.05);
  const t2 = Math.PI * Math.min(0.92, notch + 0.05);
  const [x1, y1] = backPoint(rx, ry, cy, t1);
  const [x2, y2] = backPoint(rx, ry, cy, t2);
  const depth = ry * 0.9 + rx * 0.05;
  return (
    `A${num(rx)} ${num(ry)} 0 0 0 ${pt(x1, y1)}` +
    `L${pt(x1 - (x1 - x2) * 0.3, y1 + depth)}L${pt(x2 + (x1 - x2) * 0.15, y2 + depth * 0.7)}L${pt(x2, y2)}` +
    end
  );
}

export function stoneJar(spec: JarSpec): JarGeometry {
  const { w, h, foot = 0.8, belly = 0.5, neck = 0.8, lip = 0.9, lipH = 0.09, top = 0.08, notch, skew = 0.03 } = spec;
  const half = w / 2;
  // The right side is a little fuller than the left.
  const right = { w: half * (1 + skew), f: half * foot * (1 + skew), n: half * neck };
  const left = { w: half * (1 - skew), f: half * foot * (1 - skew * 0.5), n: half * neck * (1 + skew * 0.4) };
  const rimX = half * lip;
  const ry = rimX * top;
  const yTop = -h + ry; // centre of the rim's top ellipse
  const yNeck = -(1 - lipH) * h; // underside of the ledge
  const yBelly = -belly * h;
  const ledgeLow = yNeck - Math.min(3, h * 0.012);
  const round = Math.min(3, (rimX - right.n) * 0.9);

  const body =
    `M${pt(-left.f, -2)}Q0 ${num(h * 0.02 + 3)} ${pt(right.f, -2)}` +
    // The right side, upwards: foot to belly, belly to neck.
    `C${pt(right.f + (right.w - right.f) * 0.85, yBelly * 0.2)} ${pt(right.w, yBelly * 0.62)} ${pt(right.w, yBelly)}` +
    `C${pt(right.w, yBelly + (yNeck - yBelly) * 0.5)} ${pt(right.n + (right.w - right.n) * 0.55, yNeck + (yBelly - yNeck) * 0.08)} ${pt(right.n, yNeck)}` +
    `L${pt(rimX - round, yNeck)}Q${pt(rimX, yNeck)} ${pt(rimX, ledgeLow - round)}L${pt(rimX, yTop)}` +
    backArc(rimX, ry, yTop, notch) +
    `L${pt(-rimX, ledgeLow - round)}Q${pt(-rimX, yNeck)} ${pt(-rimX + round, yNeck)}L${pt(-left.n, yNeck)}` +
    // The left side, downwards.
    `C${pt(-(left.n + (left.w - left.n) * 0.55), yNeck + (yBelly - yNeck) * 0.08)} ${pt(-left.w, yBelly + (yNeck - yBelly) * 0.5)} ${pt(-left.w, yBelly)}` +
    `C${pt(-left.w, yBelly * 0.62)} ${pt(-(left.f + (left.w - left.f) * 0.85), yBelly * 0.2)} ${pt(-left.f, -2)}Z`;

  const front = `A${num(rimX)} ${num(ry)} 0 0 0 ${pt(rimX, yTop)}`;
  const topPlane = `M${pt(rimX, yTop)}` + backArc(rimX, ry, yTop, notch) + front + "Z";

  const mouthX = rimX * 0.78;
  const mouthY = ry * 0.6;
  const mouthC = yTop + ry * 0.08;
  const mouth = `M${pt(-mouthX, mouthC)}A${num(mouthX)} ${num(mouthY)} 0 1 0 ${pt(mouthX, mouthC)}A${num(mouthX)} ${num(mouthY)} 0 1 0 ${pt(-mouthX, mouthC)}Z`;

  const ledge = `M${pt(-rimX, yTop)}${front}L${pt(rimX, ledgeLow)}A${num(rimX)} ${num(ry)} 0 0 1 ${pt(-rimX, ledgeLow)}Z`;

  const shadowDepth = Math.max(4, h * 0.03);
  const under =
    `M${pt(-rimX, ledgeLow)}A${num(rimX)} ${num(ry)} 0 0 0 ${pt(rimX, ledgeLow)}` +
    `L${pt(rimX, ledgeLow + shadowDepth)}A${num(rimX)} ${num(ry * 1.1)} 0 0 1 ${pt(-rimX, ledgeLow + shadowDepth)}Z`;

  // Chisel planes: broad, flat faces left by the mason, clipped to the body where they are drawn.
  const W = half * 1.1;
  const quad = (points: readonly (readonly [number, number])[]) =>
    "M" + points.map(([x, y]) => pt(x * W, y * h)).join("L") + "Z";
  const litPlanes =
    quad([[-1, 0.04], [-0.5, 0.04], [-0.4, -1.02], [-1, -1.02]]) + quad([[-0.5, 0.04], [0.08, 0.04], [0.04, -0.2], [-0.46, -0.16]]);
  const darkPlanes = quad([[0.5, 0.04], [1, 0.04], [1, -1.02], [0.44, -1.02]]);
  // Rain has run down from the rim for centuries.
  const streaks = [-0.28, 0.1, 0.38]
    .map((at, index) => {
      const x = at * half;
      const length = h * [0.34, 0.58, 0.22][index]!;
      return `M${pt(x, yNeck + 6)}c${num(-2)} ${num(length * 0.3)} ${num(3)} ${num(length * 0.6)} ${num(1)} ${num(length)}`;
    })
    .join("");

  return {
    body,
    top: topPlane,
    mouth,
    ledge,
    under,
    litPlanes,
    darkPlanes,
    streaks,
    box: { x: -W, y: -h - 2, width: W * 2, height: h + 12 },
  };
}

/**
 * A stone lid lying flat on the ground, as they lie beside the jars at the
 * real sites: a thick disc seen from a low angle.
 */
export function stoneLid(rx: number, ry: number, thickness: number): { top: string; side: string } {
  return {
    top: `M${pt(-rx, 0)}A${num(rx)} ${num(ry)} 0 1 0 ${pt(rx, 0)}A${num(rx)} ${num(ry)} 0 1 0 ${pt(-rx, 0)}Z`,
    side: `M${pt(-rx, 0)}A${num(rx)} ${num(ry)} 0 0 0 ${pt(rx, 0)}L${pt(rx * 0.99, thickness)}A${num(rx * 0.99)} ${num(ry)} 0 0 1 ${pt(-rx * 0.99, thickness)}Z`,
  };
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

/**
 * Dots as one path of zero-length segments: drawn with a round-capped stroke,
 * the stroke's width is each dot's size. A quarter of the bytes of circles.
 */
export function specks(points: readonly (readonly [number, number])[]): string {
  return points.map(([x, y]) => `M${pt(x, y)}h0`).join("");
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
