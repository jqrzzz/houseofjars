/**
 * A small kit for drawing the illustration set as cut paper with an ink
 * silhouette (docs/DESIGN.md §2.1): flat class fills, card edges, deckle,
 * depth planes mixed toward paper-far, a fibre pattern and stepped halos.
 */
export type Pt = readonly [number, number];

/* ------------------------------------------------------------------ colour */
function hexToRgb(h: string): [number, number, number] {
  const v = h.replace("#", "");
  const s = v.length === 3 ? v.split("").map((c) => c + c).join("") : v;
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255) as [number, number, number];
}
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function oklab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(toLin) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function fromOklab([L, A, B]: [number, number, number]): string {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    "#" +
    rgb
      .map((c) => Math.round(Math.min(1, Math.max(0, toSrgb(c))) * 255))
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}
/** a mixed toward b by t (0..1), in oklab, as CSS color-mix does. */
export function mix(a: string, b: string, t: number): string {
  const x = oklab(a);
  const y = oklab(b);
  return fromOklab([0, 1, 2].map((i) => x[i]! * (1 - t) + y[i]! * t) as [number, number, number]);
}

/* ------------------------------------------------------------------ tokens */
export const T = {
  rice: "#fbf6ee",
  white: "#ffffff",
  stone: "#cdbfaa",
  stoneDark: "#8c7b66",
  teak: "#95623b",
  teakNight: "#5b3f2b",
  lamplight: "#eed079",
  night: "#20150c",
  nightRaised: "#2c1e13",
  jar: "#e76e43",
};
export const INK = { day: "#4a2f1b", evening: "#dccdb6" };
export const FAR = { day: mix(T.rice, T.stone, 0.35), evening: mix(T.night, T.nightRaised, 0.6) };
/** --paper-edge: the card edge by Day; by Evening a lamplight rim. */
export const RIM = mix(T.night, T.lamplight, 0.55);

/** The drawing class sheet: [Day, Evening] fills. */
export const FILLS: Record<string, [string, string]> = {
  c: ["#fbf6ee", "#2c1e13"],
  p: ["#fffaf2", "#3a2b1f"],
  s: ["#e7dac6", "#3a2c20"],
  w: ["#b97440", "#7d4526"],
  wd: ["#8f532c", "#5e3219"],
  b: ["#6f4d35", "#8a6444"],
  a: ["#e76e43", "#e76e43"],
  y: ["#eed079", "#eed079"],
  g: ["#9aa585", "#6f7a60"],
  r: ["#b86a3f", "#8f5334"],
  k: ["#4a2f1b", "#dccdb6"],
  cu: ["#8e867c", "#5d5750"],
  in: ["#f6d58a", "#d9a64a"],
  dusk: ["#f6d9b0", "#3a2618"],
  bank: ["#b5b8ae", "#2e2721"],
  rv: ["#efd6b4", "#2a1e15"],
  rw: ["#e4c6a0", "#231910"],
  sky: ["#f8ead4", "#241810"],
  gold: ["#e9c46a", "#e9c46a"],
  wt: ["#8fa7ad", "#7f969c"],
  /** Stone under the moon: stays pale by Evening. */
  st: ["#e7dac6", mix(T.stoneDark, T.night, 0.3)],
  /** The low sun: apricot, between jar-orange and lamplight, so it never rivals the Book button. */
  sun: [mix(T.jar, T.lamplight, 0.5), mix(T.jar, T.lamplight, 0.5)],
  /** Window glass: pale by Day, lamplit by Evening. */
  win: [mix("#b5b8ae", "#fffaf2", 0.5), "#d9a64a"],
  /** Glints on water: paper-white by Day, lamplight by Evening. */
  gl: ["#fffaf2", mix(T.lamplight, T.night, 0.25)],
  /** A room's wall: rice by Day, glowing with lamplight by Evening. */
  lw: ["#fbf6ee", mix(T.nightRaised, "#d9a64a", 0.45)],
  /** Paper in lamplight: white by Day, warm cream inside a lit room by Evening. */
  lp: ["#fffaf2", mix(T.stone, T.lamplight, 0.35)],
};
/** Card-edge tones by Day: the next darker paper. */
export const EDGES: Record<string, string> = {
  es: mix(T.teak, T.stone, 0.65),
  ew: "#8f532c",
  ed: "#4f3423",
  eg: mix("#9aa585", "#4a2f1b", 0.3),
  ea: "#b9502b",
};
export type Edge = keyof typeof EDGES;

/* -------------------------------------------------------------------- rng */
function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rngFor = (id: string) => mulberry32(hashSeed(id));

/* ----------------------------------------------------------------- numbers */
export function n(v: number): string {
  const r = Math.round(v * 10) / 10;
  const s = (Object.is(r, -0) ? 0 : r).toString();
  return s.replace(/^(-?)0\./, "$1.");
}
const P = (p: Pt) => `${n(p[0])} ${n(p[1])}`;

/* ------------------------------------------------------------------ deckle */
/** Interior points of a straight run, nudged up to `max` across it. */
function deckleRun(a: Pt, b: Pt, rand: () => number, max: number): Pt[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len <= 24 || max <= 0) return [];
  const k = Math.max(2, Math.round(len / 40));
  const nx = -dy / len;
  const ny = dx / len;
  const out: Pt[] = [];
  for (let i = 1; i < k; i++) {
    const t = (i + (rand() - 0.5) * 0.5) / k;
    const j = (rand() * 2 - 1) * max;
    out.push([a[0] + dx * t + nx * j, a[1] + dy * t + ny * j]);
  }
  return out;
}

/**
 * A closed polygon as a path: corners rounded by r (a number or one per
 * vertex), straight runs longer than 24 deckled by up to `max`.
 */
export function polyD(pts: readonly Pt[], id: string, r: number | readonly number[] = 0, max = 0.6, closed = true): string {
  const rand = rngFor(id);
  const N = pts.length;
  const rad = (i: number) => (typeof r === "number" ? r : (r[i] ?? 0));
  const cut = (i: number): [Pt, Pt] => {
    const v = pts[i]!;
    const prev = pts[(i - 1 + N) % N]!;
    const next = pts[(i + 1) % N]!;
    const lp = Math.hypot(prev[0] - v[0], prev[1] - v[1]);
    const ln = Math.hypot(next[0] - v[0], next[1] - v[1]);
    const rr = Math.min(rad(i), lp / 2, ln / 2);
    const a: Pt = [v[0] + ((prev[0] - v[0]) / lp) * rr, v[1] + ((prev[1] - v[1]) / lp) * rr];
    const b: Pt = [v[0] + ((next[0] - v[0]) / ln) * rr, v[1] + ((next[1] - v[1]) / ln) * rr];
    return [a, b];
  };
  if (!closed) {
    let d = `M${P(pts[0]!)}`;
    for (let i = 1; i < N; i++) {
      for (const q of deckleRun(pts[i - 1]!, pts[i]!, rand, max)) d += `L${P(q)}`;
      d += `L${P(pts[i]!)}`;
    }
    return d;
  }
  const cuts = pts.map((_, i) => cut(i));
  let d = `M${P(cuts[0]![1])}`;
  for (let k = 1; k <= N; k++) {
    const i = k % N;
    const from = cuts[k - 1]![1];
    const [a, b] = cuts[i]!;
    for (const q of deckleRun(from, a, rand, max)) d += `L${P(q)}`;
    const rr = rad(i);
    if (rr > 0) d += `L${P(a)}Q${P(pts[i]!)} ${P(b)}`;
    else d += `L${P(pts[i]!)}`;
  }
  return d.replace(/L([^LQZM]+)$/, "") + "Z";
}

export function rectPts(x: number, y: number, w: number, h: number): Pt[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

/* ------------------------------------------------------------------- art */
export interface Opts {
  edge?: Edge;
  /** Also lays the paper fibre over this plane. */
  fibre?: boolean;
  id?: string;
  r?: number | readonly number[];
  max?: number;
  extra?: string;
}

export class Art {
  readonly body: string[] = [];
  private fibreIds: string[] = [];
  private uid = 0;
  fullFibre = false;
  css = "";

  constructor(
    readonly name: string,
    readonly viewBox: readonly [number, number, number, number],
    readonly size: readonly [number, number],
  ) {}

  add(s: string): this {
    this.body.push(s);
    return this;
  }

  /** Any path; large planes get a card edge and the fibre. */
  path(d: string, cls: string, o: Opts = {}): this {
    if (o.edge) this.body.push(`<path class="e ${o.edge}" d="${d}"/>`);
    let id = "";
    if (o.edge || o.fibre) {
      id = `q${++this.uid}`;
      this.fibreIds.push(id);
    }
    this.body.push(`<path${id ? ` id="${id}"` : ""} class="${cls}" d="${d}"${o.extra ?? ""}/>`);
    return this;
  }

  poly(pts: readonly Pt[], cls: string, o: Opts = {}): this {
    const id = o.id ?? `${this.name}:${pts.map(P).join(",")}:${cls}`;
    return this.path(polyD(pts, id, o.r ?? 0, o.max ?? 0.6), cls, o);
  }

  rect(x: number, y: number, w: number, h: number, cls: string, o: Opts = {}): this {
    return this.poly(rectPts(x, y, w, h), cls, o);
  }

  /** An open polyline (deckled), e.g. a rail or a ground line. */
  line(pts: readonly Pt[], cls: string, o: Opts = {}): this {
    const id = o.id ?? `${this.name}:L:${pts.map(P).join(",")}`;
    return this.path(polyD(pts, id, 0, o.max ?? 0.6, false), cls, o);
  }

  circle(cx: number, cy: number, r: number, cls: string, extra = ""): this {
    return this.add(`<circle class="${cls}" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"${extra}/>`);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, cls: string, extra = ""): this {
    return this.add(`<ellipse class="${cls}" cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}"${extra}/>`);
  }

  /** A stepped halo: four rings, each adding 7%, around a core of radius r. */
  halo(cx: number, cy: number, r: number, step: number, cls = "hl"): this {
    for (let i = 4; i >= 1; i--) this.circle(cx, cy, r + step * i, cls);
    return this;
  }

  /** A stepped light cone: four nested trapezoids from a lamp down to a pool. */
  cone(top: readonly [number, number, number], bottom: readonly [number, number, number], cls = "hl"): this {
    const [tx, ty, tw] = top;
    const [bx, by, bw] = bottom;
    for (let i = 0; i < 4; i++) {
      const f = 1 - i * 0.2;
      const twi = tw * (0.7 + 0.3 * f);
      const bwi = bw * f;
      const byi = ty + (by - ty) * (1 - i * 0.07);
      this.add(
        `<path class="${cls}" d="M${n(tx - twi / 2)} ${n(ty)}H${n(tx + twi / 2)}L${n(bx + bwi / 2)} ${n(byi)}H${n(bx - bwi / 2)}Z"/>`,
      );
    }
    return this;
  }

  /** A cut-paper cloud: a flat bottom and three soft bumps, w wide, with its card edge. */
  cloud(x: number, y: number, w: number, cls = "p f"): this {
    const h = w * 0.32;
    const d =
      `M${n(x)} ${n(y)}` +
      `C${n(x - h * 0.5)} ${n(y)} ${n(x - h * 0.5)} ${n(y - h * 0.62)} ${n(x + w * 0.12)} ${n(y - h * 0.58)}` +
      `C${n(x + w * 0.16)} ${n(y - h * 1.18)} ${n(x + w * 0.46)} ${n(y - h * 1.3)} ${n(x + w * 0.52)} ${n(y - h * 0.8)}` +
      `C${n(x + w * 0.6)} ${n(y - h * 1.12)} ${n(x + w * 0.86)} ${n(y - h * 1.02)} ${n(x + w * 0.86)} ${n(y - h * 0.5)}` +
      `C${n(x + w + h * 0.3)} ${n(y - h * 0.5)} ${n(x + w + h * 0.3)} ${n(y)} ${n(x + w)} ${n(y)}Z`;
    return this.path(d, cls, { edge: "es" });
  }

  open(attrs: string): this {
    return this.add(`<g ${attrs}>`);
  }

  close(): this {
    return this.add(`</g>`);
  }

  toString(): string {
    const [vx, vy, vw, vh] = this.viewBox;
    const [w, h] = this.size;
    const body = this.body.join("");
    const used = new Set<string>();
    for (const m of body.matchAll(/class="([^"]+)"/g)) for (const c of m[1]!.split(" ")) used.add(c);
    const fibreTile =
      `<pattern id="f" width="24" height="24" patternUnits="userSpaceOnUse">` +
      `<path class="fb" d="M2 3l5 1M14 2l3 4M8 10l6-1M19 12l1 6M3 17l5 2M12 19l6-2"/></pattern>`;
    let fibre = "";
    let defs = fibreTile;
    if (this.fullFibre) {
      fibre = `<rect x="${n(vx)}" y="${n(vy)}" width="${n(vw)}" height="${n(vh)}" fill="url(#f)"/>`;
    } else if (this.fibreIds.length) {
      defs += `<clipPath id="k">${this.fibreIds.map((id) => `<use href="#${id}"/>`).join("")}</clipPath>`;
      fibre = `<rect x="${n(vx)}" y="${n(vy)}" width="${n(vw)}" height="${n(vh)}" fill="url(#f)" clip-path="url(#k)"/>`;
    }
    used.add("fb");
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(vx)} ${n(vy)} ${n(vw)} ${n(vh)}" width="${w}" height="${h}">` +
      `<style>${sheet(used, this.css)}</style><defs>${defs}</defs>${body}${fibre}</svg>`
    );
  }
}

/* -------------------------------------------------------------- the sheet */
function far(hex: string, theme: "day" | "evening", t: number): string {
  return mix(hex, FAR[theme], t);
}

/** Only the rules a drawing uses, Day first, then its night colours. */
export function sheet(used: Set<string>, extra = ""): string {
  const day: string[] = [];
  const night: string[] = [];
  const ink2d = far(INK.day, "day", 0.45);
  const ink2e = far(INK.evening, "evening", 0.45);
  const has = (...c: string[]) => c.some((x) => used.has(x));

  // Ink: silhouettes 1.5, inner detail 1 at 60%.
  const strokes = ["f", "l", "h"].filter((c) => used.has(c));
  if (strokes.length) {
    day.push(`${strokes.map((c) => "." + c).join(",")}{stroke:${INK.day};stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}`);
    night.push(`${strokes.map((c) => "." + c).join(",")}{stroke:${INK.evening}}`);
  }
  const strokes2 = ["f2", "l2", "h2"].filter((c) => used.has(c));
  if (strokes2.length) {
    day.push(`${strokes2.map((c) => "." + c).join(",")}{stroke:${ink2d};stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}`);
    night.push(`${strokes2.map((c) => "." + c).join(",")}{stroke:${ink2e}}`);
  }
  const wide = ["f", "l", "f2", "l2"].filter((c) => used.has(c));
  if (wide.length) day.push(`${wide.map((c) => "." + c).join(",")}{stroke-width:1.5}`);
  const none = ["l", "h", "l2", "h2"].filter((c) => used.has(c));
  if (none.length) day.push(`${none.map((c) => "." + c).join(",")}{fill:none}`);
  const thin = ["h", "h2"].filter((c) => used.has(c));
  if (thin.length) day.push(`${thin.map((c) => "." + c).join(",")}{stroke-width:1;stroke-opacity:.6}`);
  if (used.has("d")) day.push(`.d{stroke-dasharray:3 4}`);

  // Fills, and their back-plane twins (name + "2": 25% toward paper-far; "3": 45%).
  for (const c of used) {
    const m = /^([a-z]+)([234])?$/.exec(c);
    if (!m) continue;
    const base = FILLS[m[1]!];
    if (!base) continue;
    const t = m[2] === "2" ? 0.25 : m[2] === "3" ? 0.45 : m[2] === "4" ? 0.62 : 0;
    const dv = t ? far(base[0], "day", t) : base[0];
    const ev = t ? far(base[1], "evening", t) : base[1];
    day.push(`.${c}{fill:${dv}}`);
    if (ev !== dv) night.push(`.${c}{fill:${ev}}`);
  }

  // Card edges: offset (1.5, 1.5) in the next darker tone; by Evening a lamplight rim at (0, -1.5).
  const edges = Object.keys(EDGES).filter((e) => used.has(e));
  if (edges.length) {
    day.push(`.e{transform:translate(1.5px,1.5px)}`);
    for (const e of edges) day.push(`.${e}{fill:${EDGES[e]}}`);
    night.push(`.e{transform:translate(0,-1.5px);fill:${RIM}}`);
  }
  // Light: stepped rings, each adding 7%; by Day the core gets a teak ring.
  if (has("hl")) {
    day.push(`.hl{fill:${T.lamplight};opacity:.07}`);
  }
  if (has("gr")) {
    day.push(`.gr{fill:none;stroke:${T.teak};stroke-width:1;vector-effect:non-scaling-stroke}`);
    night.push(`.gr{stroke:none}`);
  }
  // Day-only and Evening-only pieces (the sun, the moon, lit windows).
  if (has("ev")) {
    day.push(`.ev{display:none}`);
    night.push(`.ev{display:inline}`);
  }
  if (has("dn")) night.push(`.dn{display:none}`);
  // Paper fibre: six hairlines a tile, at 5% ink.
  day.push(`.fb{fill:none;stroke:${INK.day};stroke-opacity:.05}`);
  night.push(`.fb{stroke:${INK.evening}}`);

  return mergeRules(day).join("") + extra + `@media (prefers-color-scheme:dark){${mergeRules(night).join("")}}`;
}

/** Joins rules with the same declarations, keeping first-seen order. */
function mergeRules(rules: string[]): string[] {
  const order: string[] = [];
  const by = new Map<string, string[]>();
  for (const r of rules) {
    const i = r.indexOf("{");
    const sel = r.slice(0, i);
    const decl = r.slice(i);
    if (!by.has(decl)) {
      by.set(decl, []);
      order.push(decl);
    }
    by.get(decl)!.push(sel);
  }
  return order.map((d) => `${by.get(d)!.join(",")}${d}`);
}
