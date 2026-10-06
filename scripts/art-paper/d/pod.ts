import { Art, n } from "../lib";

/**
 * One pod, drawn apart: curtain, reading light, socket and the locker below, each with a callout dot.
 * Without `callouts` it is the same pod with no dots or leaders (pod-plain.ts), for where nothing numbers them.
 */
export default function pod({ callouts = true }: { callouts?: boolean } = {}): Art {
  const a = new Art("pod", [0, 0, 480, 360], [480, 360]);

  // The pod: a teak box with a lit hollow.
  a.rect(60, 58, 330, 208, "w f", { r: 16, edge: "ew" });
  a.rect(78, 78, 294, 172, "wd f", { r: 10 });
  // The hollow: ceiling and walls in lamplit teak, the back wall brightest.
  a.poly([[84, 82], [366, 82], [344, 98], [106, 98]], "w");
  a.poly([[82, 84], [106, 98], [106, 218], [82, 246]], "w");
  a.poly([[368, 84], [344, 98], [344, 218], [368, 246]], "w");
  a.rect(106, 98, 238, 120, "in f", { r: 4 });
  a.path("M84 82 106 98M366 82 344 98M82 246 106 218M368 246 344 218", "h");
  // Teak panels on the back wall.
  a.path("M146 100V216M226 100V216M306 100V216", "h");

  // The reading light, a little stone shade on a bracket, and its pool of light.
  a.cone([168, 128, 20], [176, 216, 128]);
  a.halo(168, 117, 9, 7);
  a.rect(160, 103, 16, 4, "b f", { r: 1 });
  a.rect(159, 107, 18, 21, "y f", { r: 3 });
  a.path("M162 113H174M162 120H174", "h");

  // The socket: a plate with two holes.
  a.rect(204, 142, 22, 24, "lp f", { r: 4 });
  a.circle(215, 154, 7, "h");
  a.circle(212, 154, 1.6, "b");
  a.circle(218, 154, 1.6, "b");

  // The bed: mattress, pillow and a blanket folded back with a woven band.
  a.rect(88, 214, 274, 30, "lp f", { r: 7 });
  a.path("M98 214C96 198 104 194 120 195L160 196C174 197 176 203 175 214Z", "lp f");
  a.path("M110 205C126 208 148 208 164 205", "h");
  a.path("M200 244V222C200 212 212 207 226 208L350 210C358 210 362 214 362 222V244Z", "lp f");
  a.path("M201 214C230 217 320 217 361 215V223C320 225 230 225 201 222Z", "a");
  let weave = "";
  for (let x = 210; x < 356; x += 12) weave += `M${x} 215.5l3.6 3.6-3.6 3.6-3.6-3.6Z`;
  a.path(weave, "b");

  // The curtain on its rail: woven, grey-brown, with a cream heading.
  a.line([[70, 70], [382, 70]], "l");
  a.path(
    "M284 72C298 74 312 71 326 74C340 71 356 74 380 72V250C368 254 358 247 346 251C334 247 322 253 310 249C300 252 292 248 284 251Z",
    "cu f",
    { edge: "ed" },
  );
  a.path("M284 72C298 74 312 71 326 74C340 71 356 74 380 72V86C356 88 340 85 326 88C312 85 298 88 284 86Z", "p f");
  a.path("M298 90C300 140 296 196 300 248M314 90C316 140 312 196 316 250M330 90C332 140 328 196 332 248M346 90C348 140 344 196 348 250M362 90C364 140 360 196 364 248", "h");
  // A woven diamond band near the hem.
  let band = "";
  for (let x = 292; x <= 372; x += 10) band += `M${x} 226l4 4-4 4-4-4Z`;
  a.path(band, "b");
  for (let x = 290; x <= 374; x += 14) a.circle(x, 70, 3.2, "c f");

  // The base: a teak drawer under the pod.
  a.rect(60, 262, 330, 40, "wd f", { r: 6, edge: "ed" });
  a.rect(282, 268, 94, 28, "b f", { r: 3 });
  a.path("M314 282H344", "l");

  // The locker, drawn out below: a keypad and a handle.
  a.path("M282 296 296 318M376 296 390 318", "h d");
  a.rect(296, 318, 94, 34, "b f", { r: 4, edge: "ed" });
  a.rect(304, 324, 30, 22, "p f", { r: 2 });
  a.path("M310 330h2M318 330h2M326 330h2M310 338h2M318 338h2M326 338h2", "l");
  a.path("M352 335H378", "l");

  // Callouts: curtain, light, socket, locker (PodDiagram numbers sit on the dots).
  if (!callouts) return a;
  const call = (x1: number, y1: number, x2: number, y2: number) => {
    a.path(`M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`, "h d");
    a.circle(x1, y1, 2.2, "k");
    a.circle(x2, y2, 7, "a f");
  };
  call(380, 104, 436, 104);
  call(168, 103, 168, 28);
  call(215, 142, 240, 28);
  call(390, 335, 440, 335);
  return a;
}
