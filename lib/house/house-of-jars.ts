/**
 * House of Jars, Vientiane: a pod hostel in a narrow, deep shophouse, as the
 * owner walked it on 5 October 2026. Counts are exact (from the walk);
 * positions and sizes are approximate (no tape measure), but the arrangement
 * is true: what is next to what, which side, which floor. Anything assumed
 * rather than seen carries confirmed: false and a note.
 *
 * When something in the house changes, change it here: every picture in
 * public/house/ is drawn from this file (npm run house:render). See
 * docs/HOUSE_MODEL.md.
 */
import { box, centred } from "./geometry";
import type { Area, Box3, Fixture, FixtureType, Floor, FloorId, HouseModel, Mount, Route, Wall } from "./types";

const W = 4.0; // interior width
const D = 16.0; // interior depth
const T = 0.15; // outer walls
const SLAB = 0.2;

export const floors: readonly Floor[] = [
  { id: "ground", name: "Ground floor", level: 0, z: 0, ceiling: 3.6 },
  { id: "floor1", name: "Floor 1", level: 1, z: 3.8, ceiling: 6.7 },
  { id: "floor2", name: "Floor 2", level: 2, z: 6.9, ceiling: 9.8 },
];

/** The roof slab, over Floor 2. */
export const ROOF = { z0: 9.8, z1: 10.0 } as const;

const FLOOR2_NOTE = 'Floor 2 has not been photographed: copied from Floor 1 on the owner\'s word ("the same layout").';
const POD_ORDER_NOTE = "The order of the numbers on the pods' plates is not confirmed.";

// ---------------------------------------------------------------------------
// Areas

const groundAreas: Area[] = [
  {
    id: "terrace",
    walkId: "a-front",
    floor: "ground",
    kind: "outside",
    name: "Terrace",
    rect: { x0: -0.2, x1: 4.2, y0: -2.6, y1: -0.15 },
    anchor: { x: 2.5, y: -1.6 },
  },
  { id: "cafe", walkId: "a-cafe", floor: "ground", kind: "shared", name: "Café", rect: { x0: 0, x1: W, y0: 0, y1: 11.0 }, anchor: { x: 2.6, y: 2.6 } },
  {
    id: "entrance",
    walkId: "a-entrance",
    floor: "ground",
    kind: "path",
    name: "Entrance",
    rect: { x0: 0, x1: 1.15, y0: 0, y1: 1.4 },
    parent: "cafe",
  },
  {
    id: "desk",
    walkId: "a-desk",
    floor: "ground",
    kind: "staff",
    name: "Front desk",
    rect: { x0: 0, x1: 1.65, y0: 4.4, y1: 7.6 },
    parent: "cafe",
    note: "The café counter is the front desk (the owner confirmed); guests' luggage waits beside it.",
  },
  {
    id: "stairs-ground",
    walkId: "a-stairs1",
    floor: "ground",
    kind: "path",
    name: "Stairs",
    rect: { x0: 0, x1: 1.3, y0: 8.6, y1: 12.6 },
    note: "Inside a wood-panelled enclosure. Shoes come off here: no shoes above the ground floor.",
  },
  { id: "water", walkId: "a-water", floor: "ground", kind: "shared", name: "Water", rect: { x0: 2.5, x1: W, y0: 10.3, y1: 11.0 }, parent: "cafe" },
  {
    id: "toilet-ground",
    walkId: "a-toilet1",
    floor: "ground",
    kind: "wash",
    name: "Toilet",
    rect: { x0: 1.3, x1: W, y0: 11.0, y1: 13.2 },
    note: "One toilet for everyone, a hand-wash basin and dryer outside it, 2 fire extinguishers.",
  },
  {
    id: "staff-kitchen",
    walkId: "a-storage",
    floor: "ground",
    kind: "staff",
    name: "Staff and kitchen",
    rect: { x0: 0, x1: W, y0: 13.2, y1: D },
    confirmed: false,
    note: "The staff area and kitchen (the owner's word); not photographed inside.",
  },
];

function dormAreas(floor: FloorId, level: 1 | 2, letter: "h" | "j", bath: "women" | "men"): Area[] {
  const unconfirmed = level === 2 ? { confirmed: false, note: FLOOR2_NOTE } : {};
  return [
    {
      id: `dorm-${letter}`,
      walkId: `a-dorm-${letter}`,
      floor,
      kind: "sleep",
      name: `Dorm ${letter.toUpperCase()}`,
      rect: { x0: 0, x1: W, y0: 0, y1: 8.6 },
      anchor: { x: 2.0, y: 4.3 },
      ...unconfirmed,
    },
    {
      id: `landing-${level}`,
      walkId: `a-stairs${level + 1}`,
      floor,
      kind: "path",
      name: "Landing",
      rect: { x0: 0, x1: W, y0: 8.6, y1: 12.6 },
      anchor: { x: 2.4, y: 10.6 },
      ...unconfirmed,
    },
    {
      id: `bath-${bath}`,
      walkId: bath === "women" ? "a-womens" : "a-mens",
      floor,
      kind: "wash",
      name: bath === "women" ? "Women's bathroom" : "Men's bathroom",
      rect: { x0: 0, x1: W, y0: 12.6, y1: D },
      anchor: { x: 2.0, y: 14.0 },
      ...unconfirmed,
    },
  ];
}

// ---------------------------------------------------------------------------
// Walls (z relative to the floor; outer walls rise to the ceiling)

function outerWalls(floor: FloorId, height: number, openings: Wall["openings"]): Wall[] {
  return [
    { id: `${floor}-facade`, floor, kind: "facade", box: box(-T, W + T, -T, 0, 0, height), openings, material: "facade" },
    { id: `${floor}-left`, floor, kind: "party", box: box(-T, 0, 0, D, 0, height), material: floor === "ground" ? "plaster" : "dormPlaster" },
    { id: `${floor}-right`, floor, kind: "party", box: box(W, W + T, 0, D, 0, height), material: floor === "ground" ? "plaster" : "dormPlaster" },
    { id: `${floor}-back`, floor, kind: "back", box: box(-T, W + T, D, D + T, 0, height), material: floor === "ground" ? "plaster" : "dormPlaster" },
  ];
}

const groundWalls: Wall[] = [
  ...outerWalls("ground", 3.6, [
    { from: 0.15, to: 1.05, z1: 2.4 },
    { from: 1.2, to: 3.2, z1: 3.0 },
  ]),
  {
    id: "stair-front",
    floor: "ground",
    kind: "enclosure",
    box: box(0, 1.35, 8.6, 8.7, 0, 3.6),
    material: "wood",
    panelled: true,
  },
  {
    id: "stair-side",
    floor: "ground",
    kind: "enclosure",
    box: box(1.25, 1.35, 8.7, 12.6, 0, 3.6),
    openings: [{ from: 8.7, to: 9.6, z1: 2.2 }],
    material: "wood",
    panelled: true,
    confirmed: false,
    note: "Where the stairs open to the café is assumed (beside the counter's back end).",
  },
  { id: "stair-back", floor: "ground", kind: "enclosure", box: box(0, 1.25, 12.5, 12.6, 0, 3.6), material: "wood", panelled: true },
  {
    id: "water-partition",
    floor: "ground",
    kind: "partition",
    box: box(1.35, W, 11.0, 11.1, 0, 3.6),
    openings: [{ from: 1.35, to: 2.3, z1: 2.4 }],
    material: "plaster",
  },
  {
    id: "toilet-room",
    floor: "ground",
    kind: "partition",
    box: box(2.4, 2.5, 11.1, 13.2, 0, 3.6),
    openings: [{ from: 11.9, to: 12.7, z1: 2.1 }],
    material: "plaster",
    confirmed: false,
    note: "The toilet's door is assumed to open off the corridor.",
  },
  {
    id: "kitchen-wall",
    floor: "ground",
    kind: "partition",
    box: box(0, W, 13.2, 13.3, 0, 3.6),
    openings: [{ from: 1.4, to: 2.3, z1: 2.1 }],
    material: "plaster",
  },
];

function dormWalls(floor: FloorId, level: 1 | 2): Wall[] {
  const unconfirmed = level === 2 ? { confirmed: false, note: FLOOR2_NOTE } : {};
  const windows =
    level === 1
      ? [
          { from: 1.75, to: 2.25, z0: 1.0, z1: 2.4 },
          { from: 1.75, to: 2.25, z0: 0.2, z1: 0.7 },
        ]
      : [
          { from: 1.75, to: 2.25, z0: 0.5, z1: 1.0 },
          { from: 1.75, to: 2.25, z0: 1.5, z1: 2.0 },
        ];
  // The stairwell (x 0-1.3): Floor 1's guests arrive at its back end and the next flight rises to the front;
  // Floor 2's guests arrive at its front end. A wall beside the rising flight, a low parapet elsewhere.
  const stair: Wall[] =
    level === 1
      ? [
          { id: `${floor}-stair-wall`, floor, kind: "partition", box: box(1.25, 1.35, 8.7, 11.2, 0, 2.9), material: "dormPlaster" },
          { id: `${floor}-stair-parapet`, floor, kind: "parapet", box: box(1.25, 1.35, 11.2, 11.9, 0, 1.0), material: "dormPlaster" },
        ]
      : [
          { id: `${floor}-stair-wall`, floor, kind: "partition", box: box(1.25, 1.35, 9.6, 11.2, 0, 2.9), material: "dormPlaster", ...unconfirmed },
          { id: `${floor}-stair-parapet`, floor, kind: "parapet", box: box(1.25, 1.35, 11.2, 12.6, 0, 1.0), material: "dormPlaster", ...unconfirmed },
        ];
  return [
    ...outerWalls(floor, 2.9, windows).map((wall) => ({ ...wall, ...unconfirmed })),
    {
      id: `${floor}-dorm-partition`,
      floor,
      kind: "partition",
      box: box(0, W, 8.6, 8.7, 0, 2.9),
      openings: [{ from: 1.55, to: 2.45, z1: 2.1 }],
      material: "dormPlaster",
      ...unconfirmed,
    },
    ...stair,
    {
      id: `${floor}-bath-partition`,
      floor,
      kind: "partition",
      box: box(0, W, 12.6, 12.7, 0, 2.9),
      openings: [{ from: 1.5, to: 2.4, z1: 2.1 }],
      material: "bathTile",
      ...unconfirmed,
    },
  ];
}

// ---------------------------------------------------------------------------
// Fixtures

type FixtureInput = Omit<Fixture, "floor"> & { readonly floor?: FloorId };

function on(floor: FloorId, list: readonly FixtureInput[], extra: Partial<Fixture> = {}): Fixture[] {
  return list.map((f) => ({ ...f, floor, ...extra }));
}

function many(type: FixtureType, prefix: string, area: string, boxes: readonly Box3[], more: Partial<Fixture> = {}): FixtureInput[] {
  return boxes.map((b, i) => ({ id: `${prefix}-${i + 1}`, type, area, box: b, ...more }));
}

const facade = (id: string, type: FixtureType, area: string, b: Box3, more: Partial<Fixture> = {}): FixtureInput => ({
  id,
  type,
  area,
  box: b,
  mount: "facade" as Mount,
  ...more,
});

/** Low tables, front left and along the right wall, each with a chair on either side along y. */
const LOW_TABLES: readonly (readonly [number, number])[] = [
  [0.65, 1.9],
  [0.65, 3.4],
  [3.55, 5.6],
  [3.55, 7.0],
  [3.55, 8.4],
];

const groundFixtures: Fixture[] = on("ground", [
  // The front: glass door on the left, the big grid window to its right.
  facade("door-front", "door", "entrance", box(0.15, 1.05, -0.12, -0.04, 0, 2.4), { grid: { cols: 2, rows: 6 } }),
  facade("window-front", "window", "cafe", box(1.2, 3.2, -0.15, 0, 0, 3.0), {
    grid: { cols: 4, rows: 3 },
    variant: "shopfront",
    note: "A 4 x 3 grid of copper-brown frames over a solid low panel (z 0-0.95), a bamboo blind rolled at the top.",
  }),
  // The terrace under the wooden awning.
  { id: "awning", type: "awning", area: "terrace", box: box(-0.2, 4.2, -2.6, -0.15, 2.95, 3.2) },
  { id: "post-left", type: "post", area: "terrace", box: centred(0.1, -2.45, 0.15, 0.15, 2.95), note: "The awning's left post." },
  { id: "post-right", type: "post", area: "terrace", box: centred(3.9, -2.45, 0.15, 0.15, 2.95), note: "The awning's right post." },
  {
    id: "sign-hostel",
    type: "sign-hostel",
    area: "terrace",
    box: box(0.2, 1.6, -2.6, -2.54, 3.2, 3.6),
    note: "White letters on orange in reality; drawn as a cream plate with an orange edge.",
  },
  { id: "sign-hanging", type: "sign-hanging", area: "terrace", box: box(2.9, 3.8, -0.62, -0.58, 2.3, 2.95), label: "House of Jars" },
  { id: "bench-terrace", type: "bench", area: "terrace", box: box(1.3, 3.3, -0.55, -0.2, 0, 0.45) },
  ...many("table-small-round", "table-terrace", "terrace", [centred(2.0, -1.1, 0.6, 0.6, 0.6), centred(2.9, -1.1, 0.6, 0.6, 0.6)]),
  { id: "plant-terrace", type: "plant", area: "terrace", box: centred(0.3, -0.5, 0.35, 0.35, 0.8) },

  // The café.
  { id: "doormat", type: "doormat", area: "entrance", box: centred(0.6, 0.5, 0.8, 0.5, 0.01), flat: true },
  { id: "window-ledge", type: "window-ledge", area: "cafe", box: box(1.2, 3.2, 0, 0.35, 0, 1.0) },
  ...many("stool-low", "stool-window", "cafe", [centred(1.9, 0.6, 0.35, 0.35, 0.65), centred(2.6, 0.6, 0.35, 0.35, 0.65)]),
  ...many(
    "table",
    "table",
    "cafe",
    LOW_TABLES.map(([x, y]) => centred(x, y, 0.75, 0.75, 0.75)),
  ),
  ...LOW_TABLES.flatMap(([x, y], i): FixtureInput[] => [
    { id: `chair-${2 * i + 1}`, type: "chair", area: "cafe", box: centred(x, y - 0.55, 0.4, 0.3, 0.9), faces: "+y" },
    { id: `chair-${2 * i + 2}`, type: "chair", area: "cafe", box: centred(x, y + 0.55, 0.4, 0.3, 0.9), faces: "-y" },
  ]),
  {
    id: "bench-seat",
    type: "bench-seat",
    area: "cafe",
    box: box(3.45, W, 0.9, 4.6, 0, 0.78),
    faces: "-x",
    note: "Built along the right wall: a cream base, an orange cushion, three grey pillows.",
  },
  ...many("table-tall-round", "table-tall", "cafe", [centred(3.0, 1.9, 0.6, 0.6, 1.05), centred(3.0, 3.4, 0.6, 0.6, 1.05)]),
  { id: "jar-big", type: "jar-big", area: "cafe", box: centred(3.7, 0.45, 0.6, 0.6, 0.85), note: "The house's signature clay jar." },
  { id: "plant-cafe", type: "plant", area: "cafe", box: centred(3.3, 0.3, 0.2, 0.2, 0.9) },
  ...many("ac-indoor", "ac-cafe", "cafe", [box(0, 0.25, 0.85, 1.75, 2.8, 3.1), box(0, 0.25, 5.55, 6.45, 2.8, 3.1)], { faces: "+x" }),
  {
    id: "counter",
    type: "counter",
    area: "desk",
    box: box(1.05, 1.65, 4.4, 7.6, 0, 1.05),
    note: "Free-standing, cream tiles: the café bar and the front desk.",
  },
  { id: "back-counter", type: "back-counter", area: "desk", box: box(0, 0.55, 4.4, 7.6, 0, 0.9), faces: "+x" },
  { id: "sink-bar", type: "sink", area: "desk", box: box(0.1, 0.46, 6.4, 6.8, 0.86, 0.95), mountedOn: "back-counter" },
  { id: "coffee-machine", type: "coffee-machine", area: "desk", box: box(0.06, 0.46, 5.0, 5.4, 0.9, 1.3), mountedOn: "back-counter", faces: "+x" },
  { id: "shelves", type: "shelves", area: "desk", box: box(0, 0.3, 4.4, 7.6, 1.3, 2.8), faces: "+x", grid: { cols: 8, rows: 4 } },
  ...many("stool-bar", "stool-bar", "cafe", [centred(1.95, 5.0, 0.35, 0.35, 0.75), centred(1.95, 5.8, 0.35, 0.35, 0.75), centred(1.95, 6.6, 0.35, 0.35, 0.75)]),
  { id: "fridge-drinks", type: "fridge-drinks", area: "cafe", box: box(0.2, 0.85, 7.8, 8.4, 0, 1.9), faces: "+x" },
  { id: "dehumidifier", type: "dehumidifier", area: "cafe", box: centred(0.9, 4.15, 0.35, 0.25, 0.6) },
  {
    id: "luggage-space",
    type: "luggage-space",
    area: "cafe",
    box: box(1.1, 1.65, 7.7, 8.5, 0, 0.01),
    flat: true,
    note: "Guests' luggage waits beside the front desk.",
  },
  {
    id: "stairs-up",
    type: "stairs",
    area: "stairs-ground",
    box: box(0.05, 1.25, 8.8, 12.4, 0, 3.6),
    variant: "solid",
    note: "A straight flight of terracotta-tiled steps, from y 8.8 up to Floor 1 at y 12.4.",
  },

  // The back of the café: free water, the passage to the toilet.
  { id: "water-dispenser", type: "water-dispenser", area: "water", box: centred(2.9, 10.75, 0.35, 0.35, 1.45), faces: "-y" },
  ...many("stool-low", "stool-water", "water", [centred(3.45, 10.75, 0.3, 0.3, 0.6), centred(3.85, 10.75, 0.3, 0.3, 0.6)]),
  { id: "bin-water", type: "bin", area: "water", box: centred(2.6, 10.8, 0.22, 0.22, 0.5) },
  { id: "toilet-ground", type: "toilet", area: "toilet-ground", box: centred(3.5, 12.6, 0.65, 0.4, 0.8), faces: "-x" },
  { id: "sink-toilet", type: "sink-small", area: "toilet-ground", box: centred(2.8, 11.5, 0.4, 0.28, 0.22, 0.72) },
  {
    id: "door-toilet",
    type: "door-leaf",
    area: "toilet-ground",
    box: box(2.5, 3.3, 11.9, 11.95, 0, 2.05),
    variant: "dark",
    label: "Toilet",
    confirmed: false,
    note: "Where the toilet's door is, is assumed.",
  },
  { id: "basin-corridor", type: "basin", area: "toilet-ground", box: box(1.35, 1.75, 11.78, 12.22, 0.7, 1.85), faces: "+x", variant: "wall" },
  { id: "hand-dryer-ground", type: "hand-dryer", area: "toilet-ground", box: box(1.35, 1.55, 12.3, 12.55, 1.05, 1.4), faces: "+x" },
  ...many("extinguisher", "extinguisher", "toilet-ground", [centred(1.45, 12.9, 0.15, 0.15, 0.55), centred(1.6, 12.9, 0.15, 0.15, 0.55)]),
  ...many("jar-clay", "jar-clay", "toilet-ground", [centred(1.9, 12.95, 0.25, 0.25, 0.7), centred(2.15, 12.95, 0.25, 0.25, 0.7)]),

  // The staff area and kitchen (not photographed inside).
  {
    id: "door-kitchen",
    type: "door-leaf",
    area: "staff-kitchen",
    box: box(1.4, 1.45, 13.3, 14.2, 0, 2.05),
    variant: "dark",
    confirmed: false,
    note: "Not photographed inside.",
  },
  {
    id: "staff-lockers",
    type: "staff-lockers",
    area: "staff-kitchen",
    box: box(0, 0.5, 13.6, 15.4, 0, 2.0),
    faces: "+x",
    confirmed: false,
    note: "Wooden lockers seen through the door; how many is unknown.",
  },
  {
    id: "kitchen-counter",
    type: "kitchen-counter",
    area: "staff-kitchen",
    box: box(0.8, 3.8, 15.4, D, 0, 0.9),
    faces: "-y",
    confirmed: false,
    note: "Assumed: the owner said the back room is the staff area and kitchen.",
  },
]);

/**
 * A dorm floor (Floor 1: Dorm H and the women's bathroom; Floor 2: Dorm J and
 * the men's bathroom). The owner says the two floors have the same layout.
 */
export function dormFloor(level: 1 | 2, letter: "h" | "j", bathroom: "women" | "men"): { areas: Area[]; walls: Wall[]; fixtures: Fixture[] } {
  const floor: FloorId = level === 1 ? "floor1" : "floor2";
  const L = letter.toUpperCase();
  const dorm = `dorm-${letter}`;
  const landing = `landing-${level}`;
  const bath = `bath-${bathroom}`;
  const list: FixtureInput[] = [];

  // The front windows, in the facade.
  if (level === 1) {
    list.push(
      facade(`window-${letter}-tall`, "window", dorm, box(1.75, 2.25, -0.12, -0.04, 1.0, 2.4), { variant: "upper" }),
      facade(`window-${letter}-small`, "window", dorm, box(1.75, 2.25, -0.12, -0.04, 0.2, 0.7), { variant: "upper" }),
      // The three outdoor AC units hang on the facade at Floor 1 level: two stacked on the left, one on the right.
      facade("ac-outdoor-1", "ac-outdoor", dorm, box(0.6, 1.4, -0.5, -0.2, 0.6, 1.2)),
      facade("ac-outdoor-2", "ac-outdoor", dorm, box(0.6, 1.4, -0.5, -0.2, 1.3, 1.9)),
      facade("ac-outdoor-3", "ac-outdoor", dorm, box(3.0, 3.8, -0.5, -0.2, 1.0, 1.6)),
    );
  } else {
    list.push(
      facade(`window-${letter}-low`, "window", dorm, box(1.75, 2.25, -0.12, -0.04, 0.5, 1.0), { variant: "upper" }),
      facade(`window-${letter}-high`, "window", dorm, box(1.75, 2.25, -0.12, -0.04, 1.5, 2.0), { variant: "upper" }),
    );
  }
  list.push({ id: `ac-${letter}`, type: "ac-indoor", area: dorm, box: box(1.55, 2.45, 0.02, 0.27, 2.3, 2.6), faces: "+y", mount: "facade-inside" });

  // Pods: columns of two (lower and upper), on both sides of one long aisle (x 1.25-2.75).
  const columns: readonly (readonly [number, number])[] = [
    [0.4, 2.45],
    [3.0, 5.05],
    [5.1, 7.15],
  ];
  const sides = [
    { side: "right", x0: 2.75, x1: W, first: 1 },
    { side: "left", x0: 0, x1: 1.25, first: 7 },
  ] as const;
  for (const { side, x0, x1, first } of sides) {
    columns.forEach(([y0, y1], c) => {
      const lower = `${L}${String(first + 2 * c).padStart(2, "0")}`;
      const upper = `${L}${String(first + 2 * c + 1).padStart(2, "0")}`;
      // A fixed few upper curtains on the aisle side the camera sees are drawn half open, to show the bed.
      const open = side === "left" && c !== 1;
      list.push(
        {
          id: `pod-${lower}`,
          type: "pod",
          area: dorm,
          box: box(x0, x1, y0, y1, 0, 1.15),
          label: lower,
          variant: `${side} lower`,
          faces: side === "left" ? "+x" : "-x",
          confirmed: false,
          note: POD_ORDER_NOTE,
        },
        {
          id: `pod-${upper}`,
          type: "pod",
          area: dorm,
          box: box(x0, x1, y0, y1, 1.15, 2.4),
          label: upper,
          variant: `${side} upper${open ? " open" : ""}`,
          faces: side === "left" ? "+x" : "-x",
          confirmed: false,
          note: POD_ORDER_NOTE,
        },
        {
          id: `ladder-${letter}-${side}-${c + 1}`,
          type: "ladder",
          area: dorm,
          box: side === "left" ? box(1.25, 1.33, y0 + 0.08, y0 + 0.48, 0, 2.4) : box(2.67, 2.75, y0 + 0.08, y0 + 0.48, 0, 2.4),
          faces: side === "left" ? "+x" : "-x",
        },
      );
    });
  }

  // Lockers: four stacks of three doors, teak, a round number plate on each.
  const stacks = [
    { x0: 2.75, x1: W, y0: 2.5, y1: 2.95, first: 1, faces: "-x" },
    { x0: 2.75, x1: W, y0: 7.2, y1: 7.65, first: 4, faces: "-x" },
    { x0: 0, x1: 1.25, y0: 2.5, y1: 2.95, first: 7, faces: "+x" },
    { x0: 0, x1: 1.25, y0: 7.2, y1: 7.65, first: 10, faces: "+x" },
  ] as const;
  for (const s of stacks) {
    for (let k = 0; k < 3; k++) {
      const label = `${L}${String(s.first + k).padStart(2, "0")}`;
      list.push({
        id: `locker-${label}`,
        type: "locker",
        area: dorm,
        box: box(s.x0, s.x1, s.y0, s.y1, k * 0.8, (k + 1) * 0.8),
        label,
        faces: s.faces,
        confirmed: false,
        note: "Which stack holds which numbers is not confirmed.",
      });
    }
  }

  list.push(
    ...many("fan-ceiling", `fan-${letter}`, dorm, [centred(2.0, 1.5, 0.5, 0.5, 0.3, 2.6), centred(2.0, 4.0, 0.5, 0.5, 0.3, 2.6), centred(2.0, 6.5, 0.5, 0.5, 0.3, 2.6)]),
    { id: `fan-exhaust-${letter}`, type: "fan-exhaust", area: dorm, box: box(3.45, 3.75, 8.5, 8.6, 2.05, 2.35), faces: "-y" },
    {
      id: `door-${dorm}`,
      type: "door-leaf",
      area: dorm,
      box: box(1.55, 1.6, 7.7, 8.6, 0, 2.05),
      label: L,
      variant: "wood",
      note: `A wooden door with a small orange ${L} sign, drawn open into the dorm.`,
    },
  );

  // The landing: the stairwell, the shoe cubbies (Floor 1 only), a wall lamp.
  if (level === 1) {
    list.push(
      {
        id: "shoe-cubbies",
        type: "shoe-cubbies",
        area: landing,
        box: box(3.6, W, 9.2, 11.4, 0, 2.1),
        faces: "-x",
        grid: { cols: 5, rows: 6 },
        note: "Built in: 5 across and 6 high. Guests carry their shoes up from the ground floor.",
      },
      {
        id: "stairs-floor2",
        type: "stairs",
        area: landing,
        box: box(0.05, 1.25, 8.8, 12.4, 0, 2.9),
        variant: "flight",
        confirmed: false,
        note: "The flight to Floor 2 rises back toward the front over the first one (approximate).",
      },
    );
  }
  list.push({ id: `wall-lamp-${level}`, type: "wall-lamp", area: landing, box: box(1.35, 1.47, 10.4, 10.6, 1.85, 2.15), faces: "+x" });

  // The bathroom. Walking in and facing the back: the vanity on the right wall, showers on the left, toilets at the back.
  list.push(
    {
      id: `door-${bath}`,
      type: "door-leaf",
      area: bath,
      box: box(1.5, 1.55, 12.7, 13.6, 0, 2.05),
      label: bathroom === "women" ? "Women" : "Men",
      variant: "wood",
    },
    { id: `vanity-${bathroom}`, type: "vanity", area: bath, box: box(3.45, W, 12.8, 14.4, 0, 0.85), faces: "-x" },
    ...many("basin", `basin-${bathroom}`, bath, [centred(3.72, 13.4, 0.4, 0.4, 0.15, 0.85), centred(3.72, 13.95, 0.4, 0.4, 0.15, 0.85)], {
      mountedOn: `vanity-${bathroom}`,
      variant: "vessel",
    }),
    ...many("mirror", `mirror-${bathroom}`, bath, [box(3.97, W, 13.2, 13.6, 1.15, 2.0), box(3.97, W, 13.75, 14.15, 1.15, 2.0)], {
      mount: "right-wall",
      faces: "-x",
      variant: "arched",
    }),
    { id: `hand-dryer-${bathroom}`, type: "hand-dryer", area: bath, box: box(3.75, W, 12.72, 12.98, 1.15, 1.5), mount: "right-wall", faces: "-x" },
    { id: `hair-dryer-${bathroom}`, type: "hair-dryer", area: bath, box: box(3.85, W, 13.0, 13.15, 1.0, 1.4), mount: "right-wall", faces: "-x" },
    {
      id: `sign-rules-${bathroom}`,
      type: "sign-plate",
      area: bath,
      box: box(3.98, W, 12.75, 13.15, 1.75, 2.15),
      mount: "right-wall",
      faces: "-x",
      label: "Bathroom rules",
    },
    {
      id: `ladder-hatch-${bathroom}`,
      type: "ladder-wall",
      area: bath,
      box: box(3.88, W, 14.45, 14.8, 0, 2.9),
      note: "Up to a hatch in the ceiling.",
    },
  );
  for (let i = 0; i < 3; i++) {
    const stall = `stall-${bathroom}-${i + 1}`;
    list.push(
      { id: stall, type: "toilet-stall", area: bath, box: box(i * 0.9, (i + 1) * 0.9, 14.75, D, 0, 2.2), faces: "-y" },
      { id: `toilet-${bathroom}-${i + 1}`, type: "toilet", area: bath, box: centred(i * 0.9 + 0.45, 15.55, 0.4, 0.65, 0.8), faces: "-y", mountedOn: stall },
    );
  }
  list.push(
    ...many("shower", `shower-${bathroom}`, bath, [box(0, 1.0, 12.8, 13.75, 0, 2.2), box(0, 1.0, 13.75, 14.7, 0, 2.2)], {
      faces: "+x",
      note: "Each shower has its own small hot-water heater on the wall.",
    }),
    { id: `fan-${bathroom}`, type: "fan", area: bath, box: centred(2.2, 13.3, 0.4, 0.4, 0.3, 2.6) },
  );

  const extra: Partial<Fixture> = level === 2 ? { confirmed: false, note: FLOOR2_NOTE } : {};
  return {
    areas: dormAreas(floor, level, letter, bathroom),
    walls: dormWalls(floor, level),
    fixtures: on(floor, list).map((f) => (level === 2 ? { ...f, ...extra, note: f.note ? `${FLOOR2_NOTE} ${f.note}` : FLOOR2_NOTE } : f)),
  };
}

const floor1 = dormFloor(1, "h", "women");
const floor2 = dormFloor(2, "j", "men");

// ---------------------------------------------------------------------------
// Routes (a guest's path, one segment per floor)

const routes: readonly Route[] = [
  {
    id: "arrival",
    name: "Arriving: from the terrace to pod H01",
    segments: [
      {
        floor: "ground",
        points: [
          [2.3, -1.9],
          [0.6, -0.1],
          [0.6, 1.2],
          [2.2, 5.8],
          [1.6, 8.9],
          [0.65, 9.05, 0.35],
          [0.65, 12.25, 3.55],
        ],
      },
      {
        floor: "floor1",
        points: [
          [0.65, 12.25],
          [1.75, 12.25],
          [2.0, 10.0],
          [3.3, 10.3],
          [2.0, 8.7],
          [2.0, 3.0],
          [2.5, 1.4],
        ],
      },
    ],
    stops: [
      { floor: "ground", at: [2.2, 5.8], label: "Check in" },
      { floor: "floor1", at: [3.3, 10.3], label: "Shoes" },
    ],
  },
  {
    id: "bathroom-women",
    name: "From Dorm H to the women's bathroom",
    segments: [
      {
        floor: "floor1",
        points: [
          [2.0, 8.7],
          [2.0, 11.6],
          [1.95, 12.7],
          [3.1, 13.6],
        ],
      },
    ],
  },
  {
    id: "water",
    name: "From the counter to the free water",
    segments: [
      {
        floor: "ground",
        points: [
          [2.2, 6.4],
          [2.6, 10.4],
        ],
      },
    ],
  },
];

export const houseOfJars: HouseModel = {
  name: "House of Jars",
  width: W,
  depth: D,
  wall: T,
  slab: SLAB,
  floors,
  areas: [...groundAreas, ...floor1.areas, ...floor2.areas],
  walls: [...groundWalls, ...floor1.walls, ...floor2.walls],
  fixtures: [...groundFixtures, ...floor1.fixtures, ...floor2.fixtures],
  routes,
  terrace: { x0: -0.2, x1: 4.2, y0: -2.6, y1: -0.15 },
  walkAreaIds: [
    "a-front",
    "a-entrance",
    "a-cafe",
    "a-desk",
    "a-stairs1",
    "a-water",
    "a-toilet1",
    "a-storage",
    "a-dorm-h",
    "a-stairs2",
    "a-womens",
    "a-dorm-j",
    "a-stairs3",
    "a-mens",
  ],
};
