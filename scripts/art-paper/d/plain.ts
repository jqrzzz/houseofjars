import { Art } from "../lib";

/** The Plain of Jars: three hand-hewn stone jars and a fallen lid on a grassy rise, hills behind. */
export default function plain(): Art {
  const a = new Art("plain", [0, 0, 480, 360], [480, 360]);

  // By Evening: a paper moon and a few pin-prick stars.
  a.open('class="ev"');
  a.halo(96, 92, 16, 7);
  a.circle(96, 92, 16, "lp f");
  a.path("M88 84C92 82 96 84 96 88", "h");
  for (const [x, y] of [[40, 60], [160, 50], [208, 96], [300, 44], [356, 78], [430, 54]] as const) a.circle(x, y, 1.6, "y");
  a.close();

  // Back planes: far hills, then a nearer ridge.
  a.path("M40 300C44 250 92 200 146 206C180 178 226 172 262 192C300 170 360 168 396 196C430 200 452 236 452 300Z", "g3 f2");
  a.path("M28 316C40 270 110 244 176 254C236 232 330 230 392 252C432 262 456 290 456 316Z", "g2 f2");

  // The rise the jars stand on.
  a.path("M16 330C16 280 110 246 240 244C370 242 464 276 464 330Z", "g f", { edge: "eg" });

  // A tree on the rise.
  a.rect(402, 150, 5, 50, "b f", { r: 1.5 });
  a.path("M404 160C388 154 382 132 396 122C392 104 414 96 426 106C440 98 456 112 448 128C460 140 448 160 430 156C422 164 410 164 404 160Z", "g f", { edge: "eg" });
  a.path("M404 150 394 136M406 140 418 124", "h");

  const jar = (tx: number, ty: number, rot: number, body: string, rim: string, mouth: string, detail: string) => {
    a.open(`transform="translate(${tx} ${ty}) rotate(${rot})"`);
    a.path(body, "st f", { edge: "es" });
    a.path(rim, "lp f");
    a.path(mouth, "b");
    a.add(detail);
    a.close();
  };
  // Shadows on the grass.
  a.ellipse(130, 302, 57, 5, "g3");
  a.ellipse(250, 314, 61, 5, "g3");
  a.ellipse(370, 302, 46, 5, "g3");
  jar(
    130, 300, -5,
    "M-41 -2Q0 5 43 -2L47 -8Q51 -14 51 -23Q50 -33 49 -43Q47 -53 45 -63L43 -72L48 -75Q49 -76 48 -80L41 -83L23 -84L0 -87L-23 -85L-40 -84L-47 -80Q-48 -76 -47 -75L-43 -72L-45 -62Q-47 -53 -47 -43Q-47 -34 -47 -24Q-46 -15 -44 -8L-41 -2Z",
    "M48 -80L41 -83L23 -84L0 -87L-23 -85L-40 -84L-47 -80L-42 -78Q-38 -76 -26 -75Q-15 -74 0 -74Q15 -75 26 -76Q38 -77 43 -79L48 -80Z",
    "M-32 -81A32 3 0 0 1 32 -81A32 3 0 0 1 -32 -81Z",
    '<path class="b f" d="M-6 -78L-5 -56L4 -48L10 -52L17 -50L24 -59L26 -79Z"/><path class="g" d="M-30 -48c3-4 9-4 11 0c-2 3-8 4-11 0ZM28 -30c3-3 8-3 9 1c-2 3-7 3-9-1Z"/>',
  );
  jar(
    250, 312, 2,
    "M-44 -2Q0 6 45 -2L48 -16Q51 -30 52 -49Q53 -68 53 -89Q54 -109 50 -129L46 -148L49 -152Q51 -154 49 -161L42 -163L24 -165L0 -167L-24 -165L-43 -164L-49 -161Q-50 -154 -49 -152L-46 -148L-48 -129Q-51 -111 -51 -90Q-51 -70 -51 -50Q-50 -30 -47 -16L-44 -2Z",
    "M49 -161L42 -163L24 -165L0 -167L-24 -165L-43 -164L-49 -161L-44 -159Q-39 -158 -27 -157Q-16 -156 -1 -156Q14 -155 27 -156Q39 -157 44 -159L49 -161Z",
    "M-33 -161A33 2 0 0 1 33 -161A33 3 0 0 1 -33 -161Z",
    '<path class="h" d="M17 -150l-4 12l3 12l-4 12l-1 12"/><path class="g" d="M-36 -122c4-5 11-5 13 0c-3 4-10 4-13 0ZM-30 -40c3-4 9-4 11 0c-2 3-8 4-11 0Z"/>',
  );
  jar(
    370, 300, 5,
    "M-33 -2Q0 5 31 -2L33 -10Q35 -17 38 -27Q40 -38 39 -49Q38 -61 36 -72L34 -83L37 -85Q38 -87 37 -90L32 -93L18 -94L0 -94L-19 -94L-32 -93L-36 -90Q-38 -87 -36 -85L-34 -83L-37 -72Q-39 -60 -41 -49Q-43 -38 -41 -28Q-38 -17 -35 -10L-33 -2Z",
    "M37 -90L32 -93L18 -94L0 -94L-19 -94L-32 -93L-36 -90L-33 -90Q-30 -89 -20 -87Q-11 -86 0 -86Q11 -87 20 -88Q30 -89 34 -89L37 -90Z",
    "M-25 -90A25 2 0 0 1 25 -90A25 2 0 0 1 -25 -90Z",
    '<path class="h" d="M-9 -83l1 10l2 10l3 10l-2 10"/><path class="g" d="M14 -60c3-4 9-4 11 0c-2 3-8 4-11 0Z"/>',
  );
  // A fallen lid.
  a.open('transform="translate(318 318) rotate(-4)"');
  a.path("M-30 0A30 7 0 0 0 30 0V8A30 7 0 0 1 -30 8Z", "st f");
  a.ellipse(0, 0, 30, 7, "lp f");
  a.close();
  // Grass tufts.
  for (const [x, y] of [[60, 318], [196, 326], [420, 320], [292, 334]] as const) {
    a.path(`M${x} ${y}q-3-8-9-11q7 3 10 8q1-9 4-15q0 9-1 15q3-6 9-8q-5 4-7 11Z`, "g f");
  }
  return a;
}
