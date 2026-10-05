import { Art } from "../lib";

/** A city bus at its stop: the shelter and its sign, a skyline behind whose windows light up by Evening. */
export default function bus(): Art {
  const a = new Art("bus", [0, 0, 480, 360], [480, 360]);
  a.fullFibre = true;

  // Back plane: sky and dusk, the moon by Evening.
  a.rect(0, 0, 480, 290, "sky");
  a.poly([[-2, 64], [482, 60], [482, 290], [-2, 290]], "dusk2");
  a.poly([[-2, 100], [482, 104], [482, 290], [-2, 290]], "dusk");
  a.open('class="ev"');
  a.halo(80, 54, 13, 7);
  a.circle(80, 54, 13, "lp f");
  for (const [x, y] of [[180, 40], [260, 66], [330, 30], [420, 58], [24, 90]] as const) a.circle(x, y, 1.5, "y");
  a.close();

  // Paper clouds, and the low sun by Day.
  a.open('class="dn"');
  a.halo(300, 96, 20, 8);
  a.circle(300, 96, 20, "sun f");
  a.close();
  a.cloud(150, 82, 60);
  a.cloud(392, 64, 42);
  // The skyline: a far row of blocks, then a nearer one with windows.
  a.poly([[-2, 150], [40, 150], [40, 124], [74, 124], [74, 140], [118, 140], [118, 112], [150, 112], [150, 134], [204, 134], [204, 118], [240, 118], [240, 104], [270, 104], [270, 128], [318, 128], [318, 110], [352, 110], [352, 132], [396, 132], [396, 116], [436, 116], [436, 138], [482, 138], [482, 290], [-2, 290]], "dusk3 f2");
  a.poly([[-2, 168], [34, 168], [34, 146], [70, 146], [70, 174], [96, 174], [96, 132], [132, 132], [132, 160], [164, 160], [164, 140], [196, 140], [196, 156], [232, 156], [232, 128], [262, 128], [262, 150], [328, 150], [328, 122], [356, 122], [356, 150], [372, 150], [372, 138], [404, 138], [404, 166], [436, 166], [436, 128], [468, 128], [468, 158], [482, 158], [482, 290], [-2, 290]], "r4 f2");
  let wins = "";
  for (const [x, y] of [[104, 142], [118, 142], [104, 156], [240, 138], [250, 152], [334, 132], [344, 132], [334, 146], [444, 138], [456, 138], [444, 152], [12, 178], [176, 150], [380, 148]] as const) wins += `M${x} ${y}h6v8h-6Z`;
  a.path(wins, "win");

  // The road: kerb, lanes and a centre line.
  a.rect(-4, 272, 488, 92, "s f", { edge: "es" });
  a.rect(-4, 272, 488, 8, "p f");
  a.path("M0 302H480", "h");
  a.path("M10 334h30v3h-30ZM80 334h30v3h-30ZM150 334h30v3h-30ZM220 334h30v3h-30ZM290 334h30v3h-30ZM360 334h30v3h-30ZM430 334h30v3h-30Z", "p");

  // The stop: a shelter with a bench, and its round sign.
  a.path("M372 272V178M452 272V172", "l");
  a.poly([[356, 176], [470, 166], [470, 176], [356, 186]], "r f");
  a.rect(382, 240, 62, 8, "wd f", { r: 3 });
  a.path("M390 248V272M436 248V272", "l");
  a.path("M466 272V216", "l");
  a.circle(466, 206, 10, "a f");
  a.rect(460, 204.5, 12, 3, "p");

  // The bus: a white body with a jar-orange stripe, windows, a door and its headlamp.
  a.path("M40 182Q40 172 50 172H316Q338 172 344 192L352 270Q354 284 340 284H40Z", "p f", { edge: "es" });
  a.path("M40 244H350L351 256H40Z", "a");
  a.path("M40 244H350M40 256H351", "h");
  for (const x of [52, 100, 148, 214, 262]) a.rect(x, 196, 40, 34, "win f", { r: 4 });
  a.path("M314 188H330Q338 190 340 200L344 232H314Z", "b f");
  a.path("M196 186V282M208 186V282M196 186H208", "h");
  a.path("M60 172V164H160V172", "l");
  a.open('class="ev"');
  a.halo(350, 268, 4, 5);
  a.close();
  a.ellipse(349, 268, 3, 4, "y f");
  for (const x of [96, 284]) {
    a.circle(x, 284, 18, "b f");
    a.circle(x, 284, 7.5, "c f");
    a.circle(x, 284, 2.4, "k");
  }
  return a;
}
