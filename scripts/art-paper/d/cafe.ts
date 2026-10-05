import { Art } from "../lib";

/** Breakfast on the café counter: two fried eggs, salad, a baguette, fruit and a hot coffee, under the café pendant. */
export default function cafe(): Art {
  const a = new Art("cafe", [0, 0, 480, 360], [480, 360]);

  // Back plane: the café wall, and the floor under the counter.
  a.rect(22, 26, 436, 318, "s3", { r: 6 });

  // The shelf: cups, a teapot, a little stone jar and a plant.
  a.rect(54, 106, 204, 7, "wd f", { r: 2 });
  a.path("M66 113v8h8M246 113v8h-8", "h");
  a.path("M72 106V90C72 88 74 87 76 87H92C94 87 96 88 96 90V106Z", "p f");
  a.path("M96 92C104 92 104 102 96 102", "l");
  a.path("M150 106C138 106 136 84 154 80H178C194 84 192 106 180 106Z", "c f");
  a.path("M190 88C200 88 202 80 208 74", "l");
  a.path("M144 88C134 88 134 98 141 100", "l");
  a.path("M158 80C158 73 174 73 174 80", "l");
  // A small stone jar: the house's name, on the shelf.
  a.path("M110 106C104 100 104 90 110 86H124C130 90 130 100 124 106Z", "s f");
  a.path("M109 86H125V81H109Z", "c f");
  a.path("M214 106 218 90H240L244 106Z", "r f");
  a.path("M229 90C222 78 212 76 210 68C220 68 228 76 229 90C230 76 238 64 248 64C248 76 238 82 229 90Z", "g f");
  a.path("M229 90V74", "h");

  // The café pendant: a squat bell shade on a teak cap, its light stepped down to the counter.
  a.cone([340, 80, 44], [340, 206, 168]);
  a.halo(340, 76, 14, 9);
  a.path("M340 0V44", "h");
  a.rect(333, 42, 14, 6, "w f", { r: 1.5 });
  a.path("M314 80 318 66C321 55 330 48 340 48C350 48 359 55 362 66L366 80Z", "y f");
  a.path("M318 80C326 84 354 84 362 80", "h");

  // The counter: a teak slab on a slatted front.
  a.rect(30, 204, 420, 16, "wd f", { r: 4, edge: "ed" });
  a.rect(42, 220, 396, 110, "w f", { edge: "ew" });
  a.path("M75 226V324M108 226V324M141 226V324M174 226V324M207 226V324M240 226V324M273 226V324M306 226V324M339 226V324M372 226V324M405 226V324", "h");
  a.rect(48, 330, 384, 8, "b f", { r: 2 });
  // A woven band along the counter's top rail.
  a.rect(43, 226, 394, 12, "a");
  let band = "";
  for (let x = 52; x < 432; x += 14) band += `M${x} 227.5l4.5 4.5-4.5 4.5-4.5-4.5Z`;
  a.path(band, "b");
  a.path("M43 226H437M43 238H437", "h");

  // Breakfast: a plate with two fried eggs, salad and a baguette.
  a.ellipse(150, 197, 88, 15, "lp f");
  a.ellipse(150, 194, 70, 10, "h");
  a.path("M92 184C90 176 98 172 108 172L186 166C196 166 200 172 198 178C196 184 190 186 182 186L104 190C98 190 93 188 92 184Z", "w f");
  a.path("M118 180 126 172M140 178 148 170M162 176 170 168", "h");
  const egg = (x: number, y: number) => {
    a.path(`M${x - 22} ${y + 2}C${x - 28} ${y - 6} ${x - 16} ${y - 13} ${x - 6} ${y - 9}C${x + 2} ${y - 16} ${x + 18} ${y - 12} ${x + 18} ${y - 3}C${x + 26} ${y + 1} ${x + 20} ${y + 10} ${x + 10} ${y + 9}C${x} ${y + 14} ${x - 18} ${y + 12} ${x - 22} ${y + 2}Z`, "lp f");
    a.circle(x - 2, y - 2, 7, "y f");
  };
  egg(102, 196);
  egg(144, 192);
  a.path("M176 200C170 190 178 182 188 184C192 176 204 178 206 186C214 186 218 196 210 200Z", "g f");
  a.path("M184 192C190 194 198 192 204 188", "h");
  a.circle(200, 196, 6, "r f");
  a.circle(184, 197, 5, "r f");

  // A hot coffee on its saucer.
  a.ellipse(272, 206, 32, 7, "lp f");
  a.path("M252 172H292L288 200C286 206 258 206 256 200Z", "lp f");
  a.ellipse(272, 174, 19, 3.5, "b");
  a.path("M292 178C306 178 306 196 288 196", "l");
  a.path("M264 162C258 152 270 148 264 138M280 162C274 152 286 148 280 138", "h");

  // Fruit: a banana and two round fruits on a small plate.
  a.ellipse(390, 202, 50, 10, "lp f");
  a.path("M352 194C364 204 404 204 424 186C428 184 430 188 428 190C410 210 362 210 350 198C348 196 350 192 352 194Z", "y f");
  a.circle(372, 186, 11, "g f");
  a.circle(398, 184, 10, "a f");
  a.path("M398 174V170", "l");

  // Front plane: two bar stools.
  for (const x of [118, 372]) {
    a.path(`M${x - 18} 296 ${x - 24} 344M${x + 18} 296 ${x + 24} 344M${x - 21} 322H${x + 21}`, "l");
    a.rect(x - 30, 284, 60, 12, "wd f", { r: 5, edge: "ed" });
  }
  return a;
}
