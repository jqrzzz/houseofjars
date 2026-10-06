import { Art, n, polyD, rngFor, type Pt } from "../lib";

type Quad = readonly [Pt, Pt, Pt, Pt];

/** The projective map of the unit square onto a quad (TL, TR, BR, BL), so the grid keeps the photo's perspective. */
function proj([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]: Quad): (u: number, v: number) => Pt {
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const sx = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  return (u, v) => {
    const w = g * u + h * v + 1;
    return [(a * u + b * v + x0) / w, (d * u + e * v + y0) / w];
  };
}

const P = ([x, y]: Pt) => `${n(x)} ${n(y)}`;
type ToFrame = (u: number, v: number) => Pt;
/** A path written in a niche's own unit square: numbers pair up as (u, v) and are mapped into the frame. */
const mapPath = (src: string, f: ToFrame) =>
  src.replace(/(-?\d*\.?\d+)[ ,](-?\d*\.?\d+)/g, (_, u: string, v: string) => P(f(+u, +v)));
/** A unit-square coordinate, kept fine until it is mapped. */
const k = (v: number) => v.toFixed(3);

/*
 * The 28 niches: 4 columns by 7 rows of square openings, measured off the photo
 * as the corners of the whole array, with dividers about a quarter of a niche wide.
 */
const GRID = proj([
  [72.5, 71.4],
  [255.8, 57.3],
  [280.8, 311],
  [20.8, 317.8],
]);
const W = 1 / (4 + 3 * 0.23);
const T = W * 0.23;
const H = 1 / (7 + 6 * 0.18);
const S = H * 0.18;
const cell =
  (r: number, c: number): ToFrame =>
  (u, v) =>
    GRID(c * (W + T) + u * W, r * (H + S) + v * H);

/**
 * The jars as they sit, row by row from the top (null: the one empty niche). Tones follow
 * the photo: warm greys, grey-brown, sage, a blue-grey, buff, apricot and terracotta, and
 * a few pale ones.
 */
const JARS: readonly (readonly (string | null)[])[] = [
  ["cu", null, "b3", "cu"],
  ["in4", "g2", "b3", "cu"],
  ["r3", "st", "r3", "st"],
  ["b3", "cu", "b3", "r2"],
  ["wt2", "st", "in4", "r3"],
  ["cu", "lp3", "r2", "r2"],
  ["cu", "lp3", "g", "b3"],
];
/**
 * The light falls on the jars from the left: each has a cheek one paper step lighter. A
 * step that is lighter by Day turns darker by Evening, so most jars have a Day cheek and an
 * Evening cheek; a few pale tones are lighter in both.
 */
const CHEEK: Record<string, readonly string[]> = {
  cu: ["cu2 dn", "st ev"],
  b3: ["b4 dn", "b2 ev"],
  in4: ["lp3"],
  g2: ["g3 dn", "g ev"],
  g: ["g2 dn", "lp3 ev"],
  r3: ["r4 dn", "r2 ev"],
  st: ["lp3"],
  r2: ["r3 dn", "r ev"],
  wt2: ["wt3 dn", "wt ev"],
  lp3: ["lp2"],
};

/** One clay jar in its niche: a round belly, a short neck and an everted lip, its foot hidden by the sill. */
function jar(rand: () => number): { body: string; cheek: string; line: string } {
  const j = (s: number) => (rand() - 0.5) * s;
  const cx = 0.49 + j(0.04);
  const nw = 0.5 + j(0.06);
  const nl = cx - nw / 2;
  const nr = cx + nw / 2;
  const sv = 0.31 + j(0.04);
  const rt = 0.2 + j(0.03);
  const bl = 0.03 + j(0.03);
  const br = 0.97 + j(0.03);
  const left =
    `M${k(bl + 0.05)} 1.12C${k(bl + 0.02)} 1 ${k(bl)} .92 ${k(bl)} .8` +
    `C${k(bl)} .56 ${k(nl - 0.13)} ${k(sv + 0.05)} ${k(nl)} ${k(sv)}`;
  const body =
    left +
    `L${k(nl + 0.015)} .275 ${k(nl - 0.025)} .262Q${k(nl - 0.035)} ${k(rt + 0.01)} ${k(nl - 0.01)} ${k(rt)}` +
    `L${k(nr + 0.01)} ${k(rt)}Q${k(nr + 0.035)} ${k(rt + 0.01)} ${k(nr + 0.025)} .262L${k(nr - 0.015)} .275 ${k(nr)} ${k(sv)}` +
    `C${k(nr + 0.13)} ${k(sv + 0.05)} ${k(br)} .56 ${k(br)} .8C${k(br)} .92 ${k(br - 0.02)} 1 ${k(br - 0.05)} 1.12Z`;
  const cheek = left + `C${k(nl + 0.1)} ${k(sv + 0.14)} ${k(bl + 0.38)} .6 ${k(bl + 0.3)} 1.12Z`;
  const line =
    `M${k(nl - 0.025)} .262Q${k(cx)} .3 ${k(nr + 0.025)} .262` + `M${k(nl)} ${k(sv)}Q${k(cx)} ${k(sv + 0.06)} ${k(nr)} ${k(sv)}`;
  return { body, cheek, line };
}

/**
 * The lamp sits 18 units left of its spot in the photo, so its shade stays whole inside the
 * arch mat on /about (which shows only x 40–440 of the drawing, rounded at the top).
 */
const LAMP = 18;

/** The lit roof of a niche, cut off by the shadow of its side. */
const WEDGE = "M0 0L.58 0 .14 .27 0 .27Z";

/** The wall of jars on the stairs: 28 niches under the ceiling, 27 jars, the stone-shade lamp lit on the side wall. */
export default function wallOfJars(): Art {
  const a = new Art("wall-of-jars", [0, 0, 480, 600], [480, 600]);
  a.fullFibre = true;

  // Back: the side wall that carries the lamp (laid wide, under the planes in front of it),
  // lit round the lamp by its stepped glow; then the ceiling.
  a.poly([[300, -2], [482, -2], [482, 602], [300, 602]], "r3");
  a.halo(432 - LAMP, 126, 16, 13);
  const ceiling: Pt[] = [[-2, -2], [323.5, -2], [322.2, 48.5], [-2, 74.6]];
  a.poly(ceiling, "sky dn");
  a.poly(ceiling, "sun2 ev");

  // Behind the wall of jars: the dark of the niches, the lit roof of each, and the jars.
  const back = [GRID(-0.012, -0.006), GRID(1.012, -0.006), GRID(1.012, 1.006), GRID(-0.012, 1.006)];
  a.poly(back, "b dn");
  a.poly(back, "c ev");
  let wedges = "";
  for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) wedges += mapPath(WEDGE, cell(r, c));
  a.path(wedges, "r3");
  // The empty niche: its back wall in the lamplight beside the shadow of its side.
  a.path(mapPath("M.12 .27L1 .27 1 1 .55 1Z", cell(0, 1)), "wd");
  const rand = rngFor("wall-of-jars:jars");
  const bodies = new Map<string, string>();
  const cheeks = new Map<string, string>();
  const put = (m: Map<string, string>, cls: string, d: string) => m.set(cls, (m.get(cls) ?? "") + d);
  let lines = "";
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 4; c++) {
      const tone = JARS[r]![c];
      if (!tone) continue;
      const f = cell(r, c);
      const { body, cheek, line } = jar(rand);
      put(bodies, `${tone} f2`, mapPath(body, f));
      const lit = mapPath(cheek, f);
      for (const cls of CHEEK[tone]!) put(cheeks, cls, lit);
      lines += mapPath(line, f);
    }
  }
  for (const [cls, d] of bodies) a.path(d, cls);
  for (const [cls, d] of cheeks) a.path(d, cls);
  a.path(lines, "h2");

  // The wall itself: one sheet of ochre plaster with 28 square holes cut in it.
  let wall = polyD([[-2, 74.6], [322.2, 48.5], [375.8, 316.4], [376, 330], [-2, 336]], "wall-of-jars:wall");
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 4; c++) {
      const f = cell(r, c);
      wall += `M${P(f(0, 0))}L${P(f(0, 1))} ${P(f(1, 1))} ${P(f(1, 0))}Z`;
    }
  }
  a.path(wall, "sun3 f", { edge: "es" });

  // Below the jars: the plastered underside of the stairs, the soffit's shadow, and the landing's edge.
  a.poly([[-2, 362], [377, 355], [412.5, 602], [-2, 602]], "r3 f");
  a.poly([[-2, 345], [376, 338], [377.5, 367], [-2, 377]], "w2");
  a.poly([[-2, 324], [375.8, 316.4], [376, 342.5], [-2, 351]], "wd f", { edge: "ed" });
  // The lamp's cable, clipped down the side wall and along the landing's edge.
  a.line([[423 - LAMP, 168], [372, 345], [60, 353.5]], "h", { max: 0 });
  let clips = "";
  for (let i = 1; i < 11; i++) clips += `M${n(423 - LAMP - (51 - LAMP) * (i / 11))} ${n(168 + 177 * (i / 11))}h.1`;
  for (let x = 354; x > 70; x -= 17.5) clips += `M${n(x)} ${n(345 + ((372 - x) / 312) * 8.5)}h.1`;
  a.path(clips, "l");

  // The stone-shade wall lamp, seen from below: the black back plate, the stone shade glowing on its base.
  a.open(`transform="translate(${-LAMP} 0)"`);
  a.poly([[443, 113], [446, 87.5], [450.5, 87], [470, 146], [467, 181], [458, 187.5], [450, 187]], "b f", { r: 1 });
  a.path("M413 141V121Q413 112 432.5 112Q452 112 452 121V141Z", "y f");
  a.path("M418 129 446 119M418 136 446 126", "h");
  a.poly([[413, 145], [418, 139.5], [462, 139.5], [467, 145], [467, 161], [461, 168], [413, 168]], "b f", { r: 1 });
  a.close();

  // Near: the stair's side wall on the left, the dark of the stairs beyond, and the cap of the balustrade.
  const gap: Pt[] = [[87.2, 535], [106.5, 538], [90.6, 571.5]];
  a.poly(gap, "b dn");
  a.poly(gap, "c ev");
  a.poly([[-2, -2], [37.9, -2], [93.4, 602], [-2, 602]], "wd f", { edge: "ed" });
  a.poly([[156.5, 540], [160.5, 546], [160, 579], [151, 602], [141, 602]], "w2 f");
  a.poly([[106.5, 538], [156.5, 540], [141, 602], [77, 602]], "sun4 f", { edge: "ew" });
  return a;
}
