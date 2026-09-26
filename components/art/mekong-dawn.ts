import { lichen, num, seeded, specks, stoneJar, stoneLid, type JarGeometry, type JarSpec } from "./stone-jar";

/**
 * "Mekong dawn": the home hero's landscape. Back to front: the sun (a moon at
 * night), the far Thai bank, the Mekong in three bands, the laterite bank and
 * three stone jars with a fallen lid, as they stand on the Plain of Jars.
 *
 * The view box is 1600 x 760 and the scene is anchored bottom-right: on narrow
 * screens the left of it is cut off, never the jars. The river, the banks and
 * the ground run on far to the left of the view box, so wide screens never see
 * where they end. Shared by the hero (as JSX) and the Open Graph images.
 */

export const SCENE = { width: 1600, height: 760 } as const;

/** Where the far bank meets the water, and the bands of the river below it. */
export const HORIZON = 620;
export const RIVER = [620, 652, 684, 716] as const;
/** Top of the laterite bank the jars stand on. */
export const GROUND = 716;
/** How far the landscape runs past the left of the view box. */
const FAR_LEFT = -2600;

/** The share of the scene's height taken by water and ground, and the far bank above them. */
export const LAND_SHARE = (SCENE.height - 592) / SCENE.height;

export interface PlacedJar {
  readonly id: string;
  readonly spec: JarSpec;
  /** Foot centre in the scene. */
  readonly x: number;
  readonly y: number;
  /** Lean in degrees. */
  readonly lean: number;
  /** 1 (light stone) to 3 (dark). */
  readonly tone: 1 | 2 | 3;
  /** Lichen in the jar's own space: fine specks and a few larger spots. */
  readonly lichen?: { readonly fine: string; readonly coarse: string };
}

/** Back to front. The jars settle left to right. */
export const JARS: readonly PlacedJar[] = [
  {
    id: "b",
    spec: { w: 200, h: 180, foot: 0.78, belly: 0.46, neck: 0.8, lip: 0.88, lipH: 0.13, top: 0.08, skew: 0.05 },
    x: 1012,
    y: 738,
    lean: -4,
    tone: 1,
    lichen: {
      fine: lichen(7, -46, -48, 28, 10) + lichen(11, 28, -126, 15, 5),
      coarse: lichen(13, -50, -44, 16, 4) + lichen(17, 26, -124, 8, 2),
    },
  },
  {
    id: "c",
    spec: { w: 160, h: 198, foot: 0.8, belly: 0.5, neck: 0.78, lip: 0.88, lipH: 0.1, top: 0.08, skew: -0.04 },
    x: 1548,
    y: 744,
    lean: 5,
    tone: 3,
  },
  {
    id: "a",
    spec: { w: 240, h: 372, foot: 0.78, belly: 0.44, neck: 0.76, lip: 0.86, lipH: 0.075, top: 0.07, notch: 0.28, skew: 0.02 },
    x: 1216,
    y: 750,
    lean: 1.5,
    tone: 2,
  },
];

export const jarGeometry = (jar: PlacedJar): JarGeometry => stoneJar(jar.spec);

export const jarTransform = (jar: PlacedJar) => `translate(${num(jar.x)} ${num(jar.y)}) rotate(${num(jar.lean)})`;

/** A fallen lid in the gap between the big jar and the small one. */
export const LID = { x: 1396, y: 730, lean: -5, ...stoneLid(52, 9.5, 17) } as const;

export const SUN = { cx: 1398, cy: 596, r: 108 } as const;
export const MOON = { cx: 1418, cy: 452, r: 36 } as const;

/** A few stars for the night sky, kept to the right, away from the words: bright ones and faint ones. */
export const STARS = {
  bright: specks([
    [1296, 238],
    [1004, 176],
    [1540, 458],
  ]),
  faint: specks([
    [1148, 96],
    [1486, 132],
    [1570, 300],
    [1004, 420],
  ]),
};

/** Lights along the far bank at night. */
export const FAR_LIGHTS = specks([
  [180, 603],
  [410, 604],
  [636, 602],
  [862, 604],
  [1368, 603],
]);

/** The far Thai bank: a low line of trees. */
export const FAR_BANK = (() => {
  const crowns: string[] = [];
  // Soft bumps of tree crowns across the visible part of the bank.
  const tops = [598, 594, 600, 591, 597, 593, 599, 590, 596, 600, 592, 598, 595, 601, 593, 597];
  const step = SCENE.width / tops.length;
  tops.forEach((y, index) => {
    const x2 = (index + 1) * step;
    crowns.push(`Q${num(x2 - step / 2)} ${y - 7} ${num(x2)} ${tops[index + 1] ?? 600}`);
  });
  return `M${FAR_LEFT} ${HORIZON}V600H0${crowns.join("")}V${HORIZON}Z`;
})();

/** The river's three bands. */
export const RIVER_BANDS = RIVER.slice(0, 3).map(
  (top, index) => `M${FAR_LEFT} ${top}H${SCENE.width}V${RIVER[index + 1]}H${FAR_LEFT}Z`,
);

/** Glints on the water: short, loose ticks in each band of the river. */
export const GLINTS = (() => {
  const random = seeded(23);
  const ticks: string[] = [];
  for (let x = -1500; x < SCENE.width; x += 95 + random() * 110) {
    const band = Math.floor(random() * 3);
    const y = RIVER[band]! + 8 + random() * 16;
    ticks.push(`M${num(x)} ${num(y)}h${num(10 + random() * 34)}`);
  }
  return ticks.join("");
})();

/** The sun's (or moon's) reflection, narrowing towards the near bank. */
export const SUN_GLINTS = [628, 638, 649, 661, 674, 688, 703]
  .map((y, index) => {
    const length = 64 - index * 7;
    const shift = [0, 8, -6, 5, -3, 6, -2][index]!;
    return `M${num(SUN.cx - length / 2 + shift)} ${y}h${length}`;
  })
  .join("");

/** The laterite bank, rising a little under the jars. */
export const GROUND_PATH = `M${FAR_LEFT} ${GROUND + 2}H860C920 ${GROUND + 1} 960 ${GROUND - 7} 1040 ${GROUND - 8}S1400 ${GROUND - 10} ${SCENE.width} ${GROUND - 6}V${SCENE.height}H${FAR_LEFT}Z`;

/** Grass tufts along the bank and at the jars' feet. */
const tufts: readonly (readonly [number, number])[] = [
  [-260, 719],
  [520, 719],
  [884, 716],
  [1102, 744],
  [1330, 746],
  [1478, 748],
];
export const TUFTS = tufts
  // Three blades fanning up from one root.
  .map(([x, y]) => `M${x} ${y}q-3-5-8-7M${x} ${y}q-1-7 1-12M${x} ${y}q3-4 8-5`)
  .join("");
