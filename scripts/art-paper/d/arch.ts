import { Art } from "../lib";

/** Patuxai, Vientiane's victory gate, at dusk between two palms. */
export default function arch(): Art {
  const a = new Art("arch", [0, 0, 480, 360], [480, 360]);
  a.fullFibre = true;

  // Back plane: sky and dusk; the moon and stars by Evening.
  a.rect(0, 0, 480, 300, "sky");
  a.poly([[-2, 120], [482, 116], [482, 300], [-2, 300]], "dusk2");
  a.poly([[-2, 170], [482, 174], [482, 300], [-2, 300]], "dusk");
  a.open('class="ev"');
  a.halo(404, 70, 13, 7);
  a.circle(404, 70, 13, "lp f");
  for (const [x, y] of [[60, 50], [120, 90], [350, 36], [440, 120], [30, 130]] as const) a.circle(x, y, 1.5, "y");
  a.close();

  // Paper clouds.
  a.cloud(40, 110, 58);
  a.cloud(392, 168, 40);
  // Middle plane: two palms.
  const palm = (x: number, top: number, dir: 1 | -1) => {
    a.path(`M${x - 6 * dir} 300Q${x - 4 * dir} ${(300 + top) / 2} ${x} ${top}`, "l");
    const leaves = [
      `M${x} ${top}Q${x - 22} ${top - 12} ${x - 40} ${top + 2}Q${x - 22} ${top - 6} ${x} ${top + 2}Z`,
      `M${x} ${top}Q${x - 16} ${top - 26} ${x - 34} ${top - 26}Q${x - 14} ${top - 18} ${x} ${top + 2}Z`,
      `M${x} ${top}Q${x + 2} ${top - 28} ${x + 18} ${top - 36}Q${x + 8} ${top - 20} ${x + 2} ${top + 2}Z`,
      `M${x} ${top}Q${x + 22} ${top - 20} ${x + 40} ${top - 14}Q${x + 20} ${top - 12} ${x + 2} ${top + 2}Z`,
      `M${x} ${top}Q${x + 26} ${top - 2} ${x + 36} ${top + 14}Q${x + 22} ${top + 2} ${x + 2} ${top + 4}Z`,
    ];
    a.path(leaves.join(""), "g f");
  };
  palm(60, 214, 1);
  palm(424, 206, -1);

  // The gate: spires, tiers, and the body with its arches.
  a.path("M228 66 240 24 252 66Z", "s f");
  a.path("M232 54H248M235 42H245", "h");
  a.rect(220, 64, 40, 16, "s f");
  a.path("M160 82 170 56 180 82ZM300 82 310 56 320 82Z", "s f");
  a.circle(240, 21, 3, "y f");
  a.circle(170, 53, 2.5, "y f");
  a.circle(310, 53, 2.5, "y f");
  a.rect(150, 80, 180, 16, "s f");
  a.path("M150 88H330", "h");
  a.rect(136, 96, 208, 32, "s f", { edge: "es" });
  a.path("M136 104H344M136 122H344", "h");
  a.path("M158 110H170V122H158ZM186 110H198V122H186ZM214 110H226V122H214ZM254 110H266V122H254ZM282 110H294V122H282ZM310 110H322V122H310Z", "w");
  a.rect(128, 128, 224, 172, "s f", { edge: "es" });
  a.rect(120, 128, 240, 8, "s f");
  // By Evening, two floodlights wash the gate from below.
  a.add('<clipPath id="w"><path d="M128 128H352V300H128Z"/></clipPath>');
  a.open('class="ev" clip-path="url(#w)"');
  a.halo(176, 300, 34, 22);
  a.halo(304, 300, 34, 22);
  a.close();
  // Through the great arch: the dusk beyond, and the sun setting in it by Day.
  a.path("M206 300V214Q206 176 240 168Q274 176 274 214V300Z", "dusk f");
  a.open('class="dn"');
  a.halo(240, 300, 20, 6);
  a.path("M220 300A20 20 0 0 1 260 300Z", "sun f");
  a.close();
  a.open('class="ev"');
  a.halo(240, 300, 22, 7);
  a.close();
  a.path("M196 300V212Q196 168 240 158Q284 168 284 212V300", "h");
  a.path("M146 300V236Q146 220 160 214Q174 220 174 236V300ZM306 300V236Q306 220 320 214Q334 220 334 236V300Z", "dusk f");
  a.path("M150 156H170V186H150ZM310 156H330V186H310Z", "w f");
  a.rect(234, 142, 12, 12, "a f");

  // Front plane: the square before the gate.
  a.rect(-4, 300, 488, 64, "s f", { edge: "es" });
  a.path("M206 300 176 360M274 300 304 360M128 300 60 360M352 300 420 360", "h");
  a.ellipse(240, 336, 34, 6, "p f");
  return a;
}
