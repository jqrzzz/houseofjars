/**
 * Deckle: the slightly uneven edge of hand-cut paper, for the paper outfit's slabs and walls.
 *
 * Seeded, never random: a mulberry32 generator seeded from the element's id gives the same wobble on every
 * build, so the committed pictures stay byte-stable.
 */
import type { Vec2 } from "./geometry";

/** A run shorter than this (px) stays straight. */
const MIN_RUN = 24;
/** About how far apart (px) the nudged points along a long run are: a slow wobble, cheap in bytes. */
const STEP = 28;

/** mulberry32: a small, fast, seeded generator of numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A 32-bit seed from a string (FNV-1a). */
export function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const key = ([x, y]: Vec2) => `${Math.round(x * 10)},${Math.round(y * 10)}`;

/**
 * A closed polygon's straight runs longer than 24 px, broken into steps of about 28 px, each point in
 * between nudged sideways by up to `max` px. The polygon's own corners never move. Each run is seeded by the
 * id and its two ends, in a fixed order, so a run gets the same nudges whichever way round it is walked:
 * two faces that share an edge still meet without a gap.
 */
export function deckle(points: readonly Vec2[], seed: string, max = 0.6): Vec2[] {
  const out: Vec2[] = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    out.push(a);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len <= MIN_RUN) continue;
    // Walk the run from its canonical start, so both directions draw the same line.
    const ka = key(a);
    const kb = key(b);
    const flip = ka > kb;
    const [p, q] = flip ? [b, a] : [a, b];
    const rnd = mulberry32(seedOf(`${seed}|${flip ? kb : ka}|${flip ? ka : kb}`));
    const steps = Math.max(2, Math.round(len / STEP));
    const nx = -(q[1] - p[1]) / len;
    const ny = (q[0] - p[0]) / len;
    const inner: Vec2[] = [];
    for (let j = 1; j < steps; j++) {
      const t = j / steps;
      const off = (rnd() * 2 - 1) * max;
      inner.push([p[0] + (q[0] - p[0]) * t + nx * off, p[1] + (q[1] - p[1]) * t + ny * off]);
    }
    if (flip) inner.reverse();
    out.push(...inner);
  }
  return out;
}
