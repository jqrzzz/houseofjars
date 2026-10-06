import { Art } from "../lib";

/** The Friendship Bridge over the Mekong to Thailand: a bus crossing, a long-tail boat below. */
export default function bridge(): Art {
  const a = new Art("bridge", [0, 0, 480, 360], [480, 360]);
  a.fullFibre = true;

  // Back plane: sky, dusk, the low sun by Day, the moon by Evening.
  a.rect(0, 0, 480, 204, "sky");
  a.poly([[-2, 60], [482, 56], [482, 204], [-2, 204]], "dusk2");
  a.poly([[-2, 104], [482, 108], [482, 204], [-2, 204]], "dusk");
  a.open('class="dn"');
  a.halo(374, 192, 34, 9);
  a.path("M340 192A34 34 0 0 1 408 192Z", "sun f");
  a.close();
  a.open('class="ev"');
  a.halo(424, 54, 13, 6);
  a.circle(424, 54, 13, "lp f");
  for (const [x, y] of [[60, 40], [150, 70], [250, 34], [440, 110], [300, 96]] as const) a.circle(x, y, 1.5, "y");
  a.close();
  // Paper clouds.
  a.cloud(70, 92, 60);
  a.cloud(296, 70, 44);
  // The far bank with trees.
  a.path("M-2 196C14 190 22 180 34 180C46 180 48 188 60 188C84 190 104 186 122 186C130 176 146 176 150 184C180 186 214 182 240 182C266 182 300 184 330 182C350 182 380 180 410 182C430 172 446 172 452 180C462 182 472 180 482 180V206H-2Z", "g3 f2");

  // Middle plane: the river, with glints.
  a.rect(0, 202, 480, 44, "rv");
  a.rect(0, 246, 480, 58, "rw");
  a.path("M344 212h48v2.4h-48ZM360 226h48v2.4h-48ZM326 258h34v2.4h-34ZM380 270h24v2.4h-24ZM70 216h34v2.4h-34ZM150 262h40v2.4h-40ZM250 236h26v2.4h-26Z", "gl");

  // The bridge: piers standing in the water, the deck and its railing.
  for (const x of [34, 144, 254, 364, 474]) a.poly([[x, 168], [x + 20, 168], [x + 20, 252], [x, 252]], "s f", { edge: "es" });
  a.path("M24 254H64M134 254H174M244 254H284M354 254H394M464 254H480", "h");
  a.rect(-6, 150, 492, 18, "s f", { edge: "es" });
  a.path("M0 157H480M0 162H480", "h");
  let rail = "M0 138H480";
  for (let x = -4; x < 484; x += 16) rail += `M${x} 138V150`;
  a.path(rail, "h");
  // By Evening the bridge lamps are lit.
  a.open('class="ev"');
  for (const x of [40, 150, 260, 370]) a.halo(x + 4, 120, 3, 6);
  a.close();
  for (const x of [40, 150, 260, 370]) {
    a.path(`M${x} 150V122H${x + 8}`, "l");
    a.circle(x + 6, 122, 2.4, "y f");
  }

  // A bus crossing to Thailand: white with the jar-orange stripe.
  a.path("M204 126Q204 122 208 122H268Q276 122 278 130L280 146Q280 150 276 150H204Z", "p f");
  a.rect(204, 140, 76, 3.5, "a");
  for (const x of [212, 227, 242, 257]) a.rect(x, 128, 11, 9, "win f", { r: 2 });
  a.path("M270 128H275L277 140H270Z", "b f");
  a.circle(218, 150, 5, "b f");
  a.circle(264, 150, 5, "b f");

  // Front plane: the near bank, a long-tail boat and reeds.
  a.poly([[-4, 300], [80, 296], [160, 302], [240, 298], [320, 294], [400, 300], [484, 296], [484, 364], [-4, 364]], "s f", { edge: "es" });
  a.path("M70 268H146L138 280H80Z", "w f");
  a.path("M86 268V258H118V268", "l");
  a.path("M146 268 160 262", "l");
  a.path("M64 286H152", "h");
  a.path("M36 300V284M42 300V280M48 300V287M424 298V282M430 298V278M436 298V285", "l");
  return a;
}
