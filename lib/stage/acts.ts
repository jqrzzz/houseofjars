/*
 * The paper stage's clock (docs/DESIGN.md §4.3, §5.1). Pure and client-safe:
 * no imports, so a page, the stage and a test can all read the same timing.
 *
 * A walk's thread is drawn over one act of a scroll timeline (the home
 * theatre's Act C). The thread reaches stop k when the act is at its `at`
 * (the share of the walk's drawn length), so stop k lights at
 * c0 + (c1 - c0) * at: 45 + 50 * at in the home theatre. After each stop it
 * rests a moment, then walks on to the next.
 */

/** The share of a walk a stop sits at (0 to 1), with its label. StageStop from lib/house/paper fits. */
export interface ClockStop {
  readonly label: string;
  readonly at: number;
}

/** A corner of the walk's clock: at act progress u (0 to 1) the thread has drawn share p of the walk. */
export interface ClockPoint {
  readonly u: number;
  readonly p: number;
}

/** How long the thread rests at a stop, as a share of the act: at most this, and never more than 40% of the way to the next stop. */
export const HOLD = 0.04;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const round = (v: number, places = 2) => {
  const k = 10 ** places;
  const r = Math.round(v * k) / k;
  return r === 0 ? 0 : r;
};

/**
 * The walk's clock, piecewise linear from (0, 0) to (1, 1): it passes through
 * (at, at) at each stop, rests there for a hold, then walks faster to the
 * next stop's (at, at). Stops must be in walking order.
 */
export function walkClock(stops: readonly { readonly at: number }[], hold = HOLD): ClockPoint[] {
  const ats = stops.map((s) => clamp01(s.at));
  for (let k = 1; k < ats.length; k++) {
    if (ats[k]! < ats[k - 1]!) throw new Error("walkClock: stops must be in walking order");
  }
  const points: ClockPoint[] = [{ u: 0, p: 0 }];
  const push = (u: number, p: number) => {
    const last = points[points.length - 1]!;
    if (Math.abs(last.u - u) < 1e-9 && Math.abs(last.p - p) < 1e-9) return;
    points.push({ u, p });
  };
  ats.forEach((at, k) => {
    push(at, at);
    const next = ats[k + 1] ?? 1;
    const rest = Math.min(hold, (next - at) * 0.4);
    if (at < 1 && rest > 0) push(at + rest, at);
  });
  push(1, 1);
  return points;
}

/** The share of the walk drawn at act progress u. */
export function shareAt(clock: readonly ClockPoint[], u: number): number {
  const t = clamp01(u);
  for (let i = 1; i < clock.length; i++) {
    const a = clock[i - 1]!;
    const b = clock[i]!;
    if (t <= b.u) return b.u === a.u ? b.p : a.p + ((t - a.u) / (b.u - a.u)) * (b.p - a.p);
  }
  return 1;
}

/** The act progress at which the thread first reaches share p of the walk. */
export function actAt(clock: readonly ClockPoint[], p: number): number {
  const t = clamp01(p);
  for (let i = 1; i < clock.length; i++) {
    const a = clock[i - 1]!;
    const b = clock[i]!;
    if (t <= b.p && b.p > a.p) return a.u + ((t - a.p) / (b.p - a.p)) * (b.u - a.u);
    if (t <= b.p) return a.u;
  }
  return 1;
}

/**
 * Per stop, the stretch of the timeline while it is the current stop: from
 * the moment the thread reaches it (c0 + (c1 - c0) * at) until it reaches the
 * next one, the last until the end of the timeline. `c` is the walk's act in
 * percent of the timeline, [45, 95] in the home theatre; `range` is an
 * animation-range value on the named range `timeline` ("contain").
 */
export function actRanges(
  stops: readonly ClockStop[],
  c: readonly [number, number],
  timeline = "contain",
): { label: string; range: string; from: number; to: number }[] {
  const [c0, c1] = c;
  if (!(c0 >= 0 && c1 <= 100 && c0 < c1)) throw new Error(`actRanges: [${c0}, ${c1}] is not a stretch of 0–100%`);
  const arrive = stops.map((s) => round(c0 + (c1 - c0) * clamp01(s.at)));
  return stops.map((s, k) => {
    const from = arrive[k]!;
    const to = k + 1 < stops.length ? arrive[k + 1]! : 100;
    return { label: s.label, range: `${timeline} ${from}% ${timeline} ${to}%`, from, to };
  });
}

/** One keyframe: its offset in percent and its declarations. */
export interface Frame {
  readonly at: number;
  readonly css: string;
}

/** A @keyframes rule, compact; frames that share declarations next to each other share a selector. */
export function keyframes(name: string, frames: readonly Frame[]): string {
  const sorted = [...frames].sort((a, b) => a.at - b.at);
  let body = "";
  for (let i = 0; i < sorted.length; i++) {
    const offsets = [round(sorted[i]!.at)];
    while (i + 1 < sorted.length && sorted[i + 1]!.css === sorted[i]!.css) offsets.push(round(sorted[++i]!.at));
    body += `${[...new Set(offsets)].map((o) => `${o}%`).join(",")}{${sorted[i]!.css}}`;
  }
  return `@keyframes ${name}{${body}}`;
}

/** The corners of a clock with the moments its walk crosses the shares in `cuts` added, so a value clamped there stays exact. */
function cornersWith(clock: readonly ClockPoint[], cuts: readonly number[]): ClockPoint[] {
  const extra = cuts.map((p) => ({ u: actAt(clock, p), p: clamp01(p) }));
  return [...clock, ...extra].sort((a, b) => a.u - b.u || a.p - b.p);
}

/** Thins frames whose value lies on the straight line between its neighbours, and repeats. */
function thin(points: readonly { u: number; v: number }[]): { u: number; v: number }[] {
  const out: { u: number; v: number }[] = [];
  for (const pt of points) {
    if (out.length > 0 && Math.abs(out[out.length - 1]!.u - pt.u) < 1e-6) {
      out[out.length - 1] = pt;
      continue;
    }
    out.push(pt);
    while (out.length >= 3) {
      const [a, b, c] = out.slice(-3) as [{ u: number; v: number }, { u: number; v: number }, { u: number; v: number }];
      const expected = a.v + ((b.u - a.u) / (c.u - a.u)) * (c.v - a.v);
      if (Math.abs(expected - b.v) > 1e-4) break;
      out.splice(out.length - 2, 1);
    }
  }
  return out;
}

/**
 * A floor's thread over the walk's act: its path (pathLength 1) draws from
 * stroke-dashoffset 1 to 0 while the walk is on that floor ([a, b] of the walk),
 * resting where the walk rests. Frames in percent of the act.
 */
export function threadFrames(clock: readonly ClockPoint[], share: readonly [number, number]): Frame[] {
  const [a, b] = share;
  const local = (p: number) => (b > a ? clamp01((p - a) / (b - a)) : p >= b ? 1 : 0);
  const pts = thin(cornersWith(clock, [a, b]).map(({ u, p }) => ({ u, v: round(1 - local(p), 4) })));
  return pts.map(({ u, v }) => ({ at: u * 100, css: `stroke-dashoffset:${v}` }));
}

/**
 * The bead on a floor's thread: it rides the floor's path (offset-distance)
 * while the walk is on that floor, fading in as the walk arrives there and out
 * as it leaves. `last` keeps it in sight at the end of the walk, on the last stop.
 */
export function beadFrames(clock: readonly ClockPoint[], share: readonly [number, number], last: boolean): Frame[] {
  const [a, b] = share;
  const fade = 0.015;
  const local = (p: number) => (b > a ? clamp01((p - a) / (b - a)) : 1);
  const ua = actAt(clock, a);
  const ub = actAt(clock, b);
  const corners = cornersWith(clock, [a, b]).filter(({ u }) => u >= ua - 1e-9 && u <= ub + 1e-9);
  const frames: Frame[] = thin(corners.map(({ u, p }) => ({ u, v: round(local(p) * 100, 2) }))).map(({ u, v }) => ({
    at: u * 100,
    css: `offset-distance:${v}%`,
  }));
  if (ua > 0) frames.push({ at: 0, css: "offset-distance:0%" });
  if (ub < 1) frames.push({ at: 100, css: "offset-distance:100%" });
  const shown = Math.min(ub, ua + fade);
  frames.push({ at: 0, css: "opacity:0" }, { at: ua * 100, css: "opacity:0" }, { at: shown * 100, css: "opacity:1" });
  if (last) frames.push({ at: 100, css: "opacity:1" });
  else frames.push({ at: Math.max(shown, ub - fade) * 100, css: "opacity:1" }, { at: ub * 100, css: "opacity:0" }, { at: 100, css: "opacity:0" });
  return frames.sort((x, y) => x.at - y.at);
}

/**
 * Something that comes on when the thread reaches share p (a stop's ring, a
 * lamp it passes): it waits in its start pose (`wait`) and settles to `rest`
 * over the last `lead` of the act before the thread arrives. With `ahead` it
 * shows that pose from early in the act until then (a ring seen faintly before
 * the thread reaches it).
 */
export function arriveFrames(clock: readonly ClockPoint[], p: number, o: { wait: string; rest: string; lead?: number; ahead?: string }): Frame[] {
  const u = actAt(clock, p);
  const start = Math.max(0, u - (o.lead ?? 0.025));
  const frames: Frame[] = [{ at: 0, css: o.wait }];
  if (o.ahead) frames.push({ at: Math.min(4, start * 100), css: o.ahead });
  frames.push({ at: start * 100, css: o.ahead ?? o.wait }, { at: u * 100, css: o.rest });
  return frames;
}

/** Where a point falls along a polyline path "M x y L x y …" (as the thread's paths are written), as a share of its length. */
export function shareAlong(d: string, point: readonly [number, number]): { share: number; distance: number } {
  const nums = (d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number);
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i]!, nums[i + 1]!]);
  if (pts.length < 2) return { share: 0, distance: pts[0] ? Math.hypot(pts[0][0] - point[0], pts[0][1] - point[1]) : Infinity };
  let total = 0;
  const lengths = pts.slice(1).map((b, i) => {
    const a = pts[i]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    total += len;
    return len;
  });
  let best = { share: 0, distance: Infinity };
  let along = 0;
  pts.slice(1).forEach((b, i) => {
    const a = pts[i]!;
    const len = lengths[i]!;
    const t = len > 0 ? clamp01(((point[0] - a[0]) * (b[0] - a[0]) + (point[1] - a[1]) * (b[1] - a[1])) / (len * len)) : 0;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    const distance = Math.hypot(x - point[0], y - point[1]);
    if (distance < best.distance - 1e-9) best = { share: total > 0 ? (along + len * t) / total : 0, distance };
    along += len;
  });
  return best;
}

/** What a scroll stage's keyframes need to know of its walk: each stop's share, each floor's stretch, the floor it ends on, and the shares at which its lights come on. */
export interface StageClock {
  readonly ats: readonly number[];
  readonly shares: Readonly<Record<string, readonly [number, number]>>;
  readonly last?: string;
  readonly lights: readonly number[];
}

/** The name of the keyframes a light at share `share` of the walk plays on stage `p`: lights that come on together share them. */
export const lightName = (p: string, share: number) => `${p}l${Math.round(share * 100)}`;

/**
 * The keyframes a scroll stage plays inside Act C, named after the stage (its
 * prefix `p`), so two stages on a page never share them: per floor its thread
 * (`{p}t-{floor}`) and bead (`{p}b-{floor}`), per stop its ring (`{p}r{k}`),
 * and one per moment a light comes on (lightName). Pure, so the stage can
 * write them wherever it renders.
 */
export function stageKeyframes(p: string, c: StageClock): string {
  const clock = walkClock(c.ats.map((at) => ({ at })));
  let css = "";
  for (const [floor, share] of Object.entries(c.shares)) {
    css += keyframes(`${p}t-${floor}`, threadFrames(clock, share));
    css += keyframes(`${p}b-${floor}`, beadFrames(clock, share, floor === c.last));
  }
  c.ats.forEach((at, k) => {
    css += keyframes(`${p}r${k}`, arriveFrames(clock, at, { wait: "opacity:0;scale:.6", ahead: "opacity:.5;scale:.6", rest: "opacity:1;scale:1" }));
  });
  const named = new Set<string>();
  for (const share of c.lights) {
    const name = lightName(p, share);
    if (named.has(name)) continue;
    named.add(name);
    const at = Math.round(share * 100) / 100;
    css += keyframes(name, arriveFrames(clock, at, { wait: "opacity:0;scale:.9", rest: "opacity:1;scale:1", lead: 0.03 }));
  }
  return css;
}
