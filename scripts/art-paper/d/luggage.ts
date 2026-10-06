import { Art } from "../lib";

/** Bags on the luggage shelves: a backpack, a duffel, a suitcase, a tote and a carry-on, each with its tag. */
export default function luggage(): Art {
  const a = new Art("luggage", [0, 0, 480, 360], [480, 360]);

  // Back plane: the wall behind the shelves.
  a.rect(36, 30, 408, 300, "s3", { r: 6 });

  // The shelves: teak uprights and two boards.
  a.rect(54, 36, 10, 294, "w f", { r: 2 });
  a.rect(416, 36, 10, 294, "w f", { r: 2 });
  a.rect(48, 146, 384, 12, "wd f", { r: 3, edge: "ed" });
  a.rect(48, 256, 384, 12, "wd f", { r: 3, edge: "ed" });
  a.line([[28, 330], [452, 330]], "l");

  // Top shelf: a backpack and a duffel.
  a.path("M90 146V86C90 60 154 60 154 86V146Z", "b f", { edge: "ed" });
  a.path("M108 64C108 50 136 50 136 64", "l");
  a.path("M96 96C110 106 134 106 148 96", "h");
  a.rect(102, 110, 40, 28, "wd f", { r: 7 });
  a.path("M108 120H136", "h");
  a.path("M152 92 168 110", "h");
  a.path("M164 106 178 100 186 116 172 122Z", "a f");
  a.path("M186 146C168 146 166 102 188 98H324C346 102 344 146 326 146Z", "g f", { edge: "eg" });
  a.path("M190 116H322", "h");
  a.path("M222 98C222 80 290 80 290 98", "l");
  a.path("M200 98V146M312 98V146", "h");

  // Bottom shelf: a hard suitcase, a tote, and a carry-on on its wheels.
  a.rect(88, 200, 176, 56, "cu f", { r: 9, edge: "ed" });
  a.path("M88 220H264M88 238H264", "h");
  a.path("M150 200V194C150 190 152 188 156 188H196C200 188 202 190 202 194V200", "l");
  a.rect(118, 200, 10, 56, "wd");
  a.rect(226, 200, 10, 56, "wd");
  a.path("M276 256 282 198H338L344 256Z", "c f");
  a.path("M292 198C292 180 328 180 328 198", "l");
  a.path("M286 214H334", "h");
  a.path("M368 250V208H392V250", "l");
  a.rect(352, 250, 56, 72, "r f", { r: 8, edge: "ew" });
  a.path("M366 258V314M380 258V314M394 258V314", "h");
  a.circle(362, 326, 4.5, "k");
  a.circle(398, 326, 4.5, "k");
  a.path("M392 250 410 238", "h");
  a.path("M406 236 422 232 426 248 410 252Z", "a f");
  return a;
}
