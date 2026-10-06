import { Art, polyD, rectPts } from "../lib";

/** The clay jar on the landing, beside the plaster parapet of the tiled stairs up to the next floor, a lattice screen at their head. */
export default function stairsJar(): Art {
  const a = new Art("stairs-jar", [0, 0, 480, 600], [480, 600]);

  // Back plane: the warm plaster wall behind the jar, and the shaded plane below the sloping edge at the far left.
  a.rect(-4, -4, 366, 612, "in3", { fibre: true });
  a.poly([[-4, 247], [104, 355], [104, 608], [-4, 608]], "wd3 f");

  // Far plane: the lattice screen at the head of the flight, its upper squares lit from beyond.
  const cols = [[355, 383], [395, 440], [451, 486]] as const;
  const rows = [[-6, 42], [50, 91], [99, 140], [148, 192], [200, 246], [254, 287]] as const;
  a.rect(352, -4, 134, 296, "wd3");
  let lit = "";
  for (const [y0, y1] of rows.slice(0, 3))
    for (const [x0, x1] of cols) lit += `M${x0} ${y0}H${x1}V${Math.round(y0 + 0.45 * (y1 - y0))}L${x0} ${Math.round(y0 + 0.12 * (y1 - y0))}Z`;
  a.path(lit, "in2");
  let lattice = polyD(rectPts(352, -4, 134, 293), "stairs-jar:lattice");
  for (const [y0, y1] of rows) for (const [x0, x1] of cols) lattice += polyD(rectPts(x0, y0, x1 - x0, y1 - y0), `stairs-jar:cell:${x0}:${y0}`);
  a.path(lattice, "lp2 f", { extra: ' fill-rule="evenodd"' });

  // The wall's return toward the screen, lit at the top and in shadow where it meets the parapet.
  a.poly([[316, -4], [358, -4], [357, 140], [334, 182]], "s f");
  a.poly([[357, 140], [375, 140], [366, 170], [356, 220], [339, 270], [333, 292], [331, 292], [333, 240], [334, 182]], "wd f");

  // The stairs beside the parapet: dark terracotta risers, lit treads, pale grout.
  a.poly([[412, 284], [486, 284], [486, 608], [420, 608]], "wd f");
  a.poly([[412, 285], [486, 285], [486, 291], [412, 291]], "r f");
  for (const [y0, y1] of [[333, 340], [388, 405], [473, 515]] as const) a.poly([[414, y0], [486, y0], [486, y1], [416, y1]], "r f");
  a.path("M443 405h1.6v68h-1.6ZM453 515h1.6v93h-1.6ZM431 389l1.4-.6 9.6 15-1.4.6ZM443 474l1.4-.6 15 41-1.4.6Z", "st");

  // The parapet: a plaster wall top climbing with the stairs, brightest where the light falls on it.
  const parapet = [[375, 140], [415, 140], [425, 608], [226, 608], [310, 365], [333, 292], [339, 270], [356, 220], [366, 170]] as const;
  // One deckle seed for its three layers, so the lit top and the ink follow the same cut.
  const id = "stairs-jar:parapet";
  a.poly(parapet, "s", { edge: "es", id });
  a.poly([[375, 140], [411, 140], [419, 608], [226, 608], [310, 365], [333, 292], [339, 270], [356, 220], [366, 170]], "lp", { id });
  // The light falls off toward the landing.
  a.path("M268 470C316 470 372 486 417 517L419 612H226Z", "lp2");
  a.path("M246 538C300 534 366 552 418 581L419 612H226Z", "lp3");
  a.poly(parapet, "l", { id });

  // The jar's shadow on the parapet.
  a.path("M310 366C326 380 340 396 345 418C350 446 334 482 316 506C306 520 298 532 294 542L240 542L240 366Z", "w4");

  // The plinth: a round plaster drum under the jar, lit on its left shoulder.
  a.path("M14 608L16 570C18 558 30 549 44 548L284 541C294 541 300 546 300 552L302 608Z", "in3 f", { edge: "es" });
  a.path("M17 574C19 560 30 551 44 549L52 550C38 553 28 562 26 576L25 608H16Z", "lp");

  // The jar: weathered grey clay above its ridge, dark terracotta below, a dark rolled rim.
  const body = "M40 317C30 330 14 346-8 368L-8 506C14 528 40 548 70 555C110 563 200 563 240 549C285 530 330 470 329 410C328 375 300 338 284 317Z";
  a.path(body, "wd", { edge: "ed" });
  a.add(`<clipPath id="j"><path d="${body}"/></clipPath>`);
  a.open('clip-path="url(#j)"');
  // Lamplit terracotta on the side toward the light, and paler streaks round the belly.
  a.path("M-10 500C14 524 40 544 72 552L66 560C36 552 10 534-10 514Z", "r");
  a.path("M-8 466C30 470 80 474 120 480C90 488 40 488-8 482ZM150 490C200 492 250 488 296 476C276 490 236 498 196 500C176 500 160 496 150 490Z", "r");
  // The grey patina above the ridge, its lower edge ragged where it meets the terracotta.
  a.path("M-10 300H340V430C318 434 300 440 276 440C256 446 236 442 214 448C196 446 176 450 150 446C110 448 70 444 40 438C20 436 6 432-10 428Z", "cu");
  a.path(
    "M30 352C70 358 120 362 170 360C150 366 100 368 60 364C46 362 36 358 30 352Z" +
      "M196 351C216 353 244 351 262 346C252 355 232 359 212 358Z" +
      "M150 392C200 396 260 394 306 384C290 395 250 403 206 404C180 404 160 398 150 392Z" +
      "M-6 398C20 404 60 410 96 412C70 419 30 417-6 410Z",
    "cu2",
  );
  a.path("M40 318C30 330 14 346-8 368V378C14 358 32 340 46 320Z", "st");
  a.close();
  a.path("M-8 430C80 450 230 452 327 428", "h");
  a.path(body, "l");
  a.path("M26 304C80 299 240 299 290 303C297 304 297 314 290 315C240 318 80 318 26 317C19 316 19 305 26 304Z", "b f");
  a.path("M30 303C80 299 240 299 286 302L284 304.4C240 301.6 80 301.6 32 305.4Z", "lp");
  a.path("M26 305C22 306 21 314 26 316L34 316C30 313 30 308 34 305Z", "lp");
  return a;
}
