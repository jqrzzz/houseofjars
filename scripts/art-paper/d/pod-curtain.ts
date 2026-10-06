import { Art, n, type Pt } from "../lib";

/** A lower pod as photographed: teak walls and ceiling, a white bed and pillow, the hidden reading light, the striped curtain drawn back. */
export default function podCurtain(): Art {
  const a = new Art("pod-curtain", [0, 0, 480, 600], [480, 600]);
  a.fullFibre = true;

  // The photo's perspective: the upper pod's front beam and the rod slope up to the right.
  const beamTop = (x: number) => 79.5 - 0.25 * (x - 62);
  const beamBot = (x: number) => 103.5 - 0.25 * (x - 62);
  const strip = (x: number) => 114 - 0.25 * (x - 62);
  const rod = (x: number) => 120.5 - 0.248 * (x - 62);
  const trim = (x: number) => 238 - 0.086 * (x - 62);
  const bedY = (x: number) => 446 + 0.038 * (x - 62);
  const band = (f: (x: number) => number, g: (x: number) => number, x0: number, x1: number): Pt[] => [
    [x0, f(x0)],
    [x1, f(x1)],
    [x1, g(x1)],
    [x0, g(x0)],
  ];
  const pl = (pts: readonly Pt[]) => "M" + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join("L");

  // A dark teak ground under everything, so no gap between planes shows the page.
  a.rect(-4, -4, 488, 608, "wd");
  // Back plane: the back wall, teak with a long horizontal grain.
  a.poly(band(trim, () => 470, 56, 486), "w2");
  const wall = (x: number, t: number) => trim(x) + t * (bedY(x) - trim(x));
  for (const [x0, x1, t] of [
    [70, 300, 0.12],
    [160, 470, 0.22],
    [62, 230, 0.34],
    [250, 470, 0.42],
    [96, 380, 0.54],
    [62, 200, 0.68],
    [220, 470, 0.74],
    [120, 340, 0.88],
  ] as const) {
    a.line([[x0, wall(x0, t)], [x1, wall(x1, t)]], "h2");
  }

  // Middle plane: the ceiling (the underside of the upper pod), two battens running back, and the trim.
  a.poly([[56, strip(56) - 2], [486, strip(486) - 2], [486, trim(486)], [56, trim(56)]], "w");
  // The ceiling's grain runs across, in the beam's perspective.
  for (const [x0, x1, t] of [[90, 200, 0.3], [240, 400, 0.22], [120, 300, 0.62], [290, 420, 0.5]] as const) {
    const y = (x: number) => strip(x) + t * (trim(x) - strip(x));
    a.line([[x0, y(x0)], [x1, y(x1)]], "h2");
  }
  a.poly([[192, 81.5], [204, 78.5], [316, trim(316)], [305, trim(305)]], "wd f2");
  a.poly([[56, 157], [186, trim(186)], [170, trim(170)], [56, 169]], "wd f2");
  a.poly(band((x) => trim(x) - 3, (x) => trim(x) + 1, 56, 486), "wd");

  // The reading light, hidden by the post: only its glow on the wall shows. By Evening it fills the pod.
  a.open('class="ev"');
  a.halo(62, 276, 44, 26);
  a.close();
  a.halo(62, 276, 10, 13);
  a.path("M62 266C80 266 97 271 101 276C97 281 80 286 62 286Z", "in");
  a.path("M62 270.5C74 270.5 85 273.5 88 276C85 278.5 74 281.5 62 281.5Z", "y");

  // The bed: a white sheet over the mattress and a pillow at the head.
  a.path("M56 446.5C120 448.5 170 451 206 452C260 451.5 300 452 360 455.5C410 458 450 460.5 486 463V606H56Z", "lp f", { edge: "es" });
  // The lamp lights the near end of the bed; the rest of the sheet lies in soft shade.
  const shade =
    "M56 448C120 450 170 452.5 206 453.5C260 453 300 453.5 360 457C410 459.5 450 462 486 464.5V606H334" +
    "C330 590 324 574 312 561C302 549 292 541 276 535C262 530 248 532 232 527C214 523 200 525 184 520" +
    "C166 516 152 519 134 515C116 512 104 515 88 512C76 510 66 512 56 511Z";
  a.path(shade, "s dn");
  a.path(shade, "lp2 ev");
  a.path("M56 499C100 488 150 474 214 459M232 470C290 474 360 478 476 490M330 606C360 580 410 548 486 520M392 606C420 584 450 566 486 552", "h");
  a.path("M56 444C64 439 80 438 100 438L180 437C196 437 207 442 207 450C207 456 199 459 186 461L120 470C96 474 72 478 56 481Z", "lp f", { edge: "es" });
  a.path("M60 462C100 456 150 451 200 452", "h");

  // Above: the upper pod's sheet and lit teak, its front beam, and the curtain rod beneath.
  a.rect(56, -4, 110, 44, "w");
  a.path(`M56 36C66 24 84 14 108 10C126 7 142 2 150 -4H486V${n(beamBot(486))}L56 ${n(beamBot(56))}Z`, "st f");
  a.path("M58 64C76 52 104 44 140 38", "h");
  a.poly(band(beamTop, beamBot, 56, 486), "wd f", { edge: "ed" });
  a.poly(band(beamBot, strip, 56, 486), "w");
  a.poly(band((x) => rod(x) - 3.2, (x) => rod(x) + 3.2, 60, 486), "st f", { r: 3 });
  a.rect(59, rod(59) - 6, 7, 12, "b f", { r: 1.5 });

  // The curtain, drawn back: a grey-brown weave with fine cream stripes, gathered into folds.
  // Each fold is its own strip of paper, laid from the leading edge back toward the wall.
  // The stripes: beige threads by Day, cream in the lamplight by Evening.
  const zig = "M0 3l1.5-.9 1.5.9 1.5-.9 1.5.9v1.1l-1.5-.9-1.5.9-1.5-.9-1.5.9Z";
  for (const [i, rot, dy] of [[0, -8, 0], [1, -2, 3], [2, -13, 5]] as const) {
    a.add(
      `<pattern id="c${i}" width="6" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(${rot}) translate(0 ${dy})">` +
        `<path class="s dn" d="${zig}"/><path class="lp ev" d="${zig}"/></pattern>`,
    );
  }
  const leadPts: Pt[] = [[338, 60], [338, 96], [352, 100], [368, 140], [378, 180], [390, 220], [403, 260], [418, 300], [432, 340], [446, 380], [461, 420], [478, 455], [492, 472]];
  const lead = (y: number) => {
    for (let i = 1; i < leadPts.length; i++) {
      const [x0, y0] = leadPts[i - 1]!;
      const [x1, y1] = leadPts[i]!;
      if (y <= y1) return x0 + ((x1 - x0) * Math.max(0, y - y0)) / Math.max(1, y1 - y0);
    }
    return 492;
  };
  // A fold's leading line: d units right of the curtain's edge under the heading, closing to nothing at the foot.
  const foldLine = (d: number): Pt[] => {
    const pts: Pt[] = [];
    for (let y = 60; y <= 480; y += 28) {
      const x = lead(y) + d * Math.pow(Math.min(1, Math.max(0, 1 - (y - 96) / 380)), 0.85);
      pts.push([x, y]);
      if (x > 492) break;
    }
    return pts;
  };
  const folds = [0, 22, 42, 64, 88, 114];
  folds.forEach((d, i) => {
    const pts = foldLine(d);
    const last = pts[pts.length - 1]!;
    const d0 = `${pl(pts)}L492 ${n(Math.max(last[1], 60))}V${n(rod(492))}L${n(pts[0]![0])} ${n(rod(pts[0]![0]))}Z`;
    a.path(d0, i ? "cu f2" : "cu f", i ? {} : { edge: "ed" });
    a.add(`<path d="${d0}" fill="url(#c${i % 3})"/>`);
  });
  // The heading: cream, pinch-pleated, hanging from the rod.
  const hem = (x: number) => 66 + Math.max(0, (440 - x) * 0.18) + Math.max(0, (366 - x) * 0.55);
  let head = `M336 ${n(rod(336) - 3)}`;
  for (let x = 336; x < 492; x += 12) head += `Q${x + 6} ${n(rod(x + 6) - 10)} ${x + 12} ${n(rod(x + 12) - 3)}`;
  head += `V${n(hem(492))}`;
  for (let x = 480; x >= 344; x -= 12) head += `L${x + 6} ${n(hem(x + 6) + 1.6)}L${x} ${n(hem(x))}`;
  head += `L336 ${n(hem(336))}Z`;
  a.path(head, "lp f");
  let pleats = "";
  for (let x = 348; x <= 480; x += 12) pleats += `M${x} ${n(rod(x) - 3)}V${n(hem(x) - 1)}`;
  a.path(pleats, "h");

  // Near plane, left: the neighbouring pod's end, the tail of its curtain, and this pod's post.
  a.rect(-4, -4, 50, 608, "wd");
  const tail = "M-4 -4H28C27 70 22 170 15 250C10 310 4 360 -4 404Z";
  a.path(tail, "cu f");
  a.add(`<path d="${tail}" fill="url(#c1)"/>`);
  a.path("M25 -4H46V31C40 34 32 35 26 33Z", "st f");
  a.rect(44, -4, 18, 608, "wd f", { edge: "ed" });
  a.path("M48.5 -4V604", "h");
  return a;
}
