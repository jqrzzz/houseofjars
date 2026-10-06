import { Art, n, type Pt } from "../lib";

/**
 * A lower pod with its reading light on, beside a locker and the ladder up to the next
 * upper pod: the photo pod-bed-with-ladder.jpg seen from its left edge (photo x 0–1280).
 */
export default function podLadder(): Art {
  const a = new Art("pod-ladder", [0, 0, 480, 600], [480, 600]);
  a.fullFibre = true;

  /* ------------------------------------------- the next bay, beyond the ladder */
  // Its upper pod, dark teak inside, and its lower pod's teak back wall.
  a.rect(-2, -2, 106, 190, "wd3");
  a.poly([[-2, 150], [104, 72], [104, 520], [-2, 520]], "w3");
  // The floor: dark grey-brown stone tiles along the row of pods, with paler grout by Day.
  const floor: Pt[] = [[-2, 396], [112, 512], [182, 556], [182, 604], [-2, 604]];
  a.poly(floor, "b2 dn");
  a.poly(floor, "s ev");
  const joints: [number, number, number, number][] = [[-2, 426, 160, 604], [-2, 470, 105, 604], [-2, 533, 47, 604]];
  for (let y = 452; y < 604; y += 26) joints.push([-2, y, 170, y - 0.15 * 172]);
  let grout = "";
  let seams = "";
  for (const [x1, y1, x2, y2] of joints) {
    const k = 0.8 / Math.hypot(x2 - x1, y2 - y1);
    const [nx, ny] = [(y1 - y2) * k, (x2 - x1) * k];
    grout += `M${n(x1 + nx)} ${n(y1 + ny)}L${n(x2 + nx)} ${n(y2 + ny)}L${n(x2 - nx)} ${n(y2 - ny)}L${n(x1 - nx)} ${n(y1 - ny)}Z`;
    seams += `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`;
  }
  a.path(grout, "b4 dn");
  a.path(seams, "h ev");
  // The upper pod's bedding, its base board and rail.
  a.path("M-2 122C5 115 14 116 17 124C19 132 18 140 16 150L-2 163Z", "lp2 f2");
  a.path("M46 112C44 100 48 88 58 82C68 76 78 70 90 66L104 64V86L60 118C52 120 47 118 46 112Z", "lp2 f2");
  a.path("M56 96C64 92 76 86 88 80", "h2");
  a.poly([[-2, 148], [104, 70], [104, 94], [-2, 171]], "b2 f2");
  a.poly([[-2, 167], [104, 90], [104, 95], [-2, 172]], "st2");
  // The lower pod: pillow, sheet, a teak post, and the platform board on its leg.
  a.path("M65 321C74 316 84 314 92 315C96 326 98 342 97 356C88 360 78 363 70 364C66 350 64 334 65 321Z", "lp2 f2");
  a.poly([[30, 366], [72, 356], [106, 364], [110, 497], [24, 410]], "lp2 f2", { r: 4 });
  a.path("M44 384C60 388 78 400 96 420", "h2");
  a.poly([[-2, 186], [12, 180], [14, 398], [-2, 388]], "wd2 f2");
  a.rect(5, 396, 10, 38, "b f2", { r: 1 });
  a.poly([[-2, 384], [112, 500], [112, 516], [-2, 400]], "w2 f2");

  // The lower pod's curtain, drawn back and bunched against the locker: a cream heading, a striped body.
  const curL: Pt[] = [[55, 156], [60, 205], [68, 264], [80, 324]];
  const curR: Pt[] = [[88, 135], [93, 200], [97, 262], [99, 322]];
  a.poly([...curL, ...[...curR].reverse()], "cu f", { edge: "ed" });
  const at = (pts: Pt[], y: number) => {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]!;
      const [x1, y1] = pts[i]!;
      if (y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
    }
    return pts[pts.length - 1]![0];
  };
  let stripes = "";
  for (let y = 176; y < 320; y += 14) stripes += `M${n(at(curL, y) + 1)} ${y}L${n(at(curR, y - 3) - 1)} ${y - 3}`;
  a.path(stripes, "h");
  a.poly([[51, 135], [86, 110], [89, 136], [55, 157]], "p f");
  a.path("M60 133V151M68 128V146M76 122V141", "h");

  /* --------------------------------------------------------------- the ladder */
  const cL = (y: number) => 10 + 0.07 * y + 0.00004 * y * y;
  const cR = (y: number) => 33 + 0.05 * y + 0.00008 * y * y;
  // Rungs: flat bars, five of them, between the rails.
  for (const [y, s] of [[128, -0.12], [219, -0.05], [312, 0.05], [396, 0.1], [471, 0.15]] as const) {
    const x1 = cL(y) + 4;
    const x2 = cR(y) - 4;
    const dy = s * (x2 - x1);
    a.poly([[x1, y - 4], [x2, y - 4 + dy], [x2, y + 4 + dy], [x1, y + 4]], "b f");
  }
  const rail = (c: (y: number) => number, foot: number, w: number) => {
    const ys = [-2, 120, 240, 360, foot];
    a.poly([...ys.map((y) => [c(y) - w / 2, y] as Pt), ...ys.map((y) => [c(y) + w / 2, y] as Pt).reverse()], "b f", { edge: "ed" });
  };
  rail(cL, 487, 11);
  rail(cR, 515, 11.5);

  /* ---------------------------------------------------------- the lower pod */
  // The head wall: teak with an upright grain, a seam near the top, and its panel joints.
  a.poly([[149, 30], [482, 120], [482, 604], [165, 604]], "wd");
  a.path("M157 91 419 163M252 117V464M344 142V350M379 152V347", "h");
  // The ceiling (the upper pod's floor): teak, lit, with a rib across it.
  a.poly([[202.5, 49.7], [290.4, -2], [482, -2], [482, 133.6]], "w");
  a.path("M268 46 482 108M330 30 482 74", "h");
  a.poly([[398, -2], [424, -2], [482, 27], [482, 45]], "w f");
  // The trim along the top of the head wall.
  a.poly([[202.5, 49.7], [482, 133.6], [482, 147], [202, 59]], "wd f");

  // The reading light: an LED bar under the trim, its light on the wall, the ceiling and the pillow.
  a.cone([448, 182, 56], [410, 430, 200]);
  // Its light thrown up onto the ceiling, the brightest patch in the room.
  for (let i = 4; i >= 1; i--) a.ellipse(458, 104, 18 + 10 * i, 15 + 8 * i, "hl");
  a.halo(452, 168, 12, 12);
  // By Evening the light fills the pod.
  a.open('class="ev"');
  a.halo(448, 186, 40, 30);
  a.close();
  a.poly([[419, 161], [484, 174], [484, 182], [419, 169]], "y f", { r: 3 });
  // The socket below it.
  a.rect(454, 198, 16, 24, "lp f", { r: 2 });
  a.path("M458.5 204.5v3M465.5 204.5v3M462 212v5", "h");

  // The bed: its teak platform, the sheet, the big pillow against the head wall, the duvet.
  a.poly([[171, 545], [230, 537], [330, 604], [214, 604], [172, 563]], "b f");
  a.poly([[172, 563], [214, 604], [168, 604]], "w f");
  a.path("M226 471C246 464 292 461 338 466L370 470V604H330C312 590 296 580 284 570C266 558 248 548 236 536C224 522 218 504 220 488C221 480 223 474 226 471Z", "lp f");
  // The pillow, plump in its case and propped on the head wall: puffed ears, a shaded side, two soft creases.
  const shadow = "M304 465C311 476 321 486 333 494H348V468L322 463Z";
  a.path(shadow, "s dn");
  a.path(shadow, "lp2 ev");
  const pillow =
    "M266 349.5C300 353 350 353 378 348C405 342 432 335 450 328Q457 325 457 332C461 350 471 371 484 392V446" +
    "C440 458 382 474 346 490Q340 493 337 487C324 474 302 452 300 428C300 410 281 384 264 357Q258 350 266 349.5Z";
  a.path(pillow, "lp", { edge: "es" });
  a.add(`<clipPath id="pw"><path d="${pillow}"/></clipPath>`);
  a.open('clip-path="url(#pw)"');
  const shade = "M268 380C290 410 300 442 340 462C362 473 392 474 424 468L424 520L250 520L250 380Z";
  a.path(shade, "s dn");
  a.path(shade, "lp2 ev");
  a.close();
  a.path("M272 359C290 372 314 380 342 382M447 336C440 354 426 368 404 376", "h");
  a.path(pillow, "l");
  a.path("M341 489C380 472 430 456 482 438V604H284C282 584 284 566 290 552C298 532 318 508 341 489Z", "lp f", { edge: "es" });
  a.path("M291 551C330 540 400 523 482 495M318 600C330 586 352 574 380 566", "h");

  /* ------------------------------------------ the front: beam, locker, post, rod */
  // The upper pod's base over the opening: its face and underside.
  a.poly([[147, 43], [227, -2], [271, -2], [152, 68]], "wd");
  a.poly([[137, -2], [227, -2], [147, 43], [137, 48]], "b f", { edge: "ed" });

  // The locker beside the pod: two teak doors, number plates, padlocks with their keys, a leg.
  a.rect(116, 528, 11, 48, "b f", { r: 1 });
  a.poly([[80, -2], [141, -2], [160, 571], [113, 525], [110, 500], [103, 400], [96, 300], [91, 280], [85, 100]], "wd f", { edge: "ed" });
  a.poly([[84, 35], [120, -2], [146, -2], [149, 277], [93.5, 277], [87.5, 140]], "w f");
  a.poly([[98, 294], [150, 296], [159, 562], [115, 520], [106, 420]], "w f");
  a.ellipse(106, 65, 3.6, 8, "lp f");
  a.ellipse(121, 345, 3, 7.5, "lp f");
  a.path("M105 61.5v6M107.2 62v5M120 342v5M122 342.4v4.6", "h");
  const padlock = (x: number, y: number, key: number) => {
    a.rect(x - 1, y - 9, 9, 4, "b f", { r: 1 });
    a.path(`M${x + 1.2} ${y}V${y - 3}a2.3 2.3 0 0 1 4.6 0V${y}M${x + 3.5} ${y + 9}v${key}`, "h");
    a.rect(x, y, 8, 9.5, "gold f", { r: 2 });
  };
  padlock(83, 166, 10);
  padlock(100, 410, 14);

  // The pod's corner post.
  a.poly([[137, -2], [151, -2], [173.5, 604], [157.5, 604]], "b f", { edge: "ed" });

  // The curtain rod across the opening, held in a ring on the post.
  a.poly([[152, 68], [270.7, -2], [290.4, -2], [152, 79.5]], "st f");
  a.circle(152.5, 73.7, 5, "st f");
  a.rect(155, 80, 8, 11, "b f", { r: 1 });
  return a;
}
