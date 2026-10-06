import { Art, n, type Opts, type Pt } from "../lib";

/*
 * Traced from the dorm photo (dorm-corridor-pods-and-window.jpg, 1280 × 853) in its own pixels, then mapped
 * onto the frame: photo x 175–925 and y −80…935 fill the 400 × 600 frame. That is a little wider than the old
 * hero crop (x 356–925), so the aisle and the window at its end read, with a strip more of ceiling and floor.
 */
type P2 = [number, number];
const X0 = 175;
const Y0 = -80;
const SX = 400 / 750;
const SY = 600 / 1015;
const m = ([x, y]: P2): Pt => [(x - X0) * SX, (y - Y0) * SY];
const ms = (pts: P2[]): Pt[] => pts.map(m);
/** A path written in photo pixels (absolute M L H V C Q Z), mapped onto the frame. */
function tp(d: string): string {
  let out = "";
  for (const [, c, args] of d.matchAll(/([MLHVCQZ])([^MLHVCQZ]*)/g)) {
    const v = (args!.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (c === "H") out += "H" + v.map((x) => n((x - X0) * SX)).join(" ");
    else if (c === "V") out += "V" + v.map((y) => n((y - Y0) * SY)).join(" ");
    else if (c === "Z") out += "Z";
    else {
      const s: string[] = [];
      for (let i = 0; i < v.length; i += 2) s.push(m([v[i]!, v[i + 1]!]).map(n).join(" "));
      out += c + s.join(" ");
    }
  }
  return out;
}

// The aisle's vanishing point, and the far one that the rows of floor tiles run to.
const VP: P2 = [275, 398];
const VP2: P2 = [2270, 398];
/** On the line from the vanishing point through p: the point at x, or at y. */
const atX = (p: P2, x: number): P2 => [x, VP[1] + ((p[1] - VP[1]) * (x - VP[0])) / (p[0] - VP[0])];
const atY = (p: P2, y: number): P2 => [VP[0] + ((p[0] - VP[0]) * (y - VP[1])) / (p[1] - VP[1]), y];
function meet(a1: P2, a2: P2, b1: P2, b2: P2): P2 {
  const d = (a1[0] - a2[0]) * (b1[1] - b2[1]) - (a1[1] - a2[1]) * (b1[0] - b2[0]);
  const t = ((a1[0] - b1[0]) * (b1[1] - b2[1]) - (a1[1] - b1[1]) * (b1[0] - b2[0])) / d;
  return [a1[0] + t * (a2[0] - a1[0]), a1[1] + t * (a2[1] - a1[1])];
}
/** A rotated ellipse in photo pixels as four cubic arcs, mapped onto the frame. */
function ell(cx: number, cy: number, rx: number, ry: number, deg: number): string {
  const r = (deg * Math.PI) / 180;
  const k = 0.5523;
  const at = (u: number, v: number): P2 => [cx + u * Math.cos(r) - v * Math.sin(r), cy + u * Math.sin(r) + v * Math.cos(r)];
  const q = (p: P2) => m(p).map(n).join(" ");
  const pts: [P2, P2, P2][] = [
    [at(rx, k * ry), at(k * rx, ry), at(0, ry)],
    [at(-k * rx, ry), at(-rx, k * ry), at(-rx, 0)],
    [at(-rx, -k * ry), at(-k * rx, -ry), at(0, -ry)],
    [at(k * rx, -ry), at(rx, -k * ry), at(rx, 0)],
  ];
  return `M${q(at(rx, 0))}` + pts.map(([a, b, c]) => `C${q(a)} ${q(b)} ${q(c)}`).join("") + "Z";
}

/** The dorm, looking down its aisle: teak pods with woven curtains on both sides, a lit lower pod, the window at the end. */
export default function dormCorridor(): Art {
  const a = new Art("dorm-corridor", [0, 0, 400, 600], [400, 600]);
  a.fullFibre = true;
  const poly = (pts: P2[], cls: string, o: Opts = {}) => a.poly(ms(pts), cls, o);
  const path = (d: string, cls: string, o: Opts = {}) => a.path(tp(d), cls, o);

  // Teak under everything.
  a.rect(-2, -2, 404, 604, "wd");

  /* ---------------------------------------------------------------- back plane */
  const L: P2 = [212, 120]; // the left row's top edge, at the end wall
  const R: P2 = [395, 125]; // the right row's
  const FL: P2 = [213, 551]; // the floor's corners at the end wall
  const FR: P2 = [395, 553];
  // The ceiling, the end wall, and the floor.
  poly([atY(L, -95), atY(R, -95), R, L], "r3");
  poly([L, R, FR, FL], "r2 f2");
  poly([L, R, [395, 133], [212, 128]], "wd2"); // the dark cornice where they meet

  // The air conditioner high on the end wall.
  path("M222 133L388 137Q392 137 392 141V203Q392 208 387 207L222 187Q218 186 218 182V137Q218 133 222 133Z", "p f2");
  poly([[222, 175], [389, 190], [389, 197], [222, 181]], "cu2"); // its vent
  // The two windows, dark frames round the daylight.
  poly([[253, 287], [350, 289], [350, 409], [253, 408]], "b f2");
  poly([[270, 303], [335, 304], [335, 396], [270, 395]], "p");
  poly([[272, 342], [276, 342], [276, 360], [272, 360]], "b");
  poly([[253, 435], [350, 436], [350, 527], [253, 526]], "b f2");
  poly([[262, 443], [341, 444], [341, 519], [262, 518]], "p");

  // The ceiling fan: its bracket, the motor and the round wire guard; the little round fitting beside it.
  path("M295 -16H330L333 22H325L322 -8H303L300 22H292Z", "c2 f2");
  a.path(ell(312, 50, 58, 34, 12), "c2 f2");
  a.path(ell(312, 50, 44, 24, 12), "h2");
  a.path(ell(313, 63, 13, 6, 12), "s2 f2");
  path("M285 36C300 30 318 34 326 46M338 40C346 52 344 64 334 70M292 64C300 74 316 78 330 74", "h2");
  poly([[300, 85], [314, 85], [314, 92], [300, 92]], "b2");
  a.path(ell(307, 94, 9, 4, 0), "p f2");

  /* ------------------------------------------------- the floor and its tiles */
  // Dark grey-brown tiles, by Day and by Evening, under paler grout. By Day the window's light lies down the aisle
  // in stepped patches, palest by the wall; by Evening the lit pod's glow spills onto the tiles beside it.
  const FLOOR = { day: "b", evening: "b3", light: ["b2", "b3", "b4"], grout: "k3" };
  const floor: P2[] = [FL, FR, atY(FR, 950), atY(FL, 950)];
  poly(floor, FLOOR.day);
  /** The y, at x, of the row of tiles that crosses x 300 at y (rows run to VP2). */
  const row = (x: number, y: number) => n(398 + ((y - 398) * (VP2[0] - x)) / (VP2[0] - 300));
  a.open('class="dn"');
  path(`M216 553H394L366 650L340 760L324 ${row(324, 826)}L210 ${row(210, 826)}L213 760L216 650Z`, FLOOR.light[0]!);
  path(`M226 553H391L360 640L342 ${row(342, 708)}L220 ${row(220, 708)}L222 640Z`, FLOOR.light[1]!);
  path(`M238 553H384L356 604L345 ${row(345, 638)}L230 ${row(230, 638)}L233 604Z`, FLOOR.light[2]!);
  a.close();
  a.open('class="ev"');
  poly(floor, FLOOR.evening);
  a.close();
  // The grout, cut as thin strips that narrow with distance: five lines down the aisle, and the rows across it.
  let grout = "";
  const strip = (pts: P2[]) => (grout += "M" + pts.map((p) => m(p).map(n).join(" ")).join("L") + "Z");
  for (let k = 0; k < 5; k++) {
    const x = 221.6 + 35.7 * k;
    const l: P2 = [x - 0.4, 560];
    const r: P2 = [x + 0.4, 560];
    strip([atY(l, 553), atY(r, 553), atY(r, 950), atY(l, 950)]);
  }
  for (let j = -1; j <= 15; j++) {
    const y = 398 + 1 / (0.002315 + 0.0002675 * j);
    const h = (1.15 * (y - 398)) / 488;
    const t: P2 = [300, y - h];
    const b: P2 = [300, y + h];
    strip([meet(t, VP2, FL, VP), meet(t, VP2, FR, VP), meet(b, VP2, FR, VP), meet(b, VP2, FL, VP)]);
  }
  a.path(grout, FLOOR.grout);
  a.open('class="ev"');
  for (const [rx, ry] of [[150, 54], [118, 41], [88, 29], [58, 18]] as const) a.path(ell(574, 784, rx, ry, 52), "hl");
  a.close();

  /* ------------------------------------------------------ the far left row */
  poly([[150, -95], atY(L, -95), L, FL, atX(FL, 150)], "wd2");
  poly([[203, 117], [212, 120], [213, 551], [204, 556]], "w2");
  path("M150 498C162 494 176 496 184 502V592C172 596 160 598 150 600Z", "lp3");
  // A curtain drawn back, bunched and leaning into the corner; the upper bunk's rail behind the ladder.
  path("M179 -95H194L187 0L182 100L173 200L170 246C166 250 160 250 157 246L160 200L168 100L173 0Z", "cu2 f2");
  poly([atX([165, 280], 150), atX([165, 280], 204), atX([165, 289], 204), atX([165, 289], 150)], "b2 f2");
  for (const y of [290, 367, 443, 517, 583]) poly([[182, y - 4], [202, y - 1], [202, y + 5], [182, y + 3]], "b2 f2");
  poly([[182, 168], [190, 168], [190, 618], [182, 618]], "b2 f2");
  poly([[194, 195], [202, 195], [202, 598], [194, 598]], "b2 f2");

  /* ----------------------------------------------------- the far right row */
  const R2: P2 = [404, 128]; // the inner edge of the row's top board
  poly([R, atY(R, -95), [480, -95], [480, atX(FR, 480)[1]], FR], "wd2");
  poly([R, atY(R, -95), atY(R2, -95), R2], "w2 f2");
  poly([[393, 125], [405, 129], [405, 562], [395, 553]], "wd2 f2");
  // The upper pod's bedding on its rail, the lower pod's bed.
  path("M400 324C399 300 404 274 416 259C428 248 448 242 470 246L473 280Z", "lp3 f2");
  path("M410 300C428 288 448 282 470 282", "h2");
  poly([atX([473, 278], 405), [473, 278], [473, 288], atX([473, 288], 405)], "wd2 f2");
  path("M412 474C412 464 418 458 430 458C438 458 442 462 444 466L471 462L473 602C452 594 430 578 412 562Z", "lp3 f2");
  path("M414 500L471 494M414 532L471 530", "h2");
  // Its ladder: two rails and five rungs.
  for (const y of [293, 367, 443, 513, 577]) poly([[423, y - 3], [450, y - 5], [450, y + 3], [423, y + 4]], "b2 f2");
  poly([[423, 200], [430, 200], [430, 606], [423, 606]], "b2 f2");
  poly([[442, 175], [450, 175], [450, 618], [442, 618]], "b2 f2");
  // A curtain drawn back, bunched against the lockers.
  path("M452 -95H478V230L473 420H466L460 230Z", "cu f2");
  path("M461 -95V228M469 -95V300", "h2");

  /* ------------------------------------------------------------ the lockers */
  poly([atX(R, 473), atY(R, -95), [518, -95], [518, atX(FR, 518)[1]], [473, atX(FR, 473)[1]]], "w f", { edge: "ew" });
  path("M473 216L518 198M473 410L518 407", "h");
  let marks = "";
  for (const [x, y] of [[493, 62], [492, 255], [488, 468]] as const) {
    const [cx, cy] = m([x, y]);
    a.circle(cx, cy, 2.6, "lp f");
    marks += `M${n(cx - 1.2)} ${n(cy)}h2.4`;
  }
  a.path(marks, "h");
  poly([[471, 330], [476, 330], [476, 346], [471, 346]], "k");
  poly([[470, 524], [475, 524], [475, 544], [470, 544]], "k");

  /* -------------------------------------------- the lit lower pod, and its bed */
  const beamTop: P2 = [800, 75];
  const beamLow: P2 = [800, 97];
  // Its ceiling (the upper bunk's underside) and the head-end wall, in teak.
  poly([[518, 250], atX(beamLow, 838), [838, 284]], "w");
  poly([[518, 250], [838, 284], [838, 700], [518, 700]], "w");
  a.open('class="ev" opacity=".5"');
  poly([[518, 250], atX(beamLow, 838), [838, 284]], "in");
  poly([[518, 250], [838, 284], [838, 700], [518, 700]], "in");
  a.close();
  path("M538 254V560M578 258V560M622 263V560M668 268V560M714 273V560", "h2");
  path("M518 250L838 284", "h");
  // Through the gap by the ladder: the pod's long wall, lit.
  poly([[838, 95], [874, 88], [874, 552], [838, 552]], "in");
  // The reading light (a short strip on the head-end wall), and the socket below it.
  poly([[746, 297], [800, 301], [800, 310], [746, 306]], "y f");
  path("M787 326H799V347H787Z", "lp f");
  a.circle(...m([791, 333]), 0.8, "b");
  a.circle(...m([795, 333]), 0.8, "b");
  // The base: a teak ledge and its front face, down to the floor.
  const ledge: P2 = [520, 668];
  poly([[518, 560], [558, 582], [584, 650], [518, 652]], "wd");
  poly([[518, 652], [584, 650], [810, 950], atY(ledge, 950), [518, 666]], "w f");
  poly([[518, 666], atY(ledge, 950), atY(FR, 950), [518, atX(FR, 518)[1]]], "wd f", { edge: "ed" });
  // The bed: a white duvet, and the pillow against the head-end wall.
  path(
    "M558 582L874 568V950H762C744 905 728 872 712 847C695 812 680 786 660 756C630 714 600 682 583 647C572 625 562 605 558 582Z",
    "lp f",
  );
  path("M586 602C650 610 720 600 796 590M640 704C680 694 724 694 770 706M700 808C732 796 770 800 800 816", "h");
  path("M610 470C660 474 712 468 744 460C762 456 776 454 788 455C795 470 799 500 799 530V568C760 576 700 584 656 588C640 560 624 520 602 475Z", "lp f");
  path("M603 478C618 520 634 556 656 588C664 582 672 578 680 575C660 548 640 520 626 492C618 484 610 480 603 478Z", "in");
  path("M602 475C640 478 680 482 704 480C730 476 756 470 780 468", "h");
  path("M636 540C690 546 748 540 796 530", "h");
  // Lamplight: stepped rings round the reading light, its pool on the ceiling, its light falling on the pillow;
  // by Evening, a wider glow.
  const lamp = m([773, 304]);
  a.cone([lamp[0], lamp[1] + 3, 16], [lamp[0] - 34, lamp[1] + 150, 120]);
  a.halo(lamp[0], lamp[1], 6, 9);
  for (const [rx, ry] of [[46, 40], [36, 31], [27, 23], [18, 15]] as const) a.path(ell(770, 246, rx, ry, 0), "hl");
  a.open('class="ev"');
  a.halo(lamp[0], lamp[1], 10, 12);
  a.close();

  /* -------------------------------------------------------- the upper pod */
  poly([[518, -95], [940, -95], atX(beamTop, 940), atX(beamTop, 518)], "wd");
  path("M556 228C562 196 578 160 600 128C622 98 642 78 662 64C692 42 728 24 762 6C802 -14 862 -40 940 -66V-11Z", "st f");
  path("M606 150C650 112 700 82 770 46M640 176C690 140 760 104 840 70", "h");
  // Its front beam, and the curtain rod under it.
  poly([atX(beamTop, 518), atX(beamTop, 940), atX(beamLow, 940), atX(beamLow, 518)], "wd f", { edge: "ed" });
  const rod: P2 = [800, 106];
  a.line(ms([atX(rod, 536), atX(rod, 940)]), "l");

  /* ------------------------------------------ in front: the curtain and the ladder */
  const headTop: P2 = [893, 50];
  const headLow: P2 = [897, 98];
  path(
    `M897 98L940 ${n(atX(headLow, 940)[1])}V950H858L860 800C862 720 866 640 870 560C876 480 882 400 884 320C886 250 890 160 897 98Z`,
    "cu f",
    { edge: "ed" },
  );
  poly([headTop, atX(headTop, 940), atX(headLow, 940), headLow], "p f");
  path("M906 100C904 300 898 600 896 950M922 92C920 300 916 600 914 950", "h");
  // Woven lozenges down the cloth.
  let loz = "";
  for (const y of [200, 340, 480, 620]) loz += tp(`M904 ${y - 40}L920 ${y}L904 ${y + 40}L888 ${y}ZM904 ${y - 18}L911 ${y}L904 ${y + 18}L897 ${y}Z`);
  a.path(loz, "h");
  // A woven band near the hem, its diamonds following the cloth.
  path(`M866 736L940 ${n(atX([866, 736], 940)[1])}M864 758L940 ${n(atX([864, 758], 940)[1])}`, "h");
  let dia = "";
  for (const x of [874, 892, 910, 928]) {
    const [cx, cy] = m([x, atX([866, 747], x)[1]]);
    dia += `M${n(cx)} ${n(cy - 3.2)}l3 3.2-3 3.2-3-3.2Z`;
  }
  a.path(dia, "b");
  // The ladder to the upper pods: one post, three rungs.
  poly([[802, -95], [838, -95], [838, 950], [802, 950]], "b f", { edge: "ed" });
  poly([[807, -95], [812, -95], [812, 950], [807, 950]], "w dn");
  for (const [t, b] of [
    [243, 271],
    [527, 555],
    [793, 821],
  ] as const) {
    poly([[836, t], atX([838, t], 940), atX([838, b], 940), [836, b]], "b f", { edge: "ed" });
  }
  return a;
}
