/**
 * "Find your pod": the shapes of the game's data. The board (public/game/find-your-pod.json) is built from the
 * house model, its placed rules and content/ by lib/game/build-graph.ts; the rules of play live in
 * lib/game/engine.ts. Nothing here imports lib/house or content/, so the game's client code stays small.
 */

/** The two floors the game is played on. Floor 2 is not drawn from photographs yet, so it stays off the board. */
export type FloorKey = "ground" | "floor1";

export type Dir = "up" | "down" | "left" | "right";

/** Where your shoes are: on your feet, in your hand, or in a cubby on the Floor 1 landing. */
export type Shoes = "on" | "carried" | "cubby";

/** Your bag: none to think about, in your hand, still in your pod, or packed by the front desk. */
export type Bag = "none" | "carried" | "pod" | "packed";

export type ErrandId = "arrive" | "late" | "early";

/** The phases of a game, for the dialog: what the panel beside the board shows. */
export type Phase = "intro" | "playing" | "nudge" | "errand-done" | "won";

/** Which part of the house a place is in: the rules change at the door, at the stairs and at the dorm's door. */
export type Zone = "outside" | "ground" | "landing" | "dorm";

/** Things a guest can do at a place. Which ones are offered depends on the errand and on what has been done. */
export type Act =
  | "knock"
  | "ask-open"
  | "check-in"
  | "check-out"
  | "shoes-off"
  | "shoes-on"
  | "cubby"
  | "take-shoes"
  | "shoes-on-here"
  | "take-bag"
  | "pack-here"
  | "pack"
  | "water"
  | "climb";

/** The house rules a nudge can hold up (ids from lib/house/rules.ts), plus the one said in the dorm. */
export const NUDGE_RULES = [
  "registered-guests-upstairs",
  "no-shoes-upstairs",
  "front-door-locked",
  "pack-downstairs",
  "leaving-before-eight",
] as const;
export type NudgeRule = (typeof NUDGE_RULES)[number];
export const GAME_RULES = [...NUDGE_RULES, "quiet"] as const;
export type GameRule = (typeof GAME_RULES)[number];

/** Lines the game says after an action, taken word for word from the model's walks through the house. */
export const SAYS = ["door-in", "check-in", "shoes-off", "cubby", "take-shoes", "pack", "check-out", "water"] as const;
export type SayId = (typeof SAYS)[number];

/** What a guest has done on an errand: the errand's steps tick off as these are reached. */
export type Milestone =
  | "in"
  | "opened"
  | "checked-in"
  | "shoes-off"
  | "cubby"
  | "pod"
  | "bag"
  | "shoes"
  | "shoes-on"
  | "packed"
  | "checked-out"
  | "out";

export interface GameNode {
  readonly id: string;
  readonly floor: FloorKey;
  /** Board units: the plan's pixels (50 per metre), each floor placed side by side on one board. */
  readonly x: number;
  readonly y: number;
  readonly zone: Zone;
  /** The house model's area id. */
  readonly area: string;
  /** How the place reads in a sentence: "the front desk". */
  readonly label: string;
  /** What can be done here (a stack of pods always offers climbing in, taking your bag and packing it). */
  readonly acts?: readonly Act[];
  /** A stack of pods, top bunk first: ["H15", "H12"]. */
  readonly pods?: readonly string[];
  /** Said on arriving here. */
  readonly note?: string;
}

/** Two places one step apart; a third item says the step goes through the glass door or up or down the stairs. */
export type GameEdge = readonly [string, string] | readonly [string, string, "door" | "stairs"];

export interface GameFloor {
  readonly id: FloorKey;
  readonly name: string;
  /** The plan pictures: one per theme (the same file while the plans follow the device's colours). */
  readonly src: { readonly day: string; readonly evening: string };
  /** The picture's own viewBox, in plan pixels. */
  readonly viewBox: readonly [number, number, number, number];
  /** The part of the picture on the board, in plan pixels. */
  readonly crop: readonly [number, number, number, number];
  /** Where the crop's top-left corner sits on the board. */
  readonly at: readonly [number, number];
}

export interface GameGraph {
  readonly v: 1;
  /** The board's size, in board units. */
  readonly board: readonly [number, number];
  readonly floors: readonly GameFloor[];
  readonly nodes: readonly GameNode[];
  readonly edges: readonly GameEdge[];
  /** Every pod in Dorm H, in number order. */
  readonly pods: readonly string[];
  /** Each rule word for word from content/stay.ts, with its reason. */
  readonly rules: Readonly<Record<GameRule, { readonly rule: string; readonly why: string }>>;
  readonly says: Readonly<Record<SayId, string>>;
  /** The front door's locked hours, in minutes after midnight. */
  readonly door: { readonly from: number; readonly until: number };
  /** Quiet hours, as content/stay.ts writes them: "21:00–07:00". */
  readonly quiet: string;
  /** The house's lamps, for the last scene: board units, in walking order. */
  readonly lights: readonly (readonly [number, number])[];
  readonly links: { readonly book: string; readonly play: string };
}

export interface GameState {
  readonly errand: ErrandId;
  /** The place the lamp is at. */
  readonly node: string;
  /** Minutes after midnight; every move and action takes a minute. */
  readonly clock: number;
  readonly shoes: Shoes;
  readonly bag: Bag;
  readonly checkedIn: boolean;
  readonly checkedOut: boolean;
  /** The night staff has opened the locked front door. */
  readonly doorOpen: boolean;
  readonly nudges: number;
  readonly done: readonly Milestone[];
  /** The places walked on this errand, in order: the thread behind the lamp. */
  readonly trail: readonly string[];
}

export type Move = { readonly kind: "go"; readonly to: string } | { readonly kind: "act"; readonly act: Act; readonly pod?: string };

export interface GameOption {
  readonly key: string;
  readonly move: Move;
  readonly label: string;
  /** The arrow key that takes this move, if one does. */
  readonly dir?: Dir;
}

export interface PlayResult {
  readonly state: GameState;
  /** What happened, in a sentence or two; empty when nothing did. */
  readonly say: string;
  /** The rule Shadow holds up, when the move broke one (the lamp stays put). */
  readonly nudge?: NudgeRule;
}
