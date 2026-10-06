import { Art } from "../lib";

/** The house in section, lit like a lantern: pods and a bathroom upstairs, the front desk and café below. */
export default function house(): Art {
  const a = new Art("house", [24, 86, 616, 356], [616, 356]);

  // The street: ground and a tree outside.
  a.rect(0, 420, 640, 14, "s2");
  a.line([[24, 420], [640, 420]], "l");
  a.rect(618, 350, 4, 70, "b f", { r: 1 });
  a.path("M620 368C600 360 598 336 612 326C606 306 630 296 640 306V372C634 376 626 374 620 368Z", "g f");

  // Upstairs: back wall, side wall, floor.
  a.rect(82, 126, 502, 124, "lw");
  a.poly([[56, 126], [82, 108], [82, 250], [56, 268]], "s f");
  a.poly([[56, 268], [584, 268], [584, 250], [82, 250]], "w f");
  // Downstairs.
  a.rect(82, 282, 502, 120, "lw");
  a.poly([[56, 282], [82, 268], [82, 402], [56, 420]], "s f");
  a.poly([[56, 420], [584, 420], [584, 402], [82, 402]], "w f");

  // Three pods upstairs, each lit inside.
  for (const x of [96, 190, 284]) {
    a.rect(x, 170, 90, 80, "wd f", { r: 5, edge: "ed" });
    a.rect(x + 8, 178, 74, 50, "in f", { r: 3 });
    a.cone([x + 28, 206, 8], [x + 30, 226, 30]);
    a.path(`M${x + 24} 206l2-6h4l2 6Z`, "y f");
    a.rect(x + 10, 214, 70, 12, "lp f", { r: 3 });
    a.rect(x + 13, 208, 22, 9, "lp f", { r: 4 });
    a.path(`M${x + 50} 179C${x + 58} 180 ${x + 66} 178 ${x + 80} 179V228C${x + 70} 230 ${x + 60} 227 ${x + 50} 229Z`, "cu f");
    a.path(`M${x + 58} 182V226M${x + 66} 181V227M${x + 74} 182V226`, "h");
    a.rect(x + 8, 234, 30, 12, "b f", { r: 2 });
    a.circle(x + 32, 240, 1.6, "a");
  }
  // The air conditioner over the pods.
  a.rect(204, 134, 70, 18, "p f", { r: 4 });
  a.path("M212 146H266", "h");
  a.path("M218 158C222 164 216 168 220 174M240 158C244 164 238 168 242 174M262 158C266 164 260 168 264 174", "h");

  // The stairs between the floors.
  a.poly([[378, 250], [378, 236], [390, 236], [390, 222], [402, 222], [402, 208], [414, 208], [414, 250]], "w f");
  a.rect(408, 126, 8, 124, "b");

  // The bathroom: tiles, a shower and a basin with its mirror.
  a.poly([[416, 126], [442, 108], [442, 250], [416, 268]], "s f");
  a.rect(442, 126, 142, 124, "lw");
  a.path("M462 128V248M480 128V248M498 128V248M516 128V248M534 128V248M552 128V248M570 128V248M444 140H584M444 158H584M444 176H584M444 194H584M444 212H584M444 230H584", "h2");
  a.path("M548 250V156H528", "l");
  a.path("M512 154C512 148 540 148 540 154L537 160H515Z", "lp f");
  let drops = "";
  for (const [x, o] of [[518, 0], [526, 10], [534, 4]] as const) for (let y = 170 + o; y < 244; y += 18) drops += `M${x} ${y}c-1.5 3-1.5 5 0 6c1.5-1 1.5-3 0-6Z`;
  a.path(drops, "wt");
  a.rect(462, 160, 30, 28, "s f", { r: 4 });
  a.path("M458 204H498L494 216H462Z", "lp f");
  a.path("M476 204V196H482", "l");

  // Downstairs: the menu board, the front desk and its lamp.
  a.halo(178, 318, 6, 6);
  a.rect(104, 300, 84, 34, "lp f", { r: 2 });
  a.path("M112 310H150M112 318H170M112 326H140", "h");
  a.rect(88, 346, 118, 8, "wd f", { r: 2 });
  a.rect(94, 354, 106, 48, "w f", { edge: "ew" });
  a.path("M94 370H200", "h");
  a.path("M186 346V330L178 324", "l");
  a.path("M170 322H186L182 314H174Z", "y f");
  a.path("M112 346C112 336 128 336 128 346Z", "r f");

  // The café: two pendants over a round table, the coffee counter and its shelf.
  for (const x of [330, 420]) {
    a.cone([x, 312, 26], [x, 360, 56]);
    a.path(`M${x} 282V300`, "h");
    a.path(`M${x - 14} 312C${x - 14} 302 ${x - 6} 298 ${x} 298C${x + 6} 298 ${x + 14} 302 ${x + 14} 312Z`, "y f");
  }
  a.ellipse(376, 364, 34, 7, "wd f");
  a.path("M376 371V402M366 402H386", "l");
  a.path("M326 378H346M336 378V402M406 378H426M416 378V402", "l");
  a.path("M364 364V354H374V364Z", "lp f");
  a.rect(452, 346, 118, 8, "wd f", { r: 2 });
  a.rect(458, 354, 106, 48, "w f", { edge: "ew" });
  a.path("M476 354V402M494 354V402M512 354V402M530 354V402M548 354V402", "h");
  a.rect(470, 312, 32, 34, "b f", { r: 3 });
  a.rect(476, 318, 20, 8, "lp f", { r: 2 });
  a.path("M480 346V336H492V346", "l");
  a.path("M516 346V334H530V346ZM538 346V334H552V346Z", "lp f");
  a.line([[504, 300], [566, 300]], "l");
  a.path("M510 300V292H520V300ZM528 300V290H536V300ZM546 300V293H558V300Z", "c f");
  // A stone jar by the desk: the house's name.
  a.path("M226 402C218 394 216 380 224 372H244C252 380 250 394 242 402Z", "st f");
  a.path("M222 372H246V366H222Z", "c f");
  a.path("M258 402 262 386H282L286 402Z", "r f");
  a.path("M272 386C264 376 256 374 254 364C264 366 270 374 272 386C274 374 280 362 292 360C290 372 282 378 272 386Z", "g f");

  // The frame of the house: roof, floor slab and the end posts.
  a.rect(44, 98, 552, 28, "b f", { edge: "ed" });
  a.rect(44, 268, 552, 14, "b f", { edge: "ed" });
  a.rect(44, 98, 12, 322, "b f");
  a.rect(584, 98, 12, 322, "b f");
  return a;
}
