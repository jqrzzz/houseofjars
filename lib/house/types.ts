/**
 * The House Model: one description of the real building that every picture
 * and animation is drawn from ("one skeleton, many outfits"). This file holds
 * the shapes of the data; lib/house/house-of-jars.ts holds the data itself.
 *
 * Units are metres. x runs across the house from the left party wall (as you
 * stand in the street facing the house) to the right one, y runs from the
 * front facade to the back wall (the terrace is at negative y), and z is the
 * height above the floor. See docs/HOUSE_MODEL.md.
 */

import type { MaterialName } from "./palette";

export type FloorId = "ground" | "floor1" | "floor2";

/** What an area is for. Plans tint areas by kind. */
export type AreaKind = "sleep" | "wash" | "shared" | "staff" | "path" | "outside";

/** The direction the front of a thing points. */
export type Facing = "+x" | "-x" | "+y" | "-y";

/** auto = day colours, with the Evening palette under prefers-color-scheme: dark. */
export type Theme = "auto" | "day" | "evening";

export interface Rect {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

/** An axis-aligned box. In the model, z is relative to the floor the thing stands on. */
export interface Box3 extends Rect {
  readonly z0: number;
  readonly z1: number;
}

/**
 * Whether a fact was seen on the owner's walk. Anything assumed rather than
 * seen carries confirmed: false and a note saying why.
 */
export interface Certainty {
  /** Omitted means confirmed. */
  readonly confirmed?: boolean;
  readonly note?: string;
}

/** A whole floor can be unconfirmed (Floor 2 has not been photographed); its note is shown on its plan. */
export interface Floor extends Certainty {
  readonly id: FloorId;
  /** The owner's name for the floor: Ground floor, Floor 1, Floor 2. */
  readonly name: string;
  /** 0 for the ground floor, 1, 2 upwards: the exploded views lift each floor by its level. */
  readonly level: number;
  /** Height of the finished floor above the street-level floor. */
  readonly z: number;
  /** Height of the ceiling above the street-level floor. */
  readonly ceiling: number;
  /** The opening in this floor's slab where the stairs come up from the floor below. */
  readonly opening?: Rect;
}

export interface Area extends Certainty {
  /** Stable id, used for SVG ids (area-{id}) and by animators. */
  readonly id: string;
  /** The id of the area in the owner's walk (a-cafe, a-dorm-h, ...). */
  readonly walkId: string;
  readonly floor: FloorId;
  readonly kind: AreaKind;
  readonly name: string;
  readonly rect: Rect;
  /** More rectangles of the same room, when it is not a plain rectangle (an L-shaped room). */
  readonly more?: readonly Rect[];
  /** A sub-area drawn on top of a bigger one (the counter inside the café). */
  readonly parent?: string;
  /** Where its label points, when the middle of the rectangle is a poor spot (z: on top of something, above the floor). */
  readonly anchor?: { readonly x: number; readonly y: number; readonly z?: number };
  /** Where its label sits on the plans, when that differs from the anchor (which points at things in 3D). */
  readonly planAnchor?: { readonly x: number; readonly y: number };
}

export type FixtureType =
  | "ac-indoor"
  | "ac-outdoor"
  | "awning"
  | "back-counter"
  | "basin"
  | "bench"
  | "bench-seat"
  | "bin"
  | "chair"
  | "ceiling-light"
  | "coffee-machine"
  | "cupboard"
  | "counter"
  | "dehumidifier"
  | "door"
  | "door-leaf"
  | "door-panel"
  | "doormat"
  | "extinguisher"
  | "fan"
  | "fan-ceiling"
  | "fan-exhaust"
  | "fridge-drinks"
  | "fridge"
  | "fuse-box"
  | "hair-dryer"
  | "hand-dryer"
  | "jar-big"
  | "jar-clay"
  | "kitchen-counter"
  | "lattice-door"
  | "ladder"
  | "ladder-wall"
  | "locker"
  | "luggage-space"
  | "mirror"
  | "pendant-lamp"
  | "picture-frame"
  | "plant"
  | "pod"
  | "post"
  | "printer"
  | "rack"
  | "shelves"
  | "shoe-cubbies"
  | "shower"
  | "shrine"
  | "sign-hanging"
  | "sign-hostel"
  | "sign-plate"
  | "sink"
  | "sink-small"
  | "staff-lockers"
  | "stairs"
  | "stool-bar"
  | "stool-low"
  | "table"
  | "table-small-round"
  | "table-tall-round"
  | "toilet"
  | "toilet-stall"
  | "track-light"
  | "vanity"
  | "wall-lamp"
  | "water-dispenser"
  | "water-tank"
  | "window"
  | "window-ledge";

/**
 * Where a thing hangs, when it hangs on a wall a view may take away:
 * - facade: on the outside of the front wall (outdoor AC units), or set in it (doors, windows);
 * - facade-inside: on the inside of the front wall (a dorm's AC unit over the window);
 * - right-wall: on the right party wall, which the cutaway removes (mirrors, dryers).
 */
export type Mount = "facade" | "facade-inside" | "right-wall";

export interface Fixture extends Certainty {
  /** Unique in the model; the SVG id is fx-{id} (fx-pod-H01). */
  readonly id: string;
  readonly type: FixtureType;
  readonly floor: FloorId;
  /** The area it belongs to (data-area in the SVG). */
  readonly area: string;
  /** Its bounding box; z is relative to its floor. */
  readonly box: Box3;
  /** A name or number that belongs to the thing: H01, J12, Women. */
  readonly label?: string;
  readonly faces?: Facing;
  readonly mount?: Mount;
  /**
   * The fixture it stands on or is set into (a basin on the vanity, a toilet in
   * its stall). It may overlap that one, and is drawn inside its group.
   */
  readonly mountedOn?: string;
  /** A mark with no volume (a doormat, an outline on the floor): never collides. */
  readonly flat?: boolean;
  /** For grids of compartments (shoe cubbies, window panes): columns across, rows up. */
  readonly grid?: { readonly cols: number; readonly rows: number };
  /** A drawing variant: a pod's "lower"/"upper", a curtain drawn "open", a door's swing. */
  readonly variant?: string;
  /**
   * For a flight of stairs: the heights (relative to its floor) where it starts and ends; it climbs
   * toward `faces`. The top step may stand above the box (the flight that reaches the floor above
   * ends at that floor's height, past this floor's ceiling). A landing starts and ends at one height.
   */
  readonly climb?: { readonly from: number; readonly to: number };
}

export type WallKind = "facade" | "party" | "back" | "partition" | "enclosure" | "parapet";

/** A gap in a wall, along its long side (x for walls across the house, y for walls along it). */
export interface Opening {
  readonly from: number;
  readonly to: number;
  /** Relative to the wall's floor. Defaults to 0 (a door). */
  readonly z0?: number;
  readonly z1: number;
}

export interface Wall extends Certainty {
  readonly id: string;
  readonly floor: FloorId;
  readonly kind: WallKind;
  /** z relative to the floor; z1 is the wall's height in the cutaway (to the ceiling or less). */
  readonly box: Box3;
  readonly openings?: readonly Opening[];
  /** Material name in lib/house/palette.ts. */
  readonly material: MaterialName;
  /** Wood-panelled walls show their boards. */
  readonly panelled?: boolean;
}

/** A point on a route: x, y and optionally a height above the floor (on stairs). */
export type RoutePoint = readonly [number, number] | readonly [number, number, number];

export interface RouteSegment {
  readonly floor: FloorId;
  readonly points: readonly RoutePoint[];
}

export interface RouteStop {
  readonly floor: FloorId;
  readonly at: readonly [number, number];
  readonly label: string;
}

export interface Route {
  readonly id: string;
  readonly name: string;
  /** One segment per floor, in walking order. */
  readonly segments: readonly RouteSegment[];
  readonly stops?: readonly RouteStop[];
}

export interface HouseModel {
  readonly name: string;
  /** Interior width (x) and depth (y). */
  readonly width: number;
  readonly depth: number;
  /** Thickness of the outer walls, drawn outside the interior box. */
  readonly wall: number;
  /** Thickness of the slab between floors. */
  readonly slab: number;
  readonly floors: readonly Floor[];
  readonly areas: readonly Area[];
  readonly walls: readonly Wall[];
  readonly fixtures: readonly Fixture[];
  /** The roof slab over the top floor (absolute heights). */
  readonly roof: { readonly z0: number; readonly z1: number };
  readonly routes: readonly Route[];
  /** The rectangle of the terrace in front of the facade (outside areas live here). */
  readonly terrace: Rect;
  /**
   * How the house is set up around its guests' cultures (numbers it skips, and why), in plain sentences
   * for guides, the team and Shadow.
   */
  readonly customs?: readonly string[];
  /** Every area id of the owner's walk; each must have a model area. */
  readonly walkAreaIds: readonly string[];
}
