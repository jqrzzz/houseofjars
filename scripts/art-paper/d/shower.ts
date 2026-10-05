import { Art } from "../lib";

/** A shared shower: a tiled wall, the rain head, a woven-band towel on its rail, soap on the shelf. */
export default function shower(): Art {
  const a = new Art("shower", [0, 0, 480, 360], [480, 360]);

  // The tiled wall, a darker band of tiles low down, and the floor.
  a.rect(40, 24, 400, 282, "p f", { r: 4, edge: "es" });
  a.rect(41, 224, 398, 81, "s");
  a.path("M80 26V304M120 26V304M160 26V304M200 26V304M240 26V304M280 26V304M320 26V304M360 26V304M400 26V304M42 64H438M42 104H438M42 144H438M42 184H438M42 224H438M42 264H438", "h2");

  // The house's stone wall lamp, lit.
  a.halo(208, 70, 12, 10);
  a.rect(200, 50, 6, 40, "b f", { r: 1.5 });
  a.rect(206, 56, 14, 26, "y f", { r: 3 });
  a.path("M209 64 217 60M209 72 217 68", "h");
  a.rect(204, 82, 18, 5, "b f", { r: 1 });
  a.poly([[20, 306], [460, 306], [472, 340], [8, 340]], "s f", { r: 3, edge: "es" });
  // A teak duckboard under the shower, and the drain beside it.
  a.poly([[244, 310], [362, 310], [368, 330], [238, 330]], "w f", { r: 2, edge: "ew" });
  a.path("M262 310 260 330M282 310 281 330M302 310V330M322 310 323 330M342 310 344 330", "h");
  a.ellipse(400, 322, 14, 4, "c f");
  a.path("M392 322H408", "h");

  // The rain head and its pipe, the mixer, and the water.
  a.path("M352 240V76H304", "l");
  a.path("M268 74C268 64 332 64 332 74L326 82H274Z", "lp f");
  let drops = "";
  const cols = [[282, 0], [292, 18], [302, 6], [312, 24], [322, 12]] as const;
  for (const [x, o] of cols) {
    for (let y = 92 + o; y < 296; y += 28) {
      const dx = (x - 300) * ((y - 82) / 220) * 0.6;
      const cx = x + dx;
      drops += `M${cx.toFixed(1)} ${y}c-2 4-2 7 0 8c2-1 2-4 0-8Z`;
    }
  }
  a.path(drops, "wt");
  a.rect(338, 178, 28, 22, "lp f", { r: 5 });
  a.circle(352, 189, 5, "a f");
  // Steam: round paper puffs rising off the water, the smallest highest.
  a.add('<g opacity=".72">');
  for (const [x, y, r] of [[338, 150, 12], [358, 140, 9], [372, 120, 8], [384, 102, 6], [390, 88, 4]] as const) a.circle(x, y, r, "p f");
  for (const [x, y, r] of [[262, 150, 9], [252, 132, 7], [258, 116, 5]] as const) a.circle(x, y, r, "p f");
  a.add("</g>");

  // The shelf: a bar of soap and a bottle.
  a.rect(196, 200, 64, 5, "wd f", { r: 2 });
  a.rect(204, 189, 20, 11, "a f", { r: 5 });
  a.path("M234 200V180C234 176 238 174 242 174C246 174 250 176 250 180V200Z", "lp f");
  a.rect(238, 168, 8, 6, "w f", { r: 1 });

  // The towel on its rail, with a woven band.
  a.line([[74, 118], [186, 118]], "l");
  a.circle(74, 118, 4, "k");
  a.circle(186, 118, 4, "k");
  a.path("M92 118H168V236C150 241 110 241 92 236Z", "lp f", { edge: "es" });
  a.path("M92 130H168M100 118V232", "h");
  a.rect(92, 212, 76, 12, "a");
  let band = "";
  for (let x = 98.3; x < 168; x += 12.7) band += `M${x.toFixed(1)} 213.5l4.5 4.5-4.5 4.5-4.5-4.5Z`;
  a.path(band, "b");
  a.path("M92 212H168M92 224H168", "h");
  return a;
}
