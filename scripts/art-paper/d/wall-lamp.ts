import { Art, n, polyD, type Pt } from "../lib";

/** A closed band along a centreline, `w0` wide at its start and `w1` at its end, its sides smoothed. */
function band(c: readonly Pt[], w0: number, w1: number): string {
  const side = (s: 1 | -1) =>
    c.map(([x, y], i): Pt => {
      const [px, py] = c[Math.max(0, i - 1)]!;
      const [qx, qy] = c[Math.min(c.length - 1, i + 1)]!;
      const len = Math.hypot(qx - px, qy - py);
      const w = (w0 + ((w1 - w0) * i) / (c.length - 1)) / 2;
      return [x - ((qy - py) / len) * w * s, y + ((qx - px) / len) * w * s];
    });
  return smooth(side(1)) + "L" + smooth(side(-1).reverse()).slice(1) + "Z";
}

/** An open Catmull-Rom curve through the points, as cubic Béziers. */
function smooth(p: readonly Pt[]): string {
  let d = `M${n(p[0]![0])} ${n(p[0]![1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)]!;
    const b = p[i]!;
    const c = p[i + 1]!;
    const e = p[Math.min(p.length - 1, i + 2)]!;
    d += `C${n(b[0] + (c[0] - a[0]) / 6)} ${n(b[1] + (c[1] - a[1]) / 6)} ${n(c[0] - (e[0] - b[0]) / 6)} ${n(c[1] - (e[1] - b[1]) / 6)} ${n(c[0])} ${n(c[1])}`;
  }
  return d;
}

/**
 * One of the house's wall lamps, as in the wall-lamp photo: a cylinder of veined stone on the
 * shelf of a black L-shaped bracket, on the warm plaster wall by a corner, with a second lamp
 * further along below a dark band. Softly lit by Day (the shade honey, a sheen on the metal);
 * by Evening both lamps glow and their light steps out across the walls.
 */
export default function wallLamp(): Art {
  const a = new Art("wall-lamp", [0, 0, 480, 600], [480, 600]);
  a.fullFibre = true;

  // Far plane: the wall beyond the corner, the wall turning away at the right, and a dark band
  // across. By Evening, away from the lamps, they fall darker.
  const farPlanes = (wall: string, turn: string, stripe: string) => {
    a.add(`<rect class="${wall}" x="-4" y="-4" width="488" height="608"/>`);
    a.poly([[419.5, 398], [484, 398], [484, 604], [402.5, 604]], `${turn} f2`, { id: "wall-lamp:turn" });
    a.poly([[150, 354], [484, 368], [484, 403.5], [150, 390.5]], `${stripe} f2`, { id: "wall-lamp:band" });
  };
  a.open('class="dn"');
  farPlanes("w3", "wd4", "wd3");
  a.close();
  a.open('class="ev"');
  farPlanes("w4", "rw", "c");
  a.close();
  a.path("M150 467H415M150 532H408", "h2");

  // The far lamp, small, below the band.
  const plate2: Pt[] = [[391, 382], [424, 383], [423, 436], [389.5, 435]];
  const shade2 = "M401 398.5V429A9 2.5 0 0 0 419 429V398.5A9 1.5 0 0 0 401 398.5Z";
  a.open('class="dn"');
  a.poly(plate2, "b f2", { id: "wall-lamp:plate2" });
  a.path(shade2, "in f2");
  a.close();
  a.open('class="ev"');
  a.halo(410, 410, 12, 8);
  a.poly(plate2, "c f2", { id: "wall-lamp:plate2" });
  a.rect(393, 389, 12, 24, "hl", { r: 3 });
  a.rect(394, 393, 10, 18, "hl", { r: 3 });
  a.path(shade2, "y f2");
  a.close();

  // Mid plane: the near wall the lamp hangs on; its one edge in view is the corner.
  const near = `M-4 -4${polyD([[120.4, -4], [212.6, 604]], "wall-lamp:corner", 0, 0.6, false).replace("M", "L")}L-4 604Z`;
  a.path(near, "w2 f2", { edge: "es" });

  // By Evening the lamp lights the walls in stepped rings round the shade, brightest on the
  // near wall, which is closest to it.
  a.open('class="ev"');
  for (let i = 4; i >= 1; i--) a.ellipse(174, 336, 44 + 22 * i, 104 + 24 * i, "hl");
  a.add(`<clipPath id="w"><path d="${near}"/></clipPath>`);
  a.open('clip-path="url(#w)"');
  for (let i = 4; i >= 1; i--) a.ellipse(112, 330, 30 + 28 * i, 110 + 36 * i, "hl");
  a.close();
  a.close();

  // The bracket: a tall back plate (its edge towards us, its face towards the shade), a shelf
  // with a stepped foot, and a tapered brace below. Black metal: dark by Day and by Evening.
  const outline: Pt[] = [
    [40, 167.2], [75.2, 167.2], [128, 181.2], [128, 404], [229.2, 402.8], [230.4, 461.2], [231.2, 486.8],
    [206, 486.8], [206, 502.8], [116, 502.8], [85.6, 591.2], [56.4, 592.8],
  ];
  const face: Pt[] = [[75.2, 167.2], [128, 181.2], [128, 404], [120, 404], [93.2, 461.2], [75.2, 461.2]];
  const top: Pt[] = [[120, 404], [229.2, 402.8], [230.4, 461.2], [93.2, 461.2]];
  const cut = polyD(outline, "wall-lamp:bracket", 1.5);
  a.add(`<path class="e ed" d="${cut}"/>`);
  const bracket = (dark: string, mid: string, lit: string) => {
    a.path(cut, `${dark} f`);
    if (mid !== dark) a.poly(face, mid, { r: 1, id: "wall-lamp:face" });
    a.poly(top, lit, { r: 1, id: "wall-lamp:top" });
  };
  a.open('class="dn"');
  bracket("b", "b", "b2");
  a.close();
  a.open('class="ev"');
  bracket("c", "p", "b3");
  a.close();
  // The shade's light on the black metal, on the plate's face and round the shade's foot.
  for (let i = 3; i >= 1; i--) a.ellipse(97, 330, 6 + 5 * i, 50 + 26 * i, "hl");
  a.poly([[122, 408], [226, 407], [227, 458], [97, 458]], "hl");
  a.ellipse(176, 446, 56, 11, "hl");
  a.path("M75.2 167.2V592.5M75.2 486.8H206M93.2 461.2H230.4M120 404 93.2 461.2", "h");
  // The knob that holds the shade.
  a.circle(114, 363, 4.5, "b3 f");

  // The shade: a cylinder of veined stone, open at the top, its long sides cut by hand.
  const side = (x: number, y0: number, y1: number) => polyD([[x, y0], [x, y1]], `wall-lamp:side${x}`, 0, 0.6, false);
  const body = `${side(129.2, 251.4, 440)}A44.4 10.8 0 0 0 218 440${side(218, 440, 251.4).replace(/^M[^L]+/, "")}A44.4 5.4 0 0 0 129.2 251.4Z`;
  // Broad honey bands in the stone, each edged below by a fine amber vein.
  const honey =
    band([[126, 250], [145, 268], [173, 292], [199, 316], [214, 340], [222, 352]], 9, 12) +
    band([[176, 247], [189, 260], [210, 277], [222, 293]], 7, 10) +
    band([[126, 281], [140, 294], [161, 310], [180, 326], [192, 342], [209, 358], [222, 372]], 8, 11) +
    `M126 369C134 374 140 386 150 394C156 398 162 399 166 400C160 404 154 412 152 422C150 432 150 440 148 452H126Z`;
  const veins =
    band([[126, 256], [145, 276], [173, 300], [199, 324], [214, 347], [222, 359]], 1.4, 3.6) +
    band([[176, 252], [187, 267], [208, 284], [222, 300]], 1.2, 3) +
    band([[126, 287], [140, 300], [161, 316], [180, 332], [192, 348], [209, 364], [222, 378]], 1.6, 3.4) +
    band([[126, 368], [140, 384], [166, 400]], 2.4, 1.2);
  a.add(`<path class="e es" d="${body}"/>`);
  a.open('class="dn"');
  a.path(body, "in");
  a.close();
  a.open('class="ev"');
  a.path(body, "y");
  a.close();
  a.add(`<clipPath id="v"><path d="${body}"/></clipPath>`);
  a.open('clip-path="url(#v)"');
  a.path(honey, "gold");
  a.open('class="dn"');
  a.path(veins, "sun");
  a.close();
  a.open('class="ev"');
  a.path(veins, "in");
  a.close();
  a.close();
  // The open top: a pale rim round the honey inside by Day; by Evening light spills out of it.
  a.open('class="dn"');
  a.ellipse(173.6, 251.4, 44.4, 5.4, "lp");
  a.ellipse(173.6, 251.8, 40.4, 3.8, "y");
  a.close();
  a.open('class="ev"');
  for (let i = 3; i >= 1; i--) a.ellipse(173.6, 251.4 - 6 * i, 44 + 6 * i, 5.4 + 9 * i, "hl");
  a.ellipse(173.6, 251.4, 44.4, 5.4, "y");
  a.close();
  a.path(body, "l");
  a.path("M129.2 251.4A44.4 5.4 0 0 0 218 251.4", "h");
  return a;
}
