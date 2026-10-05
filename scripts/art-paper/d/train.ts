import { Art } from "../lib";

/** The Laos–China Railway: a train on its viaduct through layered green hills. */
export default function train(): Art {
  const a = new Art("train", [0, 0, 480, 360], [480, 360]);
  a.fullFibre = true;

  // Back plane: sky and dusk, the sun by Day, the moon and stars by Evening.
  a.rect(0, 0, 480, 272, "sky");
  a.poly([[-2, 70], [482, 66], [482, 272], [-2, 272]], "dusk2");
  a.poly([[-2, 104], [482, 108], [482, 272], [-2, 272]], "dusk");
  a.open('class="dn"');
  a.halo(370, 108, 24, 8);
  a.circle(370, 108, 24, "sun f");
  a.close();
  a.open('class="ev"');
  a.halo(366, 64, 14, 7);
  a.circle(366, 64, 14, "lp f");
  a.path("M358 58C362 54 368 56 368 60", "h");
  for (const [x, y] of [[60, 40], [140, 64], [228, 30], [290, 74], [432, 36], [470, 90]] as const) a.circle(x, y, 1.5, "y");
  a.close();

  // Paper clouds.
  a.cloud(70, 84, 64);
  a.cloud(236, 60, 46);
  // Layered hills: far, middle, near.
  a.path("M-2 150C30 128 70 120 104 136C144 110 186 104 226 128C266 106 312 100 352 124C388 110 438 112 482 132V272H-2Z", "g4 f2");
  a.path("M-2 186C56 164 108 166 156 180C214 158 276 160 326 176C380 162 436 164 482 176V272H-2Z", "g2 f2");
  a.path("M-2 268H482V364H-2Z", "g f");
  a.path("M0 300Q120 290 240 302Q360 314 480 300M0 334Q140 322 260 336Q380 348 480 332", "h");

  // The viaduct: deck and tapered piers.
  for (const x of [92, 258, 418]) a.poly([[x, 268], [x + 28, 268], [x + 22, 364], [x + 6, 364]], "s f", { edge: "es" });
  a.rect(-4, 254, 488, 14, "s f", { edge: "es" });
  a.path("M0 261H480", "h");

  // Catenary masts and the wire.
  a.path("M54 254V160M424 254V160M54 166H84M424 166H454", "l");
  a.path("M0 176Q120 182 240 176Q360 170 480 176", "h");

  // The train: bogies, then a sleek white body with a jar-orange stripe.
  for (const x of [16, 186, 330]) a.rect(x, 244, 44, 10, "b f", { r: 4 });
  a.path("M-10 198H382C412 198 438 208 456 226L466 238Q470 246 460 246H-10Z", "p f", { edge: "es" });
  a.path("M-10 226H450L458 236H-10Z", "a");
  a.path("M-10 226H450M-10 236H458", "h");
  a.path("M122 198V246M128 198V246M266 198V246M272 198V246", "h");
  for (const x of [6, 36, 66, 138, 168, 198, 284, 314]) a.rect(x, 206, 22, 13, "win f", { r: 3 });
  for (const x of [96, 228, 344]) a.rect(x, 206, 16, 13, "win f", { r: 3 });
  a.path("M250 202V244M260 202V244M250 202H260", "h");
  a.path("M372 204H390Q416 206 434 222H372Z", "b f");
  a.path("M198 198 211 189 198 180M224 198 211 189 224 180M192 180H230", "l");
  // The headlamp, glowing by Evening.
  a.open('class="ev"');
  a.halo(456, 231, 4, 5);
  a.close();
  a.ellipse(454, 231, 4, 2.6, "y f");
  return a;
}
