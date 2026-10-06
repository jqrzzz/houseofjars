import { Art } from "../lib";

/** The front door: a teak-framed glass door standing open, the café's lamps inside, the house sign above. */
export default function door(): Art {
  const a = new Art("door", [0, 0, 360, 420], [360, 420]);

  // Back plane: the front wall.
  a.rect(30, 40, 300, 336, "s3", { r: 6 });

  // The doorway: teak frame, glass transom, and the lit café beyond.
  a.rect(86, 92, 168, 280, "w f", { r: 3, edge: "ew" });
  a.rect(100, 104, 140, 30, "in f", { r: 2 });
  a.path("M135 104V134M170 104V134M205 104V134", "h");
  a.rect(100, 142, 140, 230, "in f");
  // Inside: two café pendants, lit, and the floor.
  a.halo(180, 196, 6, 6);
  a.halo(218, 180, 6, 6);
  a.path("M180 142V186M218 142V170", "h");
  a.path("M171 196 173 190C174 186 177 184 180 184C183 184 186 186 187 190L189 196Z", "y f");
  a.path("M209 180 211 174C212 170 215 168 218 168C221 168 224 170 225 174L227 180Z", "y f");
  a.path("M100 318H240", "h");
  a.poly([[100, 318], [240, 318], [240, 372], [100, 372]], "in2");
  // The glass door, swung in: a teak frame round four panes.
  a.poly([[100, 142], [152, 156], [152, 352], [100, 372]], "wd f");
  a.poly([[108, 156], [144, 166], [144, 340], [108, 356]], "in3 f");
  a.path("M108 214 144 220M108 274 144 276M126 161V348", "h");
  a.rect(144, 250, 4, 22, "k", { r: 2 });

  // The house sign on two hooks: a teak board with the arch, no words.
  a.path("M128 60V70M212 60V70", "h");
  a.rect(116, 68, 108, 22, "w f", { r: 2, edge: "ew" });
  a.path("M164 86V77C164 73.5 166.7 71 170 71C173.3 71 176 73.5 176 77V86Z", "k");

  // The step, and lamplight spilling out onto it.
  a.poly([[78, 372], [262, 372], [272, 388], [68, 388]], "s f", { r: 2, edge: "es" });
  a.add('<path class="hl" d="M100 388H240L292 418H48Z"/><path class="hl" d="M110 388H230L270 414H70Z"/><path class="hl" d="M120 388H220L250 410H90Z"/><path class="hl" d="M130 388H210L232 406H108Z"/>');

  // The stone wall lamp beside the door.
  a.halo(286, 178, 12, 10);
  a.rect(276, 160, 6, 40, "b f", { r: 1.5 });
  a.rect(282, 165, 14, 26, "y f", { r: 3 });
  a.path("M285 173 293 169M285 181 293 177", "h");
  a.rect(280, 191, 18, 5, "b f", { r: 1 });

  // A potted plant by the step.
  a.path("M268 372 274 330H316L322 372Z", "r f");
  a.path("M296 330C286 306 268 300 262 282C280 284 294 300 296 330C298 300 312 280 330 276C328 298 310 310 296 330Z", "g f");
  a.path("M296 330C296 304 300 286 306 268", "h");
  a.path("M296 330C290 318 278 316 272 306", "h");
  return a;
}
