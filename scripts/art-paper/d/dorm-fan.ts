import { Art, n, polyD, type Pt } from "../lib";

/**
 * The dorm aisle under the ceiling fan, framed as the gallery shows the photo: two rows of
 * teak pods, two tiers each, with their beds, ladders and bunched curtains; the fan on the
 * cream ceiling; at the far end the air conditioner over two windows in the terracotta wall.
 */
export default function dormFan(): Art {
  const a = new Art("dorm-fan", [0, 0, 480, 600], [480, 600]);
  a.fullFibre = true;

  /* The far end: terracotta plaster and two windows, full of daylight by Day and dark by Evening. */
  a.rect(124, 160, 132, 306, "r2");
  a.rect(157, 281, 62, 82, "b f", { r: 1.5 });
  a.rect(167, 291, 42, 63, "p");
  a.path("M162 286H214V358H162Z", "h");
  a.rect(163, 319, 4, 16, "k", { r: 1.5 });
  // By Day the sunlit floor throws a warm glow up the wall, in stepped paper.
  a.open('class="dn"');
  for (const d of ["M124 466V404C150 372 230 372 256 404V466Z", "M134 466V420C158 394 222 394 246 420V466Z", "M146 466V436C166 418 214 418 234 436V466Z"]) {
    a.add(`<path class="p" opacity=".16" d="${d}"/>`);
  }
  a.close();
  a.rect(156, 381, 62, 61, "b f", { r: 1.5 });
  a.rect(162, 387, 50, 49, "p");

  /* The ceiling (warm by Day, lamplit by Evening), the dark beam and the air conditioner. */
  const ceiling: Pt[] = [[24, -2], [312, -2], [250, 170], [126, 170]];
  a.poly(ceiling, "in2");
  a.open('class="dn"');
  a.poly(ceiling, "dusk2");
  a.close();
  a.rect(120, 166, 140, 17, "b");
  a.rect(137, 183, 106, 36, "lp f", { r: 3 });
  a.path("M141 207H239", "h");
  a.rect(142, 210, 96, 5, "s", { r: 1.5 });
  a.path("M202 198h7", "h");

  // The fan: its shadow cast up on the ceiling, a cream mount and motor, and its round guard tilted toward the aisle.
  for (const [x, y, rx, ry] of [[181, 64, 36, 20], [182, 69, 26, 14], [183, 74, 15, 9]] as const) a.ellipse(x, y, rx, ry, "b", ' opacity=".12"');
  a.rect(160, 82, 48, 6, "lp f", { r: 1.5 });
  a.path("M163 88H205V118H198V96H170V118H163Z", "lp f");
  a.path("M172 98H196L193 124H175Z", "s f");
  a.open('transform="rotate(4 180 140)"');
  a.ellipse(180, 140, 40, 18, "lp f");
  a.path("M180 140C170 129 151 129 146 136C151 142 168 143 180 140ZM180 140C192 131 208 132 213 138C208 146 192 146 180 140ZM180 140C177 149 183 155 193 155C198 151 192 144 180 140Z", "s");
  a.ellipse(180, 140, 31, 13, "h");
  let wires = "";
  for (let i = 0; i < 10; i++) {
    const t = (i / 10) * Math.PI * 2 + 0.3;
    wires += `M${n(180 + 8 * Math.cos(t))} ${n(140 + 4.5 * Math.sin(t))}L${n(180 + 39 * Math.cos(t))} ${n(140 + 17.5 * Math.sin(t))}`;
  }
  a.path(wires, "h");
  a.ellipse(180, 140, 6, 4, "s f");
  a.close();

  /*
   * The floor: dark grey-brown stone tiles, five across at the back wall, their lines running to
   * the aisle's vanishing point, about (196, 331). By Day the tiles are dark with pale grout, and
   * the light from the windows lies down the middle of the aisle in stepped paler patches, as in
   * the photo. By Evening the stone is paler and the tile lines are drawn in ink.
   */
  const floorPts: Pt[] = [[128, 459], [250, 459], [310, 602], [52, 602]];
  // One deckled outline for both papers, seeded as a.poly seeds the stone floor.
  const floor = polyD(floorPts, `${a.name}:${floorPts.map((q) => q.join(" ")).join(",")}:st`);
  const across = [152.4, 176.8, 201.2, 225.6];
  const rows = [466, 474, 482, 492, 504, 516, 530, 546, 562, 581];
  const left = (y: number) => 128 - 0.531 * (y - 459);
  const right = (y: number) => 250 + 0.42 * (y - 459);
  const down = (x: number) => 196 + (x - 196) * 2.117;
  a.path(floor, "st");
  a.open('class="dn"');
  a.path(floor, "b2");
  // Grout as thin paper strips (the ink is for silhouettes), wider toward the front.
  let grout = "";
  for (const x of across) grout += `M${n(x - 0.4)} 459H${n(x + 0.4)}L${n(down(x) + 0.9)} 602H${n(down(x) - 0.9)}Z`;
  for (const y of rows) {
    const t = 0.35 + (0.45 * (y - 459)) / 143;
    grout += `M${n(left(y - t))} ${n(y - t)}H${n(right(y - t))}L${n(right(y + t))} ${n(y + t)}H${n(left(y + t))}Z`;
  }
  a.path(grout, "s", { extra: ' opacity=".5"' });
  for (const d of ["M138 463H242L230 602H148Z", "M146 465H234L218 602H156Z", "M152 467H226L208 602H164Z", "M158 469H216L200 590H172Z"]) {
    a.add(`<path class="p" opacity=".42" d="${d}"/>`);
  }
  a.close();
  let tiles = "";
  for (const x of across) tiles += `M${n(x)} 459L${n(down(x))} 602`;
  for (const y of rows) tiles += `M${n(left(y))} ${y}H${n(right(y))}`;
  a.open('class="ev" opacity=".55"');
  a.path(tiles, "h2");
  a.close();

  /** Bedding in lamplight: warm cream by Day, glowing cream by Evening. */
  const bed = (d: string) => {
    a.path(d, "lp f");
    a.open('class="dn"');
    a.path(d, "in3 f");
    a.close();
  };
  /** A ladder's side piece, and a rung between the two. */
  const stile = (x: number, top: number, w: number, bottom: number) => a.rect(x, top, w, bottom - top, "w f", { r: 1 });
  const rung = (x1: number, y1: number, x2: number, y2: number) =>
    a.poly([[x1, y1], [x2, y2], [x2, y2 + 3], [x1, y1 + 3]], "w f");
  /** Small woven diamonds scattered down a bunched curtain. */
  const weave = (pts: readonly Pt[]) => a.path(pts.map(([x, y]) => `M${x} ${y}l2 2-2 2-2-2Z`).join(""), "b");

  /* The left row beyond the near post: the second pod's two tiers, its ladder and curtain. */
  a.poly([[71, 56], [131, 170], [136, 172], [136, 462], [66, 602], [66, 56]], "wd2");
  a.poly([[78, 60], [131, 170], [134, 176], [80, 176]], "w2");
  a.rect(80, 172, 56, 8, "b");
  a.poly([[119, 180], [136, 180], [136, 444], [119, 440]], "wd3");
  a.path("M131 182V442", "h");
  // Upper tier: a pillow, the bedding, the shelf and its steel rail.
  bed("M84 278C83 266 86 257 92 252L103 256C104 264 103 272 102 280Z");
  bed("M78 281C96 276 114 278 128 286V311L78 318Z");
  a.poly([[76, 316], [134, 308], [134, 318], [76, 328]], "w f");
  a.poly([[76, 320], [118, 315], [118, 318], [76, 324]], "st");
  // Lower tier: two pillows and the bedding, on its teak base.
  a.path("M104 446C103 436 108 428 118 427L122 446Z", "lp f");
  a.path("M76 430C90 424 108 424 122 432L132 442L76 548Z", "lp f");
  a.path("M84 470C96 466 108 468 116 452M80 506C92 500 100 492 106 480", "h");
  a.path("M77 425C76 406 80 392 92 386L96 388C95 400 95 412 97 426Z", "lp f");
  a.poly([[72, 552], [134, 440], [136, 462], [66, 602]], "w f");
  // Its curtains, drawn back and bunched against the near post, each under a cream heading
  // (the upper one's sits under the beam, below): the upper one long, the lower one short.
  // The ladder stands in front of them.
  a.path("M80 84C86 82 94 82 100 86C104 130 104 170 98 220C95 250 91 278 87 298C84 300 80 300 78 298C77 272 78 246 79 220C80 170 78 130 80 84Z", "cu f");
  a.path("M88 92C90 150 87 220 84 292M95 94C96 150 93 210 90 260", "h");
  weave([[84, 110], [93, 126], [86, 150], [94, 172], [85, 196], [91, 222], [83, 250], [87, 276]]);
  a.path("M80 341C84 343 89 343 93 340C94 362 92 392 88 420C86 422 84 422 83 420C80 396 79 366 80 341Z", "cu f");
  weave([[85, 352], [89, 372], [84, 392]]);
  a.path("M80 325C84 322 90 322 94 324L93 340C89 343 84 343 80 341Z", "lp f");
  // Its ladder: five rungs between two rails.
  for (const y of [319, 370, 421, 471, 520]) rung(99, y + 6, 109, y - 2);
  stile(95, 239, 5, 548);
  stile(108, 246, 5, 522);

  /* The right row beyond the lockers: the second pod's two tiers, ladder and curtain. */
  a.poly([[303, -2], [340, -2], [340, 602], [292, 602], [244, 462], [246, 172]], "wd2");
  a.poly([[300, 0], [300, 60], [282, 70], [282, 166], [244, 172]], "w2");
  a.poly([[244, 168], [284, 164], [284, 176], [244, 182]], "b");
  a.rect(243, 176, 6, 288, "w2 f");
  // Upper tier: the bedding, the shelf and its steel rail.
  bed("M256 318C254 300 258 284 268 276C278 272 288 274 292 280V326Z");
  a.poly([[248, 316], [292, 326], [292, 334], [248, 323]], "w f");
  a.poly([[248, 322], [278, 330], [278, 333], [248, 325]], "st");
  // Lower tier: the bedding on its teak base.
  a.path("M268 420C278 418 290 420 296 424V600H284L268 560Z", "lp f");
  a.poly([[244, 446], [252, 446], [298, 602], [288, 602]], "w f");
  // Its curtains, bunched against the lockers, each under a cream heading: the upper one long,
  // the lower one short. The ladder stands in front of them.
  a.path("M283 74C287 72 293 72 297 74C298 120 298 180 296 230C295 250 294 268 292 282C289 284 286 284 284 282C282 260 281 240 281 220C280 170 281 120 283 74Z", "cu f");
  a.path("M288 80C289 140 288 200 287 270M293 80C294 140 293 200 291 250", "h");
  weave([[286, 96], [292, 118], [285, 142], [291, 166], [285, 192], [291, 216], [285, 240], [289, 264]]);
  a.rect(282, 62, 12, 12, "lp f", { r: 2 });
  a.path("M283 354C286 356 290 356 294 354C296 380 296 420 293 452C291 455 288 455 286 452C283 420 282 386 283 354Z", "cu f");
  weave([[288, 366], [290, 390], [287, 414], [290, 436]]);
  a.path("M282 335C286 332 291 332 295 334L294 354C290 357 286 357 283 354Z", "lp f");
  // Its ladder.
  for (const y of [322, 387, 450, 510, 566]) rung(265, y - 4, 270, y + 3);
  stile(259, 241, 6, 548);
  stile(270, 233, 7, 598);

  /* The top beam of the right row. */
  a.poly([[300, -2], [307, -2], [249, 172], [243, 172]], "b f");

  /* The near pod on the left: its lit ceiling, the partition at its far end, its beds. */
  a.poly([[-2, -2], [32, -2], [70, 62], [-2, 60]], "w");
  a.poly([[-2, 58], [70, 58], [70, 602], [-2, 602]], "wd");
  a.path("M14 66V214M30 66C31 120 29 170 30 214M50 66V300M22 352V528M44 352C45 420 43 480 44 566M60 352V602", "h2");
  a.poly([[-2, 52], [70, 54], [70, 64], [-2, 62]], "b");
  bed("M-2 218C10 216 22 218 28 222C24 236 14 246 -2 250Z");
  bed("M-2 262C14 258 32 264 40 276C44 292 42 310 36 318H-2Z");
  a.path("M2 280C14 278 26 282 34 292M4 300C14 298 24 302 30 310", "h");
  a.poly([[-2, 316], [68, 316], [68, 329], [-2, 334]], "w f", { edge: "ew" });
  a.poly([[-2, 344], [64, 331], [64, 336], [-2, 351]], "st");
  bed("M-2 532C14 528 30 534 36 546C38 566 36 586 30 602H-2Z");
  a.path("M4 548C14 548 24 554 28 564", "h");
  a.rect(36, 568, 31, 36, "b f");
  // The near post, its glossy edge catching the daylight, and the row's top beam.
  a.rect(67, 56, 13, 548, "b f", { edge: "ed" });
  a.rect(70, 250, 2.5, 352, "w");
  a.poly([[32, -2], [49, -2], [134, 170], [128, 172]], "b f");
  // The left curtain's cream heading, bunched under the beam.
  a.poly([[80, 86], [85, 86], [99, 109], [99, 116], [95, 116], [80, 92]], "lp f", { r: 1.5 });

  /* The lockers: three teak doors, each with a round number plate. */
  a.rect(297, -2, 34, 604, "w f", { edge: "ew" });
  a.poly([[297, 290], [329, 285], [329, 498], [297, 452]], "w2");
  a.poly([[297, 456], [329, 502], [329, 602], [297, 602]], "w2");
  a.path("M297 289L330 284M297 454L330 500", "h");
  a.ellipse(308, 151, 3, 4.5, "s f");
  a.ellipse(306, 336, 3, 4.5, "s f");
  a.ellipse(305, 525, 3, 4.5, "s f");
  a.path("M307 150v2.5M309 150v2.5M305 335v2.5M307 335v2.5M304 524v2.5M306 524v2.5", "h");
  a.rect(293, 380, 5, 16, "s f", { r: 1 });
  a.rect(292, 540, 5, 18, "s f", { r: 1 });
  a.rect(330, -2, 7, 604, "b");

  /* The near pod on the right: the partition at its far end, pillows, shelf and rail. */
  a.rect(336, -2, 146, 604, "wd");
  a.path("M352 0V150M372 0C373 60 371 110 372 160M398 0V140M426 0C427 50 425 100 426 150M456 0V130M352 372V602M380 380C381 460 379 520 380 602M410 400V540M440 410C441 470 439 520 440 540M466 420V540", "h2");
  bed("M413 166C430 164 456 160 482 158V228C466 232 452 232 444 228C432 212 424 186 413 166Z");
  bed("M374 330C364 312 364 276 380 262C402 254 440 242 482 222V346C440 344 404 340 374 330Z");
  a.path("M420 172C440 182 452 200 456 228M384 270C400 280 404 300 400 334M440 252C452 270 456 300 452 340", "h");
  a.poly([[331, 328], [482, 344], [482, 364], [331, 340]], "w f", { edge: "ew" });
  a.poly([[334, 345], [482, 406], [482, 416], [334, 352]], "cu f");
  a.rect(333, 343, 8, 11, "s f", { r: 1.5 });
  bed("M408 558C426 550 456 548 482 548V602H414C410 588 407 572 408 558Z");
  a.path("M420 566C440 574 452 590 454 602", "h");
  return a;
}
