import { MARK_PATH } from "../../../components/brand/mark-shape";
import { Art, n, type Pt } from "../lib";

/** Maps (u, v) on a flat board (0..1 each way) onto the quad p0 p1 p2 p3 (top left, top right, bottom right, bottom left) in perspective. */
function board(p0: Pt, p1: Pt, p2: Pt, p3: Pt): (u: number, v: number) => Pt {
  const [x0, y0] = p0;
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [x3, y3] = p3;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3;
  const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
  return (u, v) => {
    const w = g * u + h * v + 1;
    return [(a * u + b * v + x0) / w, (d * u + e * v + y0) / w];
  };
}

const P = (p: Pt) => `${n(p[0])} ${n(p[1])}`;

/**
 * The sign's words as glyph outlines in the site's fonts (Noto Sans Lao 500, Figtree 600): relative path data,
 * y down, baseline at 0, 100 units to the em. `ink` is the right edge of the inked letters, `top` the height of
 * the main letters (cap height; x-height for the Lao), over which each line is fitted to the board's perspective.
 */
const WORDS = {
  lao: { d: "m19,1q-5,0-8-3q-4-2-4-9v-44h11v44q0,2,1,3q1,1,3,1q1,0,2,0q1-1,2-1l1,7q-2,1-4,2q-2,0-4,0zm40,0q-8,0-13-2q-6-2-8-6q-3-4-3-8q0-3,1-5q1-3,3-4l8,4q-1,1-2,2q0,1,0,3q0,2,1,3q1,2,2,3q2,1,5,1q2,1,6,1q4,0,8-1q3-1,4-3q2-2,2-5q0-3-2-4q-2-2-6-3q-3-2-9-3q-6-2-11-4q-5-2-7-5q-3-3-3-8q0-5,2-7q2-3,5-5q3-1,7-1q4,0,7,1q3,1,5,2q3,2,5,3q2,1,4,1q2,0,3-1q0-1,0-3v-2h10v3q0,4-1,6q-2,3-4,4q-2,1-5,1q-3,0-6-1q-3-1-6-2q-3-1-6-2q-2-1-5-1q-2,0-3,1q-2,1-2,3q0,2,2,4q2,1,5,3q3,1,8,2q5,1,9,3q4,1,7,3q4,2,5,5q2,3,2,7q0,5-2,9q-3,3-8,6q-6,2-14,2zm51-64q-4,0-8-1q-3-1-5-4q-2-2-2-5q0-5,3-8q3-3,8-4q5-2,11-2q6,0,11,2q5,2,8,4q3,3,3,7q0,1,0,3q-1,1-3,2v0q1,0,3,0q2-1,3-1h2v7h-19l-2-5q1,0,2,0q1-1,2-1q1-1,2-2q1-1,1-2q0-3-3-5q-4-2-10-2q-6,0-10,2q-3,2-3,5q0,1,1,2q1,1,2,2q1,0,2,1q2,0,2,0zm7-6q-2,0-3-1q-1-1-1-3q0-2,1-3q1-1,3-1q2,0,3,1q1,1,1,3q0,2-1,3q-1,1-3,1zm3,70q-7,0-12-2q-6-2-9-6q-3-4-3-9q0-2,0-3q1-2,2-3l8,3q0,1,0,1q-1,1-1,2q0,2,2,4q3,2,6,3q3,2,7,2q5,0,9-3q3-2,5-6q2-5,2-11q0-10-5-15q-4-5-12-5q-6,0-10,2q-3,2-3,6q0,3,3,6q3,2,9,2q3,0,6-1q3,0,6-2q3-1,5-2l4,6q-3,2-7,4q-3,1-7,2q-4,0-8,0q-10,0-15-4q-6-4-6-11q0-5,2-9q3-4,8-6q5-2,13-2q8,0,14,3q6,3,10,9q3,7,3,17q0,10-3,16q-4,6-10,9q-5,3-13,3zm44,0l-8-6q3-2,4-6q2-3,2-8v-25q0-2-1-3q-1-1-3-1q-1,0-2,1q-1,0-1,0l-2-7q2-1,5-1q2-1,4-1q5,0,8,3q3,3,3,9v25q0,3,1,6q1,3,4,4q2,1,6,1q5,0,8-3q3-3,3-9v-35h10v35q0,7-2,11q-2,5-6,7q-5,3-11,3q-5,0-9-2q-4-2-8-6h0q-1,2-2,5q-2,2-3,3zm72,0q-5,0-8-3q-4-2-4-9v-43q0-6,2-11q1-4,3-7q2-3,5-4l0-1h-23l3-8h31v10q-5,2-8,6q-2,5-2,14v44q0,2,1,3q1,1,3,1q1,0,2,0q1-1,2-1l1,7q-2,1-4,2q-2,0-4,0zm35,0q-9,0-13-5q-4-4-4-12v-39h10v40q0,3,2,5q1,2,5,2q7,0,7-7v-27q0-3-1-5q-1-2-4-4l8-5q1,1,3,3q1,1,2,3h0q3-2,6-4q3-2,7-2q4,0,7,2q3,1,4,5q1,3,1,7v42h-10v-40q0-4-2-5q-1-2-5-2q-2,0-4,1q-1,1-2,3q0,1,0,4v23q0,8-4,12q-4,5-13,5zm66,0q-7,0-10-4q-3-4-3-11q0-5,2-9q1-4,5-6q3-2,9-2q6,0,9,3q4,2,5,7l3,11q1,2,2,3q1,0,2,0q2,0,2,0q1-1,1-3v-25q0-4-2-7q-2-3-6-4q-4-1-9-1q-5,0-10,1q-6,1-10,3v-9q2-1,6-2q3-1,7-1q5-1,9-1q7,0,13,2q6,2,9,7q4,4,4,11v25q0,6-4,9q-4,3-10,3q-5,0-8-2q-3-3-4-7l-3-10q-1-2-3-4q-1-1-4-1q-2,0-4,2q-2,2-2,7q0,4,1,5q2,2,5,2q1,0,1,0q1,0,2,0l2,7q-2,0-3,1q-2,0-4,0zm60-1v-42q0-3-1-4q-2-2-5-2q-2,0-4,1q-2,0-3,1l-2-8q2-1,6-1q3-1,6-1q6,0,10,3q4,3,4,10v43zm45,1q-6,0-12-2q-5-2-8-6q-3-4-3-9q0-2,1-4q0-1,1-3l9,3q0,1-1,2q0,1,0,2q0,4,3,6q4,2,10,2q7,0,11-4q4-4,4-15q0-8-2-12q-2-5-6-7q-4-1-9-1q-5,0-10,1q-4,1-9,3v-9q4-2,9-3q5-1,11-1q6,0,11,2q5,1,8,4q4,3,6,9q2,5,2,13q0,11-4,17q-3,7-9,9q-5,3-13,3z", ink: 468, top: 55 },
  house: { d: "m8,0v-70h12v29h35v-29h12v70h-12v-31h-35v31zm96,1q-7,0-13-3q-6-4-9-9q-4-6-4-14q0-8,4-14q3-5,9-9q5-3,13-3q8,0,13,3q6,4,9,9q4,6,4,14q0,8-4,14q-3,5-9,9q-5,3-13,3zm0-10q4,0,8-2q3-2,4-6q2-3,2-8q0-5-2-8q-1-4-5-6q-3-2-7-2q-4,0-7,2q-4,2-5,6q-2,3-2,8q0,5,2,8q2,4,5,6q3,2,7,2zm53,10q-6,0-10-2q-4-3-7-8q-2-5-2-13v-28h11v26q0,6,2,9q1,3,4,4q2,2,5,2q6,0,9-4q3-4,3-11v-26h11v50h-10l-1-7q-2,4-6,6q-4,2-9,2zm57,0q-5,0-9-1q-5-2-7-5q-4-2-5-6l10-4q1,3,4,4q3,2,7,2q4,0,6-1q2-1,2-4q0-2-2-3q-1-2-5-2l-4-2q-7-1-11-5q-4-4-4-10q0-7,4-11q5-4,14-4q5,0,9,1q4,2,6,4q3,2,4,6l-9,4q-1-3-4-4q-3-1-6-1q-3,0-5,1q-2,2-2,4q0,2,1,3q2,1,5,2l6,1q5,2,8,4q3,3,5,6q1,3,1,6q0,5-2,8q-3,4-7,5q-4,2-10,2zm51,0q-8,0-13-3q-6-4-9-9q-3-6-3-14q0-8,3-14q3-5,9-9q6-3,13-3q7,0,12,3q5,4,9,10q3,7,3,16h-38q1,6,5,10q4,3,10,3q4,0,7-2q3-2,5-5l10,4q-2,4-6,7q-3,3-7,5q-5,1-10,1zm-13-32h25q-1-3-2-6q-2-2-5-3q-2-2-5-2q-3,0-6,2q-3,1-5,3q-2,3-2,6z", ink: 289, top: 70 },
  ofJars: { d: "m29,1q-7,0-13-3q-6-4-9-9q-4-6-4-14q0-8,4-14q3-5,9-9q6-3,13-3q7,0,13,3q6,4,9,9q4,6,4,14q0,8-4,14q-3,5-9,9q-5,3-13,3zm0-10q4,0,7-2q4-2,6-6q1-3,1-8q0-5-2-8q-1-4-5-6q-3-2-7-2q-4,0-7,2q-4,2-5,6q-2,3-2,8q0,5,2,8q1,4,5,6q3,2,7,2zm40,9v-41h-8v-9h8v-5q0-8,4-12q4-5,12-5q3,0,6,1q3,1,5,2l-4,9q-2-1-3-2q-1,0-3,0q-3,0-4,2q-2,2-2,6v4h14v9h-14v41zm73,1q-4,0-8-1q-3-2-6-4q-2-2-4-5q-2-3-3-5l10-4q2,4,5,6q2,3,6,3q4,0,7-2q3-1,5-5q2-3,2-9v-45h11v49q0,5-2,9q-2,5-5,8q-4,2-8,4q-5,1-10,1zm55,0q-9,0-14-4q-5-4-5-11q0-8,5-12q5-4,15-4h12q0-6-3-8q-2-3-7-3q-4,0-6,1q-3,2-5,5l-10-4q2-3,4-6q3-3,7-5q4-1,10-1q7,0,12,3q5,2,7,8q3,5,3,13l-1,27h-10l0-6q-2,3-6,5q-3,2-8,2zm1-9q4,0,7-2q2-2,4-4q1-3,1-6v-2h-9q-7,0-9,2q-3,2-3,6q0,2,2,4q3,2,7,2zm35,8v-50h11v9q3-5,8-7q5-2,10-2v10q-5,0-9,2q-4,1-6,4q-3,3-3,7v27zm54,1q-5,0-9-1q-4-2-7-5q-3-2-5-6l10-4q2,3,5,4q3,2,6,2q4,0,6-1q3-1,3-4q0-2-2-3q-2-2-5-2l-5-2q-7-1-11-5q-4-4-4-10q0-7,5-11q5-4,14-4q4,0,8,1q4,2,7,4q3,2,4,6l-9,4q-2-3-4-4q-3-1-6-1q-4,0-6,1q-2,2-2,4q0,2,2,3q2,1,5,2l6,1q5,2,8,4q3,3,4,6q2,3,2,6q0,5-3,8q-2,4-7,5q-4,2-10,2z", ink: 307, top: 70 },
  hostel: { d: "m6,0v-70h12v27q2-4,6-6q4-2,8-2q6,0,11,2q4,3,6,8q2,5,2,13v28h-11v-26q0-6-1-9q-2-3-4-4q-3-2-6-2q-5,0-8,4q-3,4-3,11v26zm80,1q-8,0-14-3q-6-4-9-9q-3-6-3-14q0-8,3-14q3-5,9-9q6-3,14-3q7,0,13,3q6,4,9,9q3,6,3,14q0,8-3,14q-3,5-9,9q-6,3-13,3zm0-10q4,0,7-2q3-2,5-6q2-3,2-8q0-5-2-8q-2-4-5-6q-3-2-7-2q-5,0-8,2q-3,2-5,6q-2,3-2,8q0,5,2,8q2,4,5,6q4,2,8,2zm53,10q-5,0-9-1q-4-2-7-5q-3-2-5-6l10-4q1,3,4,4q3,2,7,2q4,0,6-1q2-1,2-4q0-2-1-3q-2-2-6-2l-4-2q-7-1-11-5q-4-4-4-10q0-7,4-11q5-4,14-4q5,0,9,1q4,2,6,4q3,2,4,6l-9,4q-1-3-4-4q-3-1-6-1q-3,0-5,1q-2,2-2,4q0,2,2,3q1,1,4,2l6,1q5,2,8,4q4,3,5,6q1,3,1,6q0,5-2,8q-3,4-7,5q-4,2-10,2zm48,0q-8,0-12-4q-4-4-4-11v-26h-8v-10h8v-16h11v16h14v10h-14v24q0,3,2,5q2,2,5,2q1,0,2-1q1,0,3-1l4,9q-3,1-6,2q-2,1-5,1zm42,0q-7,0-13-3q-6-4-9-9q-3-6-3-14q0-8,3-14q3-5,9-9q6-3,13-3q7,0,13,3q5,4,8,10q3,7,3,16h-37q0,6,4,10q4,3,10,3q5,0,8-2q3-2,4-5l10,4q-2,4-5,7q-3,3-8,5q-4,1-10,1zm-13-32h25q0-3-2-6q-2-2-4-3q-3-2-6-2q-3,0-6,2q-2,1-4,3q-2,3-3,6zm46,31v-70h11v70z", ink: 273, top: 70 },
};
/** The board is about 2.08 times as wide as it is tall (from the mark on it, which is 2:3). */
const ASPECT = 2.08;

/** The house's mark (its 600 x 900 grid) through a map onto the board. */
function markD(map: (x: number, y: number) => Pt): string {
  const tok = MARK_PATH.match(/[MVHCZ]|-?\d*\.?\d+/g) ?? [];
  let d = "";
  let i = 0;
  let x = 0;
  let y = 0;
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    const c = tok[i++];
    if (c === "M") {
      x = num();
      y = num();
      d += `M${P(map(x, y))}`;
    } else if (c === "V") {
      y = num();
      d += `L${P(map(x, y))}`;
    } else if (c === "H") {
      x = num();
      d += `L${P(map(x, y))}`;
    } else if (c === "C") {
      const q = [num(), num(), num(), num(), num(), num()];
      x = q[4]!;
      y = q[5]!;
      d += `C${P(map(q[0]!, q[1]!))} ${P(map(q[2]!, q[3]!))} ${P(map(x, y))}`;
    } else if (c === "Z") d += "Z";
  }
  return d;
}

/** Points along a cubic from p0 to p3 (p0 itself left out, so runs chain). */
function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps = 6): Pt[] {
  const out: Pt[] = [];
  for (let k = 1; k <= steps; k++) {
    const t = k / steps;
    const m = 1 - t;
    out.push([
      m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
      m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

/** A filled ink stroke of width w along points already in the drawing. */
function ribbon(pts: readonly Pt[], w: number): string {
  const left: Pt[] = [];
  const right: Pt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    left.push([p[0] + (nx * w) / 2, p[1] + (ny * w) / 2]);
    right.push([p[0] - (nx * w) / 2, p[1] - (ny * w) / 2]);
  });
  return `M${[...left, ...right.reverse()].map(P).join("L")}Z`;
}

/** The front entrance: the teak sign with the house's mark on two iron hooks under the eave, and the café behind the glazed front, its lamps lit by Evening. */
export default function entrance(): Art {
  const a = new Art("entrance", [0, 0, 480, 600], [480, 600]);
  a.fullFibre = true;

  // The sign board, seen from below: its corners (the bottom two lie just outside the frame).
  const on = board([31, 223], [461, 136], [494.2, 401.3], [-15.3, 425.7]);

  // Back plane: the shade under the eave.
  a.rect(-2, -2, 484, 604, "wd");
  // The sky, in the corner above the roof.
  a.poly([[-2, -2], [150, -2], [-2, 70]], "sky");

  // Under the eave: the deep gap behind the beam (dark by Day and by Evening), ceiling slats, and a joist running back into the house.
  const gap: Pt[] = [[-2, 169.5], [482, 58], [482, 67], [-2, 178.5]];
  a.poly(gap, "k dn", { id: "gap" });
  a.poly(gap, "c ev", { id: "gap" });
  for (const o of [10, 24, 38, 52]) a.poly([[-2, 169.5 + o], [482, 58 + o], [482, 69 + o], [-2, 180.5 + o]], "wd f2", { id: `slat${o}` });
  a.poly([[168, 130], [204, 110], [334, 170], [304, 190]], "w f2");
  a.path("M190 118 300 168", "h2");
  // The ends of two boards, either side of the sign.
  a.rect(462, 150, 22, 78, "w f2");
  a.rect(-4, 210, 34, 36, "w f2");

  // The eave beam: its lit underside, its front face, and the clay tiles on it.
  const beam: Pt[] = [[-2, 118.6], [394.7, -2], [482, -2], [482, 58], [-2, 169.5]];
  a.poly(beam, "w f", { edge: "ew", id: "beam" });
  a.add(`<clipPath id="bm"><path d="M${beam.map(P).join("L")}Z"/></clipPath>`);
  a.open('class="ev" clip-path="url(#bm)"');
  a.halo(260, 260, 120, 50);
  a.close();
  a.path("M-2 140 300 47M60 158 482 32M180 128 482 52", "h");
  a.ellipse(196, 96, 4, 2, "b");
  a.poly([[-2, 72.6], [227.5, -2], [394.7, -2], [-2, 118.6]], "wd f", { edge: "ed" });
  const e: Pt = [0.9524, -0.3048];
  const up: Pt = [-0.3048, -0.9524];
  const tile = (s0: number, cls: string, lift = 0) => {
    const o: Pt = [s0 * e[0], 72 + s0 * e[1]];
    const at = (s: number, t: number): Pt => [o[0] + s * e[0] + (t + lift) * up[0], o[1] + s * e[1] + (t + lift) * up[1]];
    a.poly([at(0, 6), at(7, -3), at(55, -3), at(62, 6), at(62, 44), at(0, 44)], cls, { r: 3, edge: "es" });
  };
  for (const s of [-30, 30, 90, 150, 210]) tile(s, "st2 f", 26);
  for (const s of [-60, 0, 60, 120, 180]) tile(s, "st f");

  // Through the glass: the house inside. A cream wall on the left, the café's lamplit room on the right.
  a.rect(-2, 380, 484, 222, "win");
  a.poly([[-2, 380], [224, 380], [220, 602], [-2, 602]], "win2");
  a.poly([[93, 425], [106, 425], [86, 602], [72, 602]], "wd2");
  a.poly([[179, 425], [189, 425], [182, 602], [172, 602]], "wd2");
  // The air conditioners, one high in the transom, one over the shelves.
  a.rect(134, 410, 42, 40, "lp f2", { r: 3 });
  a.path("M138 442H172", "h2");
  a.rect(274, 465, 38, 28, "lp f2", { r: 3 });
  a.path("M278 486H308", "h2");
  // The shelves: a teak case of cubbies.
  a.rect(238, 478, 80, 104, "w2 f2");
  let cubbies = "";
  for (const y of [484, 505, 526, 547, 568]) for (const x of [242, 261, 280, 299]) cubbies += `M${x} ${y}h16v${y === 568 ? 11 : 18}h-16Z`;
  a.path(cubbies, "wd2");
  // Teak panelling on the far wall.
  a.rect(332, 496, 150, 90, "wd2");
  a.path("M344 498V584M358 498V584M372 498V584M386 498V584M400 498V584M414 498V584M428 498V584M456 498V584M470 498V584", "h2");

  // The three pendant lamps over the room and a small light in its ceiling, lit by Evening.
  const lamps: [number, number, number][] = [[292, 518, 25], [351, 525, 27], [399, 532, 25]];
  a.open('class="ev"');
  a.halo(340, 466, 2.4, 4);
  a.circle(340, 466, 2.4, "y");
  for (const [x, y, w] of lamps) {
    a.cone([x, y, w - 6], [x, y + 46, w * 2.4]);
    a.halo(x, y, w / 2, 6);
  }
  a.close();
  for (const [x, y, w] of lamps) {
    a.path(`M${x} 460V${y - 15}`, "h2");
    a.rect(x - 2, y - 17, 4, 4, "b");
    a.path(`M${x - w / 2} ${y}C${x - w / 2} ${y - 9} ${x - 6} ${y - 14} ${x} ${y - 14}C${x + 6} ${y - 14} ${x + w / 2} ${y - 9} ${x + w / 2} ${y}Z`, "cu f2");
  }
  a.open('class="dn"');
  a.circle(340, 466, 2.4, "lp");
  for (const [x, y, w] of lamps) a.ellipse(x, y, w / 2 - 1, 2.2, "s");
  a.close();
  a.open('class="ev"');
  for (const [x, y, w] of lamps) a.ellipse(x, y, w / 2 - 1, 2.6, "y");
  a.close();

  // The glazed front: teak mullions, the transom bar and the bottom rail.
  a.poly([[47, 420], [56, 420], [56, 455], [47, 455]], "wd f");
  a.poly([[119, 420], [133, 420], [118, 602], [104, 602]], "wd f");
  a.poly([[219, 420], [230, 420], [225, 602], [214, 602]], "wd f");
  a.poly([[321, 420], [331, 420], [331, 602], [321, 602]], "wd f");
  a.poly([[434, 420], [445, 420], [452, 602], [441, 602]], "wd f");
  a.poly([[-2, 450.2], [482, 447.4], [482, 456.6], [-2, 460.2]], "wd f");
  a.poly([[108, 578], [482, 581], [482, 591], [108, 588]], "wd f");

  // The sign: its underside, the board, and by Evening the light on it.
  const under: Pt[] = [on(0, 1), on(1, 1), [on(1, 1)[0], on(1, 1)[1] + 7], [on(0, 1)[0], on(0, 1)[1] + 6]];
  a.poly(under, "wd f dn", { id: "under" });
  a.poly(under, "in f ev", { id: "under" });
  const signD = `M${[on(0, 0), on(1, 0), on(1, 1), on(0, 1)].map(P).join("L")}Z`;
  a.path(signD, "r f", { edge: "ew" });
  a.add(`<clipPath id="sg"><path d="${signD}"/></clipPath>`);
  a.open('class="ev" clip-path="url(#sg)"');
  a.halo(250, 560, 250, 60);
  a.halo(250, 560, 280, 60);
  a.close();
  // The grain of the board.
  const grain = (u0: number, u1: number, v: number) => `M${P(on(u0, v))}L${P(on(u1, v))}`;
  a.path(grain(0.03, 0.12, 0.14) + grain(0.88, 0.98, 0.3) + grain(0.6, 0.97, 0.9) + grain(0.02, 0.1, 0.62), "h");

  // The mark and the lettering, painted dark: ink by Day, and still dark on the lit board by Evening.
  const mark = markD((x, y) => on(0.606 + (0.236 * x) / 600, 0.05 + (0.737 * y) / 900));
  // The words, each line laid on the board by the affine map that best fits the board's perspective over it:
  // right-aligned, on the photo's baselines (vb) and at its sizes (k: board heights per glyph unit).
  const words = (w: { d: string; ink: number; top: number }, vb: number, k: number) => {
    const at = (x: number, y: number) => on(0.547 - ((w.ink - x) * k) / ASPECT, vb + y * k);
    const [q0, q1, q2, q3] = [at(0, 0), at(w.ink, 0), at(0, -w.top), at(w.ink, -w.top)];
    const ax = (q1[0] - q0[0] + q3[0] - q2[0]) / 2 / w.ink;
    const ay = (q1[1] - q0[1] + q3[1] - q2[1]) / 2 / w.ink;
    const cx = (q0[0] - q2[0] + q1[0] - q3[0]) / 2 / w.top;
    const cy = (q0[1] - q2[1] + q1[1] - q3[1]) / 2 / w.top;
    const ex = (q0[0] + q1[0] + q2[0] + q3[0]) / 4 - (ax * w.ink) / 2 + (cx * w.top) / 2;
    const ey = (q0[1] + q1[1] + q2[1] + q3[1]) / 4 - (ay * w.ink) / 2 + (cy * w.top) / 2;
    const f = (v: number) => {
      const r = Math.round(v * 1e4) / 1e4;
      return (Object.is(r, -0) ? 0 : r).toString().replace(/^(-?)0\./, "$1.");
    };
    return `<g transform="matrix(${[ax, ay, cx, cy].map(f).join(" ")} ${n(ex)} ${n(ey)})"><path d="${w.d}"/></g>`;
  };
  const letters =
    words(WORDS.lao, 0.288, 0.00175) +
    words(WORDS.house, 0.524, 0.00283) +
    words(WORDS.ofJars, 0.76, 0.00283) +
    words(WORDS.hostel, 0.941, 0.00179);
  a.add(`<defs><g id="ink"><path d="${mark}"/>${letters}</g></defs><use href="#ink" class="k dn"/><use href="#ink" class="c ev"/>`);

  // The two iron S-hooks, from screw eyes in the beam to the board.
  a.circle(100, 147, 3.4, "l");
  a.circle(383, 73, 3.4, "l");
  const lh = on(0.142, 0.062);
  const rh = on(0.86, 0.072);
  const left: Pt[] = [[104, 184], ...bez([104, 184], [104, 166], [104, 151], [99, 144]), ...bez([99, 144], [94, 138], [84, 138], [84, 148]), [90, lh[1] - 22], ...bez([90, lh[1] - 22], [92, lh[1] - 10], [lh[0] + 4, lh[1] - 6], lh)];
  const right: Pt[] = [[371, 80], ...bez([371, 80], [371, 70], [380, 67], [383, 73]), ...bez([383, 73], [386, 78], [386, 85], [384, 92]), rh];
  a.path(ribbon(left, 2.6) + ribbon(right, 3), "k");
  a.circle(lh[0], lh[1], 2.2, "k");
  a.circle(rh[0], rh[1], 2.2, "k");
  return a;
}
