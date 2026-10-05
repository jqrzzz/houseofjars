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
import { breakfast, policies, times } from "@/content/stay";
import { joinList, lowerFirst } from "@/content/text";
import { box, centred } from "./geometry";
import type { Area, Box3, Facing, Fixture, FixtureType, Floor, FloorId, HouseModel, Mount, Rect, Route, RoutePoint, Wall } from "./types";

const W = 4.0; // interior width
const D = 16.0; // interior depth
const T = 0.15; // outer walls
const SLAB = 0.2;

/**
 * The stairs: one U-shaped stair, the same on every floor (ground floor photos gf-04, gf-05, gf-12,
 * gf-14, gf-15; Floor 1 photos f2-01 to f2-03). The first flight climbs from the corridor toward the left wall
 * along the back strip, turns on a landing against the left wall, and the second climbs back along the
 * front strip: you arrive on the floor above facing the right wall (the shoe cubbies on Floor 1).
 */
const STAIR = { x1: 2.6, landing: 0.85, front: 8.75, mid: 9.55, back: 10.35 } as const;
/** The stairwell on the upper floors: the opening in the slab over the stairs from the floor below. */
const STAIRWELL = { x0: 0, x1: STAIR.x1, y0: 8.7, y1: STAIR.back } as const;

export const floors: readonly Floor[] = [
  { id: "ground", name: "Ground floor", level: 0, z: 0, ceiling: 3.6 },
  { id: "floor1", name: "Floor 1", level: 1, z: 3.8, ceiling: 6.7, opening: STAIRWELL },
  {
    id: "floor2",
    name: "Floor 2",
    level: 2,
    z: 6.9,
    ceiling: 9.8,
    opening: STAIRWELL,
    confirmed: false,
    note: "Not photographed yet: copied from Floor 1 on the owner's word.",
  },
];

const FLOOR2_NOTE = 'Floor 2 has not been photographed: copied from Floor 1 on the owner\'s word ("the same layout").';
const POD_NOTE =
  'The numbers, the stacks and which pod is on top are from the owner\'s bed register, as drawn: the number written on top is the top bunk (the owner: "the top bunk is 1 and beneath it 2"; down the left, 09 over 08).';
const LOCKER_NOTE =
  "One locker for each pod, with the pod's number (the owner's bed register). The stack beside the door holds the three highest numbers (f2-04); where the other stacks stand, and which numbers each holds, is assumed.";
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
  {
    id: "cafe",
    walkId: "a-cafe",
    floor: "ground",
    kind: "shared",
    name: "Café",
    rect: { x0: 0, x1: W, y0: 0, y1: 7.65 },
    // Behind the counter, in front of the stairs; and by the corridor, where the last table and its back chair stand.
    more: [
      { x0: 0, x1: 3.0, y0: 7.65, y1: 8.6 },
      { x0: 3.0, x1: W, y0: 7.65, y1: 9.2 },
    ],
    anchor: { x: 2.4, y: 2.6 },
  },
  {
    id: "entrance",
    walkId: "a-entrance",
    floor: "ground",
    kind: "path",
    name: "Entrance",
    rect: { x0: 0, x1: 1.45, y0: 0, y1: 1.4 },
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
    note: "The café counter is the front desk (the owner confirmed); guests' luggage waits beside it, in front of the store under the stairs.",
  },
  {
    id: "stairs-ground",
    walkId: "a-stairs1",
    floor: "ground",
    kind: "path",
    name: "Stairs",
    // To x 3.0: the two lowest steps stand out into the corridor.
    rect: { x0: 0, x1: 3.0, y0: 8.6, y1: STAIR.back + 0.1 },
    anchor: { x: 1.9, y: 9.95, z: 1.4 },
    // At the foot, where shoes come off, clear of the arrow up the first flight.
    planAnchor: { x: 2.7, y: 9.95 },
    note: "Teak panelling on the café side, the stairs' foot on the corridor. Shoes come off here: no shoes above the ground floor.",
  },
  {
    id: "store-stairs",
    walkId: "a-store-stairs",
    floor: "ground",
    kind: "staff",
    name: "Store",
    rect: { x0: 0.05, x1: STAIR.x1, y0: 8.6, y1: STAIR.back },
    parent: "stairs-ground",
    anchor: { x: 2.05, y: 8.62, z: 1.1 },
    planAnchor: { x: 1.6, y: 9.15 },
    note: "Under the stairs, behind a small Staff Only door and a pair of doors from the café: bottled water, drinks crates, a fan (gf-13, gf-14).",
  },
  {
    id: "corridor",
    walkId: "a-corridor",
    floor: "ground",
    kind: "path",
    name: "Corridor",
    rect: { x0: 3.0, x1: W, y0: 9.2, y1: 13.2 },
    // Behind the stairs it reaches left to the toilet's wall: the tall cupboard, the toilet's door, the second basin.
    more: [{ x0: 2.05, x1: 3.0, y0: STAIR.back + 0.1, y1: 13.2 }],
    anchor: { x: 3.35, y: 12.2 },
    // Clear of the extinguishers against the right wall.
    planAnchor: { x: 3.3, y: 12.6 },
    note: "A narrow way along the right wall from the café to the Staff Only door at its end: the free water, then the clay jars and the extinguishers against the right wall (gf-04, gf-09, gf-11, gf-12).",
  },
  {
    id: "water",
    walkId: "a-water",
    floor: "ground",
    kind: "shared",
    name: "Water",
    rect: { x0: 3.5, x1: W, y0: STAIR.mid, y1: 11.25 },
    parent: "corridor",
    anchor: { x: 3.78, y: 10.62, z: 1.5 },
  },
  {
    id: "toilet-ground",
    walkId: "a-toilet1",
    floor: "ground",
    kind: "wash",
    name: "Toilet",
    rect: { x0: 0, x1: 1.95, y0: STAIR.back + 0.1, y1: 13.2 },
    anchor: { x: 1.0, y: 11.2 },
    planAnchor: { x: 1.0, y: 12.7 },
    note: "Behind the stairs, on the left: one toilet for everyone. Pass the stairs and turn left through its door, and the toilet faces you, centred on the far wall, with a small sink on its right (the owner; f1-10, gf-10). A second basin in the corridor is for washing hands while the toilet is busy.",
  },
  {
    id: "staff-kitchen",
    walkId: "a-storage",
    floor: "ground",
    kind: "staff",
    name: "Staff room",
    rect: { x0: 0, x1: W, y0: 13.3, y1: D },
    anchor: { x: 3.1, y: 14.6 },
    note: "One room with the team's kitchen, no wall between (the owner), through the Staff Only door at the end of the corridor (gf-07): the staff lockers, the electrical panel, a water tank, a shrine, and a teak lattice door at the back that stays shut.",
  },
  {
    id: "kitchen",
    // One room with the staff room, so one card on the walk.
    walkId: "a-storage",
    floor: "ground",
    kind: "staff",
    name: "Kitchen",
    rect: { x0: 0, x1: 1.95, y0: 13.3, y1: D },
    parent: "staff-kitchen",
    anchor: { x: 1.0, y: 14.7 },
    note: "The team's kitchen, the left side of the staff room (gf-08): a fridge, steel shelving, a counter with a double sink along the left wall and another along the back wall.",
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
      note: "Fourteen pods in seven stacks of two: three stacks down each side of the aisle, and one lying across just inside the door, on the right as you come in (the owner; f2-04, f2-05).",
      ...unconfirmed,
    },
    {
      id: `landing-${level}`,
      walkId: `a-stairs${level + 1}`,
      floor,
      kind: "path",
      name: "Landing",
      rect: { x0: 0, x1: W, y0: 8.6, y1: 12.6 },
      anchor: { x: 3.1, y: 11.7 },
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
    { from: 0.3, to: 1.35, z1: 2.4 },
    { from: 1.45, to: 3.75, z1: 3.0 },
  ]),
  {
    id: "stair-front",
    floor: "ground",
    kind: "partition",
    box: box(0, STAIR.x1, 8.65, STAIR.front, 0, 3.6),
    material: "wood",
    panelled: true,
    note: "Teak panelling across the stairs' café side; the store's two doors are in it (gf-14, gf-15).",
  },
  {
    id: "stair-side",
    floor: "ground",
    kind: "partition",
    box: box(STAIR.x1, STAIR.x1 + 0.1, 8.65, STAIR.mid, 0, 3.6),
    material: "wood",
    panelled: true,
    note: "Teak panelling on the corridor, beside the stairs' foot (gf-12, gf-14).",
  },
  {
    id: "stair-back",
    floor: "ground",
    kind: "partition",
    box: box(0, STAIR.x1, STAIR.back, STAIR.back + 0.1, 0, 3.6),
    material: "plaster",
    note: "Plain plaster on the stairs' side (gf-05); the toilet beyond.",
  },
  {
    id: "toilet-wall",
    floor: "ground",
    kind: "partition",
    box: box(1.95, 2.05, STAIR.back + 0.1, 13.2, 0, 3.6),
    // The toilet's door, straight across from the toilet (the owner).
    openings: [{ from: 11.45, to: 12.15, z1: 2.05 }],
    material: "plaster",
  },
  {
    // The corridor ends at the Staff Only door, against the right wall (the owner; gf-09, gf-11).
    id: "back-partition",
    floor: "ground",
    kind: "partition",
    box: box(0, W, 13.2, 13.3, 0, 3.6),
    openings: [{ from: 3.1, to: 3.9, z1: 2.05 }],
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
  // The stairwell: a low parapet behind it, and on Floor 2 (the top) one beside the first flight's hole too.
  const stair: Wall[] = [
    { id: `${floor}-stair-parapet`, floor, kind: "parapet", box: box(0, STAIR.x1, STAIR.back, STAIR.back + 0.1, 0, 1.0), material: "dormPlaster", ...unconfirmed },
    ...(level === 2
      ? [{ id: `${floor}-stair-side`, floor, kind: "parapet" as const, box: box(STAIR.x1, STAIR.x1 + 0.1, STAIR.mid, STAIR.back, 0, 1.0), material: "dormPlaster" as const, ...unconfirmed }]
      : []),
  ];
  return [
    ...outerWalls(floor, 2.9, windows).map((wall) => ({ ...wall, ...unconfirmed })),
    {
      id: `${floor}-dorm-partition`,
      floor,
      kind: "partition",
      box: box(0, W, 8.6, 8.7, 0, 2.9),
      // Straight ahead at the end of the passage beside the stairs (f2-03).
      openings: [{ from: 2.75, to: 3.55, z1: 2.1 }],
      material: "dormPlaster",
      ...unconfirmed,
    },
    ...stair,
    {
      id: `${floor}-bath-partition`,
      floor,
      kind: "partition",
      box: box(0, W, 12.6, 12.7, 0, 2.9),
      // Straight ahead up the passage (f2-02).
      openings: [{ from: 2.6, to: 3.45, z1: 2.1 }],
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
  facade("door-front", "door", "entrance", box(0.3, 1.35, -0.12, -0.04, 0, 2.4), { grid: { cols: 2, rows: 6 } }),
  facade("window-front", "window", "cafe", box(1.45, 3.75, -0.15, 0, 0, 3.0), {
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
  { id: "bench-terrace", type: "bench", area: "terrace", box: box(1.45, 3.75, -0.55, -0.2, 0, 0.45) },
  ...many("table-small-round", "table-terrace", "terrace", [centred(2.0, -1.1, 0.6, 0.6, 0.6), centred(2.9, -1.1, 0.6, 0.6, 0.6)]),
  {
    id: "jar-butts",
    type: "jar-clay",
    area: "terrace",
    box: centred(3.55, -2.4, 0.22, 0.22, 0.35),
    confirmed: false,
    note: "A small jar for cigarette butts, a few steps out from the café's front: smoking is not allowed on the terrace itself (the owner). Where exactly it stands is assumed: by the awning's right post.",
  },
  { id: "plant-terrace", type: "plant", area: "terrace", box: centred(0.38, -2.18, 0.35, 0.35, 0.8), note: "At the foot of the awning's left post (f1-01)." },

  // The café.
  { id: "doormat", type: "doormat", area: "entrance", box: centred(0.82, 0.5, 0.8, 0.5, 0.01), flat: true },
  // The ledge runs under the window up to the big jar in the front-right corner.
  { id: "window-ledge", type: "window-ledge", area: "cafe", box: box(1.45, 3.35, 0, 0.35, 0, 1.0) },
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
  {
    id: "plant-cafe",
    type: "plant",
    area: "cafe",
    box: centred(3.72, 1.06, 0.22, 0.22, 0.9, 0.45),
    mountedOn: "bench-seat",
    note: "On the front end of the bench seat, beside the big jar (f1-03).",
  },
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
  // The espresso machine and grinder stand on the counter's back end, by the reception sign (gf-01).
  { id: "coffee-machine", type: "coffee-machine", area: "desk", box: box(1.1, 1.5, 6.95, 7.4, 1.05, 1.45), mountedOn: "counter", faces: "-x" },
  { id: "shelves", type: "shelves", area: "desk", box: box(0, 0.3, 4.4, 7.6, 1.3, 2.8), faces: "+x", grid: { cols: 8, rows: 4 } },
  ...many("stool-bar", "stool-bar", "cafe", [centred(1.95, 5.0, 0.35, 0.35, 0.75), centred(1.95, 5.8, 0.35, 0.35, 0.75), centred(1.95, 6.6, 0.35, 0.35, 0.75)]),
  // Behind the counter's back end, against the stairs' teak front (gf-14, gf-15).
  { id: "fridge-drinks", type: "fridge-drinks", area: "cafe", box: box(0.05, 0.7, 7.95, 8.6, 0, 1.9), faces: "+x" },
  {
    id: "printer",
    type: "printer",
    area: "cafe",
    box: box(0.72, 1.0, 8.25, 8.6, 0, 0.95),
    faces: "-y",
    note: "The front desk's printer (a-desk), on a low cabinet beside the drinks fridge (gf-15).",
  },
  // Pendant lamps over the front tables, the counter and the tables along the right wall (f1-03, gf-02, gf-03).
  ...many(
    "pendant-lamp",
    "pendant",
    "cafe",
    [
      [0.85, 1.9],
      [0.85, 3.4],
      [1.35, 4.9],
      [1.35, 6.0],
      [1.35, 7.1],
      [3.35, 5.6],
      [3.35, 7.0],
    ].map(([x, y]) => centred(x!, y!, 0.34, 0.34, 1.25, 2.35)),
    { confirmed: false, note: "Seen in photos f1-03, gf-02 and gf-03; how many there are and where they hang is approximate." },
  ),
  ...many("ceiling-light", "downlight-cafe", "cafe", [centred(2.2, 1.6, 0.12, 0.12, 0.04, 3.54), centred(2.6, 1.6, 0.12, 0.12, 0.04, 3.54), centred(1.05, 7.75, 0.14, 0.14, 0.04, 3.54)], {
    confirmed: false,
    note: "Small downlights in the café's ceiling (gf-02, gf-03); how many there are is approximate.",
  }),
  { id: "track-front", type: "track-light", area: "cafe", box: box(1.9, 2.8, 0.75, 0.8, 3.2, 3.6), note: "A track with two spots over the front window (gf-02)." },
  { id: "track-shelves", type: "track-light", area: "desk", box: box(0.5, 0.55, 4.9, 5.9, 3.2, 3.6), note: "A track with two spots over the shelves (gf-03)." },
  ...many(
    "picture-frame",
    "frame",
    "cafe",
    [box(3.97, W, 1.6, 2.0, 1.55, 2.05), box(3.97, W, 2.25, 2.65, 1.55, 2.05), box(3.97, W, 4.3, 5.0, 1.3, 2.1), box(3.97, W, 6.1, 6.8, 1.3, 2.1), box(3.97, W, 7.9, 8.6, 1.25, 2.05)],
    {
      mount: "right-wall",
      faces: "-x",
      confirmed: false,
      note: "Framed black-and-white photographs along the right wall (gf-02, gf-03, gf-15); about five, the count is approximate.",
    },
  ),
  {
    id: "dehumidifier",
    type: "dehumidifier",
    area: "cafe",
    box: centred(0.95, 4.25, 0.35, 0.25, 0.6),
    note: "Nudged 10 cm from the walk's spot (0.9, 4.15) so it clears the chair at the second table.",
  },
  {
    id: "luggage-space",
    type: "luggage-space",
    area: "cafe",
    box: box(1.3, 2.3, 8.05, 8.6, 0, 0.01),
    flat: true,
    note: "Guests' luggage waits beside the front desk, in front of the store's doors (gf-14, gf-15).",
  },

  // The stairs (see STAIR): the first flight from the corridor, the landing, the second flight up to Floor 1.
  {
    id: "stairs-up",
    type: "stairs",
    area: "stairs-ground",
    box: box(STAIR.landing, 3.0, STAIR.mid, STAIR.back, 0, 1.9),
    faces: "-x",
    climb: { from: 0, to: 1.9 },
    variant: "solid",
    note: "Terracotta steps from the corridor (the two lowest stand out into it) toward the left wall: a curved plaster handrail on the café side, plain plaster on the other (gf-05, gf-12).",
  },
  {
    id: "stairs-landing",
    type: "stairs",
    area: "stairs-ground",
    box: box(0.05, STAIR.landing, STAIR.front, STAIR.back, 0, 1.9),
    climb: { from: 1.9, to: 1.9 },
    variant: "landing solid",
    note: "The landing against the left wall, where the stairs turn (gf-05).",
  },
  {
    id: "stairs-up-2",
    type: "stairs",
    area: "stairs-ground",
    box: box(STAIR.landing, STAIR.x1, STAIR.front, STAIR.mid, 1.6, 3.6),
    faces: "+x",
    climb: { from: 1.9, to: 3.8 },
    variant: "flight",
    note: "Back toward the corridor, up to Floor 1, where you arrive facing the shoe cubbies (f2-01). Its underside is the teak slope seen from the café (gf-14).",
  },
  {
    id: "jar-clay-stairs",
    type: "jar-clay",
    area: "stairs-ground",
    box: centred(0.3, 8.98, 0.25, 0.25, 0.7, 1.9),
    mountedOn: "stairs-landing",
    confirmed: false,
    note: "The walk lists one clay jar on the stairs' landing; where it stands is not known.",
  },
  { id: "wall-lamp-stairs-1", type: "wall-lamp", area: "stairs-ground", box: box(0, 0.12, 9.05, 9.25, 2.4, 2.7), faces: "+x", note: "Over the landing, on the left wall (gf-05)." },
  { id: "wall-lamp-stairs-2", type: "wall-lamp", area: "stairs-ground", box: box(1.3, 1.5, STAIR.back - 0.12, STAIR.back, 2.2, 2.5), faces: "-y", note: "Over the first flight, on the wall behind it (gf-05, gf-12)." },
  // The store under the stairs, behind its two doors in the teak front.
  { id: "door-store", type: "door-panel", area: "store-stairs", box: box(1.05, 1.55, 8.6, 8.65, 0, 1.75), label: "Staff Only", note: "The small door, under the landing (gf-14)." },
  { id: "doors-store", type: "door-panel", area: "store-stairs", box: box(1.6, 2.5, 8.6, 8.65, 0, 2.05), variant: "double", note: "The pair of doors under the second flight (gf-14)." },

  // The corridor, along the right wall.
  {
    id: "cupboard-corridor",
    type: "cupboard",
    area: "corridor",
    box: box(2.1, STAIR.x1, STAIR.back + 0.12, 11.15, 0, 2.4),
    faces: "+x",
    grid: { cols: 1, rows: 2 },
    note: "A tall teak cupboard, upper and lower doors, between the stairs and the toilet (f1-11, gf-06). It holds towels and other supplies.",
  },
  { id: "water-dispenser", type: "water-dispenser", area: "water", box: centred(3.78, 10.62, 0.35, 0.35, 1.45), faces: "-x", note: '"Free Water", with a cupboard of glasses below and a woven basket on top (gf-12).' },
  ...many("stool-low", "stool-water", "water", [centred(3.78, 9.78, 0.3, 0.3, 0.6), centred(3.78, 10.12, 0.3, 0.3, 0.6)]),
  { id: "bin-water", type: "bin", area: "water", box: centred(3.8, 11.0, 0.22, 0.22, 0.5) },
  // Against the right wall, past the water and before the Staff Only door: the clay jars, then the extinguishers (f1-11, gf-09, gf-11).
  ...many("jar-clay", "jar-clay", "corridor", [centred(3.86, 11.4, 0.25, 0.25, 0.7), centred(3.86, 11.72, 0.25, 0.25, 0.7)]),
  ...many("extinguisher", "extinguisher", "corridor", [centred(3.9, 12.05, 0.15, 0.15, 0.55), centred(3.9, 12.25, 0.15, 0.15, 0.55)]),
  ...many("ceiling-light", "downlight-corridor", "corridor", [centred(3.3, 9.85, 0.16, 0.16, 0.04, 3.54), centred(3.3, 12.6, 0.16, 0.16, 0.04, 3.54)], {
    note: "In the corridor's ceiling (gf-04, gf-12).",
  }),

  // The toilet, behind the stairs on the left: through its door, the toilet faces you (the owner).
  { id: "toilet-ground", type: "toilet", area: "toilet-ground", box: box(0.1, 0.75, 11.6, 12.0, 0, 0.8), faces: "+x", note: "Centred on the far wall, facing the door (the owner; f1-10, gf-10)." },
  { id: "sink-toilet", type: "sink-small", area: "toilet-ground", box: box(0.05, 0.35, 12.25, 12.65, 0.72, 0.94), note: "A small sink on the toilet's right (f1-10, gf-10)." },
  {
    id: "door-toilet",
    type: "door-leaf",
    area: "toilet-ground",
    box: box(1.25, 1.95, 11.45, 11.5, 0, 2.05),
    variant: "dark hinge-x1",
    label: "Toilet",
    note: "A dark wooden door with the men and women signs, opening in (f1-10).",
  },
  // The second basin, at the end of the corridor beside the Staff Only door (gf-09, gf-10, gf-11).
  {
    id: "basin-corridor",
    type: "basin",
    area: "corridor",
    box: box(2.2, 2.65, 12.8, 13.2, 0.7, 1.85),
    faces: "-y",
    variant: "wall",
    note: "Under an arched mirror, left of the Staff Only door: for washing hands while the toilet is busy (the owner).",
  },
  { id: "hand-dryer-ground", type: "hand-dryer", area: "corridor", box: box(2.75, 2.98, 13.0, 13.2, 1.05, 1.4), faces: "-y" },

  // The staff room, through the Staff Only door (gf-07).
  { id: "door-staff", type: "door-leaf", area: "staff-kitchen", box: box(3.1, 3.15, 13.3, 14.1, 0, 2.05), variant: "dark", label: "Staff Only", note: "Against the right wall (the owner); opens in, to the left (gf-07)." },
  { id: "staff-lockers", type: "staff-lockers", area: "staff-kitchen", box: box(3.5, W, 14.2, 15.55, 0, 2.2), faces: "-x", note: "Tall teak lockers along the right wall (gf-07); how many doors is not known." },
  { id: "fuse-box", type: "fuse-box", area: "staff-kitchen", box: box(3.9, W, 13.35, 13.8, 1.45, 1.85), mount: "right-wall", faces: "-x", note: "The electrical panel, on the right wall just inside the door (gf-07)." },
  { id: "water-tank", type: "water-tank", area: "staff-kitchen", box: centred(2.85, 15.45, 0.6, 0.6, 1.3), note: "A plastic water tank with its pump, in front of the lattice door (gf-07)." },
  { id: "shrine", type: "shrine", area: "staff-kitchen", box: box(2.08, 2.48, 15.2, 15.8, 0, 1.15), note: "A small shrine with marigold offerings, left of the lattice door (gf-07)." },
  { id: "lattice-door", type: "lattice-door", area: "staff-kitchen", box: box(2.35, 3.15, 15.94, D, 0, 2.1), faces: "-y", note: "A teak lattice door in the back wall (gf-07). It is blocked and stays shut: not a way out (the owner)." },
  { id: "tube-light-staff", type: "ceiling-light", area: "staff-kitchen", box: box(2.5, 3.5, 14.5, 14.58, 3.5, 3.55), variant: "tube" },

  // The kitchen (gf-08): walking in, the shelving and the fridge on the left, the sink ahead, the cooking counter on the right.
  { id: "rack-kitchen", type: "rack", area: "kitchen", box: box(0.95, 1.9, 13.33, 13.8, 0, 1.8), note: "Steel shelving with the oven and supplies." },
  { id: "fridge-kitchen", type: "fridge", area: "kitchen", box: box(0.3, 0.9, 13.33, 13.95, 0, 1.75) },
  { id: "kitchen-counter", type: "kitchen-counter", area: "kitchen", box: box(0, 0.6, 14.05, 15.4, 0, 0.9), faces: "+x", note: "Dark wooden cabinets under a black granite top." },
  { id: "sink-kitchen", type: "sink", area: "kitchen", box: box(0.08, 0.52, 14.45, 15.05, 0.86, 0.95), mountedOn: "kitchen-counter", note: "A double sink." },
  { id: "kitchen-counter-back", type: "kitchen-counter", area: "kitchen", box: box(0, 1.7, 15.4, D, 0, 0.9), faces: "-y", note: "With the hot plate." },
  { id: "cupboard-kitchen", type: "cupboard", area: "kitchen", box: box(0, 0.35, 14.25, 15.3, 1.55, 2.2), faces: "+x", variant: "dark", note: "Wall cupboards over the sink." },
  { id: "fan-exhaust-kitchen", type: "fan-exhaust", area: "kitchen", box: box(1.1, 1.4, 15.9, D, 2.2, 2.5), faces: "-y" },
  ...many("stool-low", "stool-kitchen", "kitchen", [centred(1.15, 14.6, 0.3, 0.3, 0.6), centred(1.25, 15.05, 0.3, 0.3, 0.6)]),
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
    // Seen from the street (f1-01), so confirmed although the rest of Floor 2 is not.
    const seen = { variant: "upper", note: "Seen from the street (f1-01): two small windows inside the arch." };
    list.push(
      facade(`window-${letter}-low`, "window", dorm, box(1.75, 2.25, -0.12, -0.04, 0.5, 1.0), seen),
      facade(`window-${letter}-high`, "window", dorm, box(1.75, 2.25, -0.12, -0.04, 1.5, 2.0), seen),
    );
  }
  list.push({ id: `ac-${letter}`, type: "ac-indoor", area: dorm, box: box(1.55, 2.45, 0.02, 0.27, 2.3, 2.6), faces: "+y", mount: "facade-inside" });

  // Pods: seven stacks of two (upper and lower), numbered as on the owner's bed register. From the door they run
  // up the right-hand side to the front window and back down the left, and the last stack lies across the end of
  // the aisle, just inside the door. The numbers skip 4, 13 and 14 (see the house's customs). Each pair is
  // [upper, lower], as the register draws it.
  const num = (n: number) => `${L}${String(n).padStart(2, "0")}`;
  const pods: readonly { side: "right" | "left" | "across"; b: Rect; numbers: readonly [number, number] }[] = [
    { side: "right", b: { x0: 2.75, x1: W, y0: 5.1, y1: 7.15 }, numbers: [1, 2] },
    { side: "right", b: { x0: 2.75, x1: W, y0: 3.0, y1: 5.05 }, numbers: [3, 5] },
    { side: "right", b: { x0: 2.75, x1: W, y0: 0.4, y1: 2.45 }, numbers: [6, 7] },
    { side: "left", b: { x0: 0, x1: 1.25, y0: 0.3, y1: 2.35 }, numbers: [9, 8] },
    { side: "left", b: { x0: 0, x1: 1.25, y0: 2.9, y1: 4.95 }, numbers: [11, 10] },
    { side: "left", b: { x0: 0, x1: 1.25, y0: 5.5, y1: 7.55 }, numbers: [15, 12] },
    { side: "across", b: { x0: 0, x1: 2.05, y0: 7.6, y1: 8.6 }, numbers: [17, 16] },
  ];
  pods.forEach(({ side, b, numbers }, k) => {
    const faces: Facing = side === "left" ? "+x" : side === "right" ? "-x" : "-y";
    const [upper, lower] = numbers.map(num) as [string, string];
    // A fixed few upper curtains on the aisle side the camera sees are drawn half open, to show the bed.
    const open = side === "left" && numbers[1] !== 10;
    const look = side === "across" ? "" : `${side} `;
    list.push(
      { id: `pod-${lower}`, type: "pod", area: dorm, box: box(b.x0, b.x1, b.y0, b.y1, 0, 1.15), label: lower, variant: `${look}lower`, faces, note: POD_NOTE },
      { id: `pod-${upper}`, type: "pod", area: dorm, box: box(b.x0, b.x1, b.y0, b.y1, 1.15, 2.4), label: upper, variant: `${look}upper${open ? " open" : ""}`, faces, note: POD_NOTE },
      {
        id: `ladder-${letter}-${k + 1}`,
        type: "ladder",
        area: dorm,
        box:
          side === "left"
            ? box(1.25, 1.33, b.y0 + 0.08, b.y0 + 0.48, 0, 2.4)
            : side === "right"
              ? box(2.67, 2.75, b.y0 + 0.08, b.y0 + 0.48, 0, 2.4)
              : box(b.x1 - 0.48, b.x1 - 0.08, b.y0 - 0.08, b.y0, 0, 2.4),
        faces,
      },
    );
  });

  // Lockers: teak stacks, a round number plate on each door, one locker for each pod with its number.
  const lockerStacks: readonly { b: Rect; faces: Facing; numbers: readonly number[] }[] = [
    { b: { x0: 2.75, x1: W, y0: 7.2, y1: 7.65 }, faces: "-x", numbers: [1, 2, 3] },
    { b: { x0: 2.75, x1: W, y0: 2.5, y1: 2.95 }, faces: "-x", numbers: [5, 6, 7] },
    { b: { x0: 0, x1: 1.25, y0: 2.4, y1: 2.85 }, faces: "+x", numbers: [8, 9, 10] },
    { b: { x0: 0, x1: 1.25, y0: 5.0, y1: 5.45 }, faces: "+x", numbers: [11, 12] },
    // Beside the door, next to the stack lying across (f2-04).
    { b: { x0: 2.1, x1: 2.7, y0: 8.15, y1: 8.6 }, faces: "-y", numbers: [15, 16, 17] },
  ];
  for (const { b, faces, numbers } of lockerStacks) {
    numbers.forEach((n, k) => {
      const label = num(n);
      list.push({ id: `locker-${label}`, type: "locker", area: dorm, box: box(b.x0, b.x1, b.y0, b.y1, k * 0.8, (k + 1) * 0.8), label, faces, confirmed: false, note: LOCKER_NOTE });
    });
  }

  list.push(
    ...many("fan-ceiling", `fan-${letter}`, dorm, [centred(2.0, 1.5, 0.5, 0.5, 0.3, 2.6), centred(2.0, 4.0, 0.5, 0.5, 0.3, 2.6), centred(2.0, 6.5, 0.5, 0.5, 0.3, 2.6)]),
    // Above the stack lying across.
    { id: `fan-exhaust-${letter}`, type: "fan-exhaust", area: dorm, box: box(0.45, 0.75, 8.5, 8.6, 2.5, 2.8), faces: "-y" },
    {
      id: `door-${dorm}`,
      type: "door-leaf",
      area: dorm,
      box: box(3.5, 3.55, 7.8, 8.6, 0, 2.05),
      label: L,
      variant: "wood hinge-x1 hinge-y1",
      note: `A wooden door with a small orange ${L} sign, drawn open into the dorm.`,
    },
  );

  // The landing: the stairwell, the shoe cubbies (Floor 1 only), a wall lamp. You arrive up the stairs facing the cubbies,
  // and the passage beside the stairwell leads to the dorm at the front and the bathroom at the back (f2-01 to f2-03).
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
      // The same U-shaped stair to Floor 2 (see STAIR), its first flight beside the bathroom door (f2-02).
      {
        id: "stairs-floor2",
        type: "stairs",
        area: landing,
        box: box(STAIR.landing, STAIR.x1, STAIR.mid, STAIR.back, 0, 1.55),
        faces: "-x",
        climb: { from: 0, to: 1.55 },
        variant: "flight",
        note: "Up from the passage toward the left wall (f2-02).",
      },
      {
        id: "stairs-floor2-landing",
        type: "stairs",
        area: landing,
        box: box(0.05, STAIR.landing, STAIR.front, STAIR.back, 1.35, 1.55),
        climb: { from: 1.55, to: 1.55 },
        variant: "landing",
        confirmed: false,
        note: "Assumed the same as the ground floor's: a landing against the left wall.",
      },
      {
        id: "stairs-floor2-up",
        type: "stairs",
        area: landing,
        box: box(STAIR.landing, STAIR.x1, STAIR.front, STAIR.mid, 1.25, 2.9),
        faces: "+x",
        climb: { from: 1.55, to: 3.1 },
        variant: "flight",
        confirmed: false,
        note: "Assumed the same as the ground floor's: back toward the passage, up to Floor 2.",
      },
    );
  }
  list.push({ id: `wall-lamp-${level}`, type: "wall-lamp", area: landing, box: box(0, 0.12, 9.05, 9.25, 2.1, 2.4), faces: "+x" });

  // The bathroom. Walking in and facing the back: the vanity on the right wall, showers on the left, toilets at the back.
  list.push(
    {
      id: `door-${bath}`,
      type: "door-leaf",
      area: bath,
      box: box(2.6, 2.65, 12.7, 13.55, 0, 2.05),
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
      // The stall nearest the camera (on the right) is drawn cut open low, so one toilet shows in the 3D views.
      { id: stall, type: "toilet-stall", area: bath, box: box(i * 0.9, (i + 1) * 0.9, 14.75, D, 0, 2.2), faces: "-y", variant: i === 2 ? "cut" : undefined },
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
    fixtures: on(floor, list).map((f) => (level === 2 && f.type !== "window" ? { ...f, ...extra, note: f.note ? `${FLOOR2_NOTE} ${f.note}` : FLOOR2_NOTE } : f)),
  };
}

const floor1 = dormFloor(1, "h", "women");
const floor2 = dormFloor(2, "j", "men");

// ---------------------------------------------------------------------------
// Routes (a guest's path, one segment per floor)

// ---------------------------------------------------------------------------
// Walks through the house: how a guest or the team moves from place to place, step by step, with the rules met
// on the way. Each is a path for the pictures (one segment per floor; on stairs a point carries its height) and
// a list of steps for guides, the team and Shadow.

/** Up the U-shaped stair from the ground floor to Floor 1, from the foot in the corridor to the top. */
const UP_TO_FLOOR1: readonly RoutePoint[] = [
  [3.25, 9.95],
  [3.0, 9.95, 0],
  [0.85, 9.95, 1.9],
  [0.45, 9.95, 1.9],
  [0.45, 9.15, 1.9],
  [0.85, 9.15, 1.9],
  [2.6, 9.15, 3.8],
];
/** The same, down: from the top on Floor 1 to the foot in the corridor. */
const DOWN_FROM_FLOOR1: readonly RoutePoint[] = [...UP_TO_FLOOR1].reverse();
/** Up the same stair from Floor 1 to Floor 2 (a storey of 3.1 m). */
const UP_TO_FLOOR2: readonly RoutePoint[] = [
  [2.9, 9.95],
  [2.6, 9.95, 0],
  [0.85, 9.95, 1.55],
  [0.45, 9.95, 1.55],
  [0.45, 9.15, 1.55],
  [0.85, 9.15, 1.55],
  [2.6, 9.15, 3.1],
];
/** From the top of the stairs on Floor 1, past the shoe cubbies, through the dorm door to the aisle. */
const LANDING_TO_DORM: readonly RoutePoint[] = [
  [2.6, 9.15],
  [3.1, 9.3],
  [3.3, 10.2],
  [3.1, 9.0],
  [3.15, 8.65],
  [3.15, 8.0],
  [2.4, 7.85],
  [2.2, 6.6],
];
/** From pod H01's ladder back out of the dorm, past the shoe cubbies, to the top of the stairs. */
const DORM_TO_STAIRS: readonly RoutePoint[] = [
  [2.45, 5.4],
  [2.2, 6.6],
  [2.4, 7.85],
  [3.15, 8.0],
  [3.15, 8.65],
  [3.1, 9.0],
  [3.3, 10.2],
  [3.1, 9.3],
  [2.6, 9.15],
];
/** From the counter through the café and out of the glass door onto the terrace. */
const CAFE_TO_TERRACE: readonly RoutePoint[] = [
  [2.35, 4.6],
  [1.5, 1.35],
  [0.85, 0.9],
  [0.85, -0.1],
  [1.2, -1.6],
];

const deposit = `the ${policies.deposit.value.amount} deposit for ${policies.deposit.value.covers}`;
const shoesOff = { label: "Shoes off", area: "stairs-ground", rules: ["no-shoes-upstairs", "registered-guests-upstairs"] } as const;

const routes: readonly Route[] = [
  {
    id: "arrival",
    name: "Arriving: from the terrace to pod H01",
    who: "guest",
    when: `Check-in, ${times.checkIn.value} to ${times.checkInUntil.value}`,
    segments: [
      {
        floor: "ground",
        points: [[2.3, -1.9], [1.2, -1.6], [0.85, -0.1], [0.85, 0.9], [1.5, 1.35], [2.35, 4.6], [2.35, 5.8], [2.35, 7.3], [2.85, 8.45], [3.25, 9.2], ...UP_TO_FLOOR1],
      },
      { floor: "floor1", points: [...LANDING_TO_DORM, [2.45, 5.4]] },
    ],
    stops: [
      {
        floor: "ground",
        at: [0.85, 0.3],
        label: "Front door",
        area: "entrance",
        does: `In through the glass door on the left of the shopfront. From ${times.frontDoorLocked.value.from} to ${times.frontDoorLocked.value.until} it is locked: knock, and the night staff opens it.`,
        rules: ["front-door-locked", "no-outside-food"],
      },
      {
        floor: "ground",
        at: [2.35, 5.8],
        label: "Check in",
        area: "desk",
        does: `Check in at the café counter, which is also the front desk: show your passport and pay ${deposit}. Luggage can wait beside the desk.`,
        rules: ["check-in-hours", "passport", "deposit"],
      },
      { floor: "ground", at: [3.25, 9.6], ...shoesOff, does: "Take your shoes off at the foot of the stairs and carry them up." },
      { floor: "floor1", at: [3.3, 10.2], label: "Shoes", area: "landing-1", does: "Leave your shoes in the cubbies on the Floor 1 landing.", rules: ["no-shoes-upstairs"] },
      {
        floor: "floor1",
        at: [2.45, 5.4],
        label: "Pod H01",
        area: "dorm-h",
        does: "Find your pod by its number (H01 is a top bunk, up its ladder) and the locker with the same number. Keep your voice down: someone is always asleep.",
        rules: ["quiet", "eat-in-the-cafe"],
      },
    ],
  },
  {
    id: "breakfast",
    name: "Breakfast: from Dorm H down to the café",
    who: "guest",
    when: breakfast.hours.value.replace("–", " to "),
    segments: [
      { floor: "floor1", points: [[2.0, 3.0], [2.0, 6.8], [2.4, 7.85], [3.15, 8.0], [3.15, 8.65], [3.1, 9.0], [3.3, 10.2], [3.1, 9.3], [2.6, 9.15]] },
      { floor: "ground", points: [...DOWN_FROM_FLOOR1, [3.25, 9.2], [2.85, 8.45], [2.35, 7.3], [2.35, 6.2]] },
    ],
    stops: [
      { floor: "floor1", at: [3.3, 10.2], label: "Shoes", area: "landing-1", does: "Take your shoes from the cubby and carry them down.", rules: ["no-shoes-upstairs"] },
      { floor: "ground", at: [3.25, 9.6], ...shoesOff, label: "Shoes on", does: "Put them on at the foot of the stairs." },
      {
        floor: "ground",
        at: [2.35, 6.2],
        label: "Breakfast",
        area: "cafe",
        does: `Breakfast is included, served at the counter from ${breakfast.hours.value.replace("–", " to ")}: ${joinList(breakfast.items.value.map(lowerFirst))}. Eat it at a table in the café.`,
        rules: ["eat-in-the-cafe"],
      },
    ],
  },
  {
    id: "leaving-early",
    name: "Leaving early: pack downstairs, check out",
    who: "guest",
    when: `Before 08:00 (check-out is open until ${times.checkOut.value})`,
    segments: [
      { floor: "floor1", points: DORM_TO_STAIRS },
      { floor: "ground", points: [...DOWN_FROM_FLOOR1, [3.25, 9.2], [2.85, 8.45], [1.8, 7.75], [2.35, 6.4], [2.35, 5.8], ...CAFE_TO_TERRACE] },
    ],
    stops: [
      { floor: "floor1", at: [3.3, 10.2], label: "Shoes", area: "landing-1", does: "Take your shoes and your bag; pack nothing in the dorm.", rules: ["pack-downstairs"] },
      { floor: "ground", at: [1.8, 7.75], label: "Pack here", area: "cafe", does: "Pack on the ground floor, beside the luggage space by the front desk, so the dorm can sleep on.", rules: ["pack-downstairs"] },
      {
        floor: "ground",
        at: [2.35, 5.8],
        label: "Check out",
        area: "desk",
        does: `Check out at the front desk and get ${deposit} back. Leaving before 08:00? Tell the team beforehand, so they can return your deposit.`,
        rules: ["check-out-hours", "leaving-before-eight", "deposit"],
      },
      { floor: "ground", at: [0.85, 0.3], label: "Front door", area: "entrance", does: "Out through the glass door. While it is locked, the night staff opens it.", rules: ["front-door-locked"] },
    ],
  },
  {
    id: "smoke",
    name: "Going out for a smoke",
    who: "guest",
    segments: [{ floor: "ground", points: [...CAFE_TO_TERRACE, [2.4, -2.0], [3.3, -2.35]] }],
    stops: [
      { floor: "ground", at: [1.2, -1.6], label: "Not here", area: "terrace", does: "No smoking on the terrace or at the café's front: the smoke drifts straight inside.", rules: ["no-smoking", "smoke-past-the-terrace"] },
      { floor: "ground", at: [3.3, -2.35], label: "Smoke here", area: "terrace", does: "A few steps further out, by the small jar for cigarette butts.", rules: ["smoke-past-the-terrace"] },
    ],
  },
  {
    id: "water",
    name: "From the counter to the free water",
    who: "guest",
    segments: [{ floor: "ground", points: [[2.3, 6.4], [2.35, 7.3], [2.85, 8.45], [3.25, 9.2], [3.3, 10.45]] }],
    stops: [{ floor: "ground", at: [3.3, 10.45], label: "Free water", area: "water", does: "Free drinking water at the dispenser, at the start of the corridor, with glasses in the cupboard below." }],
  },
  {
    id: "bathroom-women",
    name: "From Dorm H to the women's bathroom",
    who: "guest",
    segments: [{ floor: "floor1", points: [[3.15, 8.7], [3.1, 11.6], [3.0, 12.7], [3.1, 13.6]] }],
    stops: [
      { floor: "floor1", at: [3.1, 13.6], label: "Women's bathroom", area: "bath-women", does: "The women's bathroom is on Floor 1, past the stairs; the men's is the same place on Floor 2." },
    ],
  },
  {
    id: "housekeeping-round",
    name: "Housekeeping round: from the café up through every floor",
    who: "staff",
    when: "About every hour",
    segments: [
      { floor: "ground", points: [[2.35, 6.2], [2.35, 7.3], [2.85, 8.45], [3.25, 9.2], [3.2, 11.0], [2.5, 11.8], [3.2, 11.0], ...UP_TO_FLOOR1] },
      {
        floor: "floor1",
        points: [[2.6, 9.15], [3.1, 9.3], [3.3, 10.2], [3.1, 11.6], [3.0, 12.7], [3.1, 13.6], [3.0, 12.7], [3.1, 11.6], [3.15, 8.65], [3.15, 8.0], [2.4, 7.85], [2.0, 6.8], [2.0, 3.0], [2.0, 6.8], [2.4, 7.85], [3.15, 8.0], [3.15, 8.65], ...UP_TO_FLOOR2],
      },
      { floor: "floor2", points: [[2.6, 9.15], [3.1, 9.3], [3.15, 10.4], [3.1, 11.6], [3.0, 12.7], [3.1, 13.6], [3.0, 12.7], [3.1, 11.6], [3.15, 8.65], [3.15, 8.0], [2.4, 7.85], [2.0, 6.8], [2.0, 3.0]] },
    ],
    stops: [
      { floor: "ground", at: [2.35, 6.2], label: "Café", area: "cafe", does: "Look over the tables, the counter and the floor; clean what needs it, then take a photo to compare with the standard." },
      { floor: "ground", at: [2.5, 11.8], label: "Toilet", area: "toilet-ground", does: "The toilet, its sink and the corridor basin: clean, refill, photo." },
      { floor: "floor1", at: [3.3, 10.2], label: "Landing", area: "landing-1", does: "Tidy the shoe cubbies and sweep the landing.", rules: ["no-shoes-upstairs"] },
      { floor: "floor1", at: [3.1, 13.6], label: "Bathroom", area: "bath-women", does: "Toilets, showers, basins and floor: clean, refill, photo." },
      { floor: "floor1", at: [2.0, 3.0], label: "Dorm H", area: "dorm-h", does: "Quietly: the aisle, the floor and the bins; pods made up fresh after check-out.", rules: ["quiet"] },
      { floor: "floor2", at: [3.1, 13.6], label: "Bathroom", area: "bath-men", does: "Toilets, showers, basins and floor: clean, refill, photo." },
      { floor: "floor2", at: [2.0, 3.0], label: "Dorm J", area: "dorm-j", does: "Quietly: the aisle, the floor and the bins; pods made up fresh after check-out.", rules: ["quiet"] },
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
  roof: { z0: 9.8, z1: 10.0 },
  routes,
  terrace: { x0: -0.2, x1: 4.2, y0: -2.6, y1: -0.15 },
  customs: [
    'The pods and lockers skip the numbers 4, 13 and 14. In Chinese, 4 sounds like "death" and 14 like "will die" (4 is unlucky in Japanese and Korean too), and 13 is unlucky for many Western guests. So no guest is given an unlucky bed, and nobody at the desk has to think about it at check-in.',
  ],
  walkAreaIds: [
    "a-front",
    "a-entrance",
    "a-cafe",
    "a-desk",
    "a-stairs1",
    "a-store-stairs",
    "a-corridor",
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
