import { Art } from "../lib";

/** The Mekong riverside at dusk: paper lanterns on strings, the river and the far bank, a lamp by the railing. */
export default function riverside(): Art {
  const a = new Art("riverside", [0, 0, 480, 360], [480, 360]);
  a.fullFibre = true;

  // Back plane: the sky, a dusk band, the low sun by Day and the moon by Evening.
  a.rect(0, 0, 480, 200, "sky");
  a.poly([[-2, 96], [482, 92], [482, 202], [-2, 202]], "dusk2");
  a.poly([[-2, 136], [482, 140], [482, 202], [-2, 202]], "dusk");
  a.open('class="dn"');
  a.halo(368, 186, 30, 9);
  a.path("M338 186A30 30 0 0 1 398 186Z", "sun f");
  a.close();
  a.open('class="ev"');
  a.halo(290, 142, 13, 5);
  a.circle(290, 142, 13, "lp f");
  a.path("M283 137C286 134 291 135 292 139", "h");
  for (const [x, y] of [[300, 96], [430, 92], [250, 120], [456, 140], [196, 104]] as const) a.circle(x, y, 1.5, "y");
  a.close();
  // Paper clouds.
  a.cloud(196, 132, 62);
  a.cloud(404, 120, 44);
  // The far bank, with a line of trees.
  a.path("M-2 184C14 184 18 174 30 174C40 174 42 180 52 180C70 182 96 178 120 180C130 172 144 170 150 178C176 180 200 176 226 176C236 168 252 170 256 176C290 178 320 176 344 176C356 174 380 174 404 172C414 162 430 164 434 172C450 172 466 170 482 170V198H-2Z", "g3 f2");

  // Middle plane: the river, with glints.
  a.rect(0, 194, 480, 30, "rv");
  a.rect(0, 224, 480, 30, "rw");
  a.path("M326 204h34v2.4h-34ZM340 216h44v2.4h-44ZM306 234h30v2.4h-30ZM354 244h20v2.4h-20ZM96 208h32v2.4h-32ZM40 238h36v2.4h-36ZM180 230h22v2.4h-22Z", "gl");

  // A long-tail boat heading downstream.
  a.path("M226 236H290L284 246H234Z", "w f");
  a.path("M240 236V228H266V236", "l");
  a.path("M290 236 302 231", "l");
  a.path("M224 248H292", "h");

  // Front plane: the promenade, its railing, a bench and the lamp.
  a.rect(-4, 252, 488, 112, "s f", { edge: "es" });
  a.rect(-4, 252, 488, 10, "p f");
  a.path("M0 296H480", "h");
  let rail = "";
  for (let x = 20; x < 480; x += 40) rail += `M${x} 262v34`;
  a.path(rail, "l");
  a.line([[0, 296], [480, 296]], "l");
  a.rect(180, 316, 112, 9, "wd f", { r: 3 });
  a.path("M190 325V344M282 325V344", "l");
  a.halo(92, 120, 10, 9);
  a.rect(90, 128, 4, 168, "b f", { r: 1 });
  a.path("M83 128H101L97 112H87Z", "y f");
  a.path("M86 110H98L92 104Z", "b f");

  // Foremost: two strings of paper lanterns.
  a.path("M0 24Q120 78 240 30Q360 78 480 26", "h");
  a.path("M0 58Q140 104 270 60Q380 100 480 64", "h");
  const lantern = (x: number, y: number, big: boolean) => {
    const rx = big ? 9 : 7.5;
    const ry = big ? 11 : 9;
    a.add(`<g class="ev">`);
    a.halo(x, y + ry + 1, rx, 5);
    a.add(`</g>`);
    a.path(`M${x} ${y - 6}V${y}`, "h");
    a.ellipse(x, y + ry + 1, rx, ry, big ? "a f" : "r f");
    a.path(`M${x - 5} ${y + 2}H${x + 5}M${x - 5} ${y + 2 * ry}H${x + 5}M${x} ${y + 2}V${y + 2 * ry}`, "h");
  };
  for (const [x, y] of [[40, 46], [100, 62], [160, 58], [300, 50], [360, 64], [430, 50]] as const) lantern(x, y, true);
  for (const [x, y] of [[70, 76], [210, 74], [330, 74], [400, 86]] as const) lantern(x, y, false);
  return a;
}
