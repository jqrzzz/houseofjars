import { Art, n, rngFor, type Pt } from "../lib";

/** A dorm locker: its teak door in a brown frame, a round steel number plate and a padlock eye on its edge, pod curtains either side. */
export default function locker(): Art {
  const a = new Art("locker", [0, 0, 480, 600], [480, 600]);
  a.fullFibre = true;

  // The photo looks a little down at the locker, so its uprights lean in toward the floor.
  const dl = (y: number) => 61.6 + 0.056 * y; // the door's left edge
  const dr = (y: number) => 455.2 - 0.052 * y; // the door's right edge
  const sl = (y: number) => 22.4 + 0.068 * y; // the frame's left side
  const sr = (y: number) => 492.9 - 0.059 * y; // the frame's right side
  const foot = 581; // the door's foot; the frame's rail runs below it
  const P = (p: Pt) => `${n(p[0])} ${n(p[1])}`;
  const disc = (cx: number, cy: number, r: number) =>
    `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
  /** Pale woven stripes across a curtain, x0..x1(y), every `gap`, falling `fall` per unit across, rippled by its folds. */
  const stripes = (y0: number, y1: number, x0: (y: number) => number, x1: (y: number) => number, gap: number, fall: number, ph: number) => {
    let d = "";
    for (let y = y0; y < y1; y += gap) {
      const l = x0(y);
      const w = x1(y) - l;
      const dy = w * fall;
      const sag = 2.4 * Math.sin(y / 21 + ph);
      d += `M${n(l)} ${n(y)}q${n(w / 2)} ${n(dy / 2 + sag)} ${n(w)} ${n(dy)}v1.3q${n(-w / 2)} ${n(sag - dy / 2)} ${n(-w)} ${n(-dy)}Z`;
    }
    return d;
  };

  // Back plane, left: the next pod. White cloth in shade over a teak bar, the end of the curtain rod,
  // and the curtain: a white heading, then grey with pale woven stripes.
  a.rect(-2, -2, 40, 100, "cu2 f2");
  a.poly([[-2, -2], [38, -2], [38, 82], [-2, 46]], "lp2 f2");
  a.rect(-2, 96, 40, 70, "b2 f2");
  a.poly([[-2, 252], [40, 196], [70, 602], [-2, 602]], "cu f2");
  a.path(stripes(172, 606, () => -2, (y) => sl(y) + 3, 6, 0.25, 0), "lp2");
  a.poly([[-2, 164], [38, 164], [38, 196], [-2, 252]], "lp2 f2");
  a.circle(30, 168, 4.6, "b2 f2");

  // Back plane, right: the next pod's striped curtain.
  a.poly([[sr(219) - 4, 219], [482, 210], [482, 602], [sr(602) - 4, 602]], "cu f2");
  a.path(stripes(222, 606, (y) => sr(y) - 4, () => 482, 6, -0.2, 2), "lp2");

  // The frame: two brown stiles and the rail under the door, jointed in line with the door's edges.
  a.poly([[sl(-2), -2], [482, -2], [482, 185], [sr(602), 602], [sl(602), 602]], "b f", { edge: "ed" });
  a.path(`M${P([dl(foot), foot])}L${P([dl(602), 602])}M${P([dr(foot), foot])}L${P([dr(602), 602])}`, "h");

  // The door: teak, its grain running floor to ceiling.
  a.poly([[dl(-2), -2], [dr(-2), -2], [dr(foot), foot], [dl(foot), foot]], "w f", { edge: "ed", r: [0, 0, 2, 2] });
  const rand = rngFor("locker:grain");
  const at = (u: number, y: number) => dl(y) + u * (dr(y) - dl(y));
  /** One grain line at u across the door: a long thin strip, waving a little, tapering at its ends. */
  const strip = (u: number, y0: number, y1: number, w: number, amp: number, waves: number) => {
    const N = Math.max(5, Math.round((y1 - y0) / 34));
    const ph = rand() * Math.PI * 2;
    const L: Pt[] = [];
    const R: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const y = y0 + (y1 - y0) * t;
      const x = at(u, y) + amp * Math.sin(ph + t * Math.PI * 2 * waves);
      const hw = (w / 2) * Math.min(1, (t / 0.1) ** 0.7, ((1 - t) / 0.1) ** 0.7);
      L.push([x - hw, y]);
      R.push([x + hw, y]);
    }
    return `M${[...L, ...R.reverse()].map(P).join("L")}Z`;
  };
  // Dark grain: the long lines seen in the photo, then finer ones between.
  let grain = "";
  for (const [u, y0, y1, w, amp, waves] of [
    [0.12, 40, 578, 1.7, 1, 0.8],
    [0.215, -30, 430, 1.8, 1.2, 1],
    [0.31, -30, 579, 2.2, 1.4, 1.1],
    [0.42, 60, 579, 2.3, 1.2, 0.9],
    [0.508, -30, 330, 1.6, 1, 0.7],
    [0.58, -30, 500, 2, 1.3, 1],
    [0.674, -30, 579, 2.2, 1.2, 1.2],
    [0.763, 120, 579, 2, 1.1, 0.8],
    [0.876, -30, 420, 1.8, 1.1, 0.9],
  ] as const)
    grain += strip(u, y0, y1, w, amp, waves);
  for (let i = 0; i < 22; i++) {
    const u = 0.03 + rand() * 0.94;
    const y0 = rand() * 440 - 40;
    const y1 = Math.min(y0 + 120 + rand() * 260, 579);
    grain += strip(u, y0, y1, 1, 0.6 + rand() * 0.8, 0.5 + rand() * 0.7);
  }
  a.path(grain, "wd");
  // Paler, golden streaks between them.
  let gold = "";
  for (const [u, y0, y1, w] of [
    [0.17, -30, 380, 2.2],
    [0.265, 90, 579, 2.6],
    [0.365, -30, 520, 2.4],
    [0.47, 200, 579, 2.2],
    [0.625, -30, 360, 2.4],
    [0.715, 230, 579, 2.2],
    [0.82, 60, 540, 2],
  ] as const)
    gold += strip(u, y0, y1, w, 1, 0.8);
  a.path(gold, "w2");

  // The number plate: a round steel disc on the door; its number is three ink marks.
  a.path(disc(266.2, 156.8, 24.2), "s f", { edge: "es" });
  a.circle(266.2, 156.8, 21, "cu");
  // Polished steel: light caught along its lower edge, as in the photo.
  a.path("M281.9 170.7A21 21 0 1 1 252.3 141.1A21 21 0 0 0 281.9 170.7Z", "gl");
  a.rect(255.9, 151.6, 4.8, 10.4, "k", { r: 1.4 });
  a.ellipse(266.1, 156.8, 2.5, 5.2, "k");
  a.ellipse(274.1, 156.8, 2.5, 5.2, "k");

  // The padlock eye on the door's edge.
  a.rect(75.2, 291, 6, 32, "cu f", { r: 1.5 });
  a.circle(72.6, 308, 7.4, "cu f");
  a.circle(72.6, 308, 3, "b");
  return a;
}
