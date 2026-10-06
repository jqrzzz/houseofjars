/**
 * Builds the board for "Find your pod" (public/game/find-your-pod.json) from the house model in lib/house, the
 * placed house rules (lib/house/rules.ts) and content/stay.ts. Node only (it reads the plan pictures for their
 * viewBoxes): run it with `npm run house:game`; a test fails while the committed board differs from a fresh build.
 *
 * Places are put on the plan pictures with the projection renderPlan draws them with: 50 px to the metre, the
 * street at the bottom (lib/house/geometry.ts planProjection). The two floors sit side by side on one board, the
 * ground floor on the left, so the stairs lead from one to the other.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beds, times } from "@/content/stay";
import { joinList } from "@/content/text";
import { planProjection } from "@/lib/house/geometry";
import { houseOfJars } from "@/lib/house/house-of-jars";
import { placedHouseRules } from "@/lib/house/rules";
import type { Area, Fixture, HouseModel, RouteStop } from "@/lib/house/types";
import { pages } from "@/lib/site";
import { YOUR_POD } from "./engine";
import {
  GAME_RULES,
  SAYS,
  type Act,
  type FloorKey,
  type GameEdge,
  type GameFloor,
  type GameGraph,
  type GameNode,
  type GameRule,
  type SayId,
  type Zone,
} from "./types";

/**
 * The board's pictures: the house model's plans. Switch these (and run `npm run house:game`) to play on other
 * plans drawn in the same projection, such as a day and an evening pair.
 */
export const PLAN_IMAGES: Readonly<Record<FloorKey, { readonly day: string; readonly evening: string }>> = {
  ground: { day: "/house/paper-plan-ground-day.svg", evening: "/house/paper-plan-ground-evening.svg" },
  floor1: { day: "/house/paper-plan-floor1-day.svg", evening: "/house/paper-plan-floor1-evening.svg" },
};

/** renderPlan's scale (lib/house/render.ts): plan pixels to the metre. */
export const PLAN_SCALE = 50;

const FLOOR_NAMES: Readonly<Record<FloorKey, string>> = { ground: "Ground floor", floor1: "Floor 1" };

/** Room between the two floors on the board, and above them for their names. */
const GAP = 24;
const NAME_BAND = 40;
/** Plan pixels kept beside the outer walls. */
const SIDE = 14;
/**
 * The depth (in metres from the street) where the board's top edge cuts each plan: along the wall across the back
 * of the part that is played, never through a room's fixtures. On the ground floor that is the partition behind
 * the toilet and the corridor (13.2 to 13.3 m), on Floor 1 the one between the landing and the women's bathroom
 * (12.6 to 12.7 m). No place on the board lies deeper.
 */
export const BOARD_TOP: Readonly<Record<FloorKey, number>> = { ground: 13.25, floor1: 12.65 };

/** Reads a plan picture's viewBox from public/. */
export function planViewBox(src: string, root = process.cwd()): [number, number, number, number] {
  const svg = readFileSync(join(root, "public", src), "utf8");
  const found = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!found) throw new Error(`${src} has no viewBox.`);
  return [Number(found[1]), Number(found[2]), Number(found[3]), Number(found[4])];
}

const round = (n: number) => Math.round(n);

type Spot = readonly [number, number];

interface PlaceSpec {
  readonly id: string;
  readonly floor: FloorKey;
  /** Metres: x from the left party wall, y from the facade toward the back. */
  readonly at: Spot;
  readonly label: string;
  readonly zone: Zone;
  readonly acts?: readonly Act[];
  /** The area, when the spot alone would name the wrong one. */
  readonly area?: string;
  readonly note?: string;
}

function stopOf(model: HouseModel, route: string, label: string): RouteStop {
  const found = model.routes.find((r) => r.id === route)?.stops?.find((s) => s.label === label);
  if (!found?.does) throw new Error(`The model's walk "${route}" has no step "${label}" with words.`);
  return found;
}

const doesOf = (model: HouseModel, route: string, label: string) => stopOf(model, route, label).does!;
const spotOf = (model: HouseModel, route: string, label: string): Spot => stopOf(model, route, label).at;

const inRect = (area: Area, [x, y]: Spot) =>
  [area.rect, ...(area.more ?? [])].some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);

/** The most particular area at a spot: a sub-area (the front desk) before the room it is in (the café). */
function areaAt(model: HouseModel, floor: FloorKey, spot: Spot): string {
  const here = model.areas.filter((a) => a.floor === floor && inRect(a, spot));
  const found = here.find((a) => a.parent) ?? here[0];
  if (!found) throw new Error(`No area on ${floor} at ${spot.join(", ")}.`);
  return found.id;
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
};

const podNumber = (label: string) => Number(label.replace(/\D/g, ""));

/** The stacks of pods in a dorm, each top bunk first, with the spot on the aisle side where you climb in. */
function stacks(model: HouseModel, area: string): { pods: [string, string]; spot: Spot }[] {
  const pods = model.fixtures.filter((f) => f.type === "pod" && f.area === area && f.label);
  const byStack = new Map<string, Fixture[]>();
  for (const pod of pods) {
    const key = `${pod.box.x0},${pod.box.y0}`;
    byStack.set(key, [...(byStack.get(key) ?? []), pod]);
  }
  return [...byStack.values()].map((pair) => {
    const [upper, lower] = [...pair].sort((a, b) => b.box.z0 - a.box.z0) as [Fixture, Fixture];
    const b = upper.box;
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    // The aisle side, a little in from the pod's edge, so the pod's numbers on the plan stay clear.
    const spot: Spot = upper.faces === "+x" ? [b.x1 - 0.15, cy] : upper.faces === "-x" ? [b.x0 + 0.15, cy] : [cx, b.y0 + 0.25];
    return { pods: [upper.label!, lower.label!], spot };
  });
}

/** What a stack's note says where the numbers skip: which number is missing, and why (beds.numbering). */
function stackNote(pods: readonly [string, string], all: readonly string[]): string | undefined {
  const { why } = beds.numbering.value;
  const skipped: readonly number[] = beds.numbering.value.skipped;
  const lines: string[] = [];
  for (const pod of pods) {
    const n = podNumber(pod);
    if (!skipped.includes(n - 1)) continue;
    const before = all.filter((p) => podNumber(p) < n).at(-1);
    if (!before) continue;
    lines.push(`The next pod after ${before} isn’t ${podNumber(before) + 1}: the house skips ${joinList(skipped.map(String))}, ${why}.`);
  }
  return lines.length > 0 ? lines.join(" ") : undefined;
}

export function buildGameGraph(model: HouseModel = houseOfJars, root = process.cwd()): GameGraph {
  const rules = new Map(placedHouseRules().map((r) => [r.id, r]));
  const ruleText = (id: string) => {
    const r = rules.get(id);
    if (!r) throw new Error(`No placed house rule "${id}".`);
    return { rule: r.rule, why: r.why };
  };

  // The board: each floor's plan, cropped to the playable part, side by side.
  const project = planProjection(model.depth, PLAN_SCALE);
  const boxes = { ground: planViewBox(PLAN_IMAGES.ground.day, root), floor1: planViewBox(PLAN_IMAGES.floor1.day, root) };
  for (const key of ["ground", "floor1"] as const) {
    const evening = planViewBox(PLAN_IMAGES[key].evening, root);
    if (evening.join() !== boxes[key].join()) throw new Error(`The ${key} plans for day and evening have different viewBoxes.`);
  }
  const x0 = -SIDE;
  const width = model.width * PLAN_SCALE + 2 * SIDE;
  const top = (id: FloorKey) => Math.floor(project.point([0, BOARD_TOP[id], 0])[1]);
  // The sheet cut deepest sets the board's top; a sheet cut shallower starts lower, so the two floors stay level.
  const y0 = Math.min(top("ground"), top("floor1"));
  // Each sheet runs down to the bottom of its own plan, where the street and the plan's caption are.
  const floors: GameFloor[] = (["ground", "floor1"] as const).map((id, i) => ({
    id,
    name: FLOOR_NAMES[id],
    src: { ...PLAN_IMAGES[id] },
    viewBox: boxes[id],
    crop: [x0, top(id), width, boxes[id][1] + boxes[id][3] - top(id)],
    at: [i * (width + GAP), NAME_BAND + top(id) - y0],
  }));
  const toBoard = (floor: FloorKey, [x, y]: Spot): [number, number] => {
    const { at, crop } = floors.find((f) => f.id === floor)!;
    const [px, py] = project.point([x, y, 0]);
    return [round(at[0] + px - crop[0]), round(at[1] + py - crop[1])];
  };

  // Places. Where the model's walks stop, the place is the stop; the rest are spots on the way.
  const dorm = stacks(model, "dorm-h");
  const pods = dorm.flatMap((s) => s.pods).sort((a, b) => podNumber(a) - podNumber(b));
  const door = model.fixtures.find((f) => f.id === "door-front")!.box;
  const places: PlaceSpec[] = [
    { id: "terrace", floor: "ground", at: [(door.x0 + door.x1) / 2, -1.25], label: "the terrace", zone: "outside", acts: ["knock"] },
    { id: "entrance", floor: "ground", at: [(door.x0 + door.x1) / 2, 0.25], label: "the entrance", zone: "ground", acts: ["ask-open"] },
    { id: "cafe", floor: "ground", at: [1.85, 3.3], label: "the café", zone: "ground" },
    { id: "desk", floor: "ground", at: spotOf(model, "arrival", "Check in"), label: "the front desk", zone: "ground", acts: ["check-in", "check-out"], area: "desk" },
    { id: "luggage", floor: "ground", at: spotOf(model, "leaving-early", "Pack here"), label: "the luggage space by the front desk", zone: "ground", acts: ["pack"] },
    { id: "stairs-foot", floor: "ground", at: [3.3, 9.35], label: "the foot of the stairs", zone: "ground", acts: ["shoes-off", "shoes-on"], area: "stairs-ground" },
    { id: "water", floor: "ground", at: [3.25, 11.0], label: "the free water", zone: "ground", acts: ["water"], area: "water" },
    { id: "stairs-top", floor: "floor1", at: [2.6, 9.15], label: "the top of the stairs", zone: "landing" },
    { id: "cubbies", floor: "floor1", at: spotOf(model, "arrival", "Shoes"), label: "the shoe cubbies", zone: "landing", acts: ["cubby", "take-shoes", "shoes-on-here"] },
    { id: "dorm-door", floor: "floor1", at: [3.15, 8.2], label: "the door of Dorm H", zone: "dorm" },
    { id: "aisle-back", floor: "floor1", at: [2.0, 6.4], label: "the aisle, by the door", zone: "dorm" },
    { id: "aisle-mid", floor: "floor1", at: [2.0, 3.6], label: "the middle of the aisle", zone: "dorm" },
    { id: "aisle-front", floor: "floor1", at: [2.0, 1.2], label: "the aisle, by the front window", zone: "dorm" },
    ...dorm.map(({ pods: pair, spot }): PlaceSpec => ({
      id: `pods-${pair[0]}-${pair[1]}`,
      floor: "floor1",
      at: spot,
      label: `pods ${pair[0]} and ${pair[1]}`,
      zone: "dorm",
      area: "dorm-h",
      note: stackNote(pair, pods),
    })),
  ];
  const nodes: GameNode[] = places.map((p) => {
    const [x, y] = toBoard(p.floor, p.at);
    const pair = p.id.startsWith("pods-") ? p.id.slice(5).split("-") : undefined;
    return {
      id: p.id,
      floor: p.floor,
      x,
      y,
      zone: p.zone,
      area: p.area ?? areaAt(model, p.floor, p.at),
      label: p.label,
      ...(p.acts ? { acts: p.acts } : {}),
      ...(pair ? { pods: pair } : {}),
      ...(p.note ? { note: p.note } : {}),
    };
  });

  // Steps between places. Each stack is reached from the stretch of aisle beside it; the stack lying across the
  // end of the aisle, just inside the door, from the door.
  const aisles = nodes.filter((n) => n.id.startsWith("aisle-"));
  const doorNode = nodes.find((n) => n.id === "dorm-door")!;
  const stackEdges: GameEdge[] = nodes
    .filter((n) => n.pods)
    .map((n) => {
      const across = dorm.find((s) => `pods-${s.pods[0]}-${s.pods[1]}` === n.id && s.spot[1] > 7.6);
      if (across) return [doorNode.id, n.id] as const;
      const aisle = [...aisles].sort((a, b) => Math.abs(a.y - n.y) - Math.abs(b.y - n.y))[0]!;
      return [aisle.id, n.id] as const;
    });
  const edges: GameEdge[] = [
    ["terrace", "entrance", "door"],
    ["entrance", "cafe"],
    ["cafe", "desk"],
    ["desk", "luggage"],
    ["luggage", "stairs-foot"],
    ["stairs-foot", "water"],
    ["stairs-foot", "stairs-top", "stairs"],
    ["stairs-top", "cubbies"],
    ["cubbies", "dorm-door"],
    ["dorm-door", "aisle-back"],
    ["aisle-back", "aisle-mid"],
    ["aisle-mid", "aisle-front"],
    ...stackEdges,
  ];

  // The house's lamps, lit in walking order at the end: the ground floor from the street back, Floor 1 from the
  // stairs, and last the reading light in your pod.
  const lit = (f: Fixture) => ["pendant-lamp", "wall-lamp", "jar-big"].includes(f.type) && (f.floor === "ground" || f.floor === "floor1");
  const centre = (f: Fixture): Spot => [(f.box.x0 + f.box.x1) / 2, (f.box.y0 + f.box.y1) / 2];
  const lamps = model.fixtures.filter(lit);
  const ground = lamps.filter((f) => f.floor === "ground").sort((a, b) => centre(a)[1] - centre(b)[1] || centre(a)[0] - centre(b)[0]);
  const upstairs = lamps.filter((f) => f.floor === "floor1").sort((a, b) => centre(b)[1] - centre(a)[1]);
  const mine = model.fixtures.find((f) => f.type === "pod" && f.label === YOUR_POD);
  if (!mine) throw new Error(`No pod ${YOUR_POD} in the model.`);
  const lights = [...ground, ...upstairs, mine].map((f) => toBoard(f.floor as FloorKey, centre(f)));

  const quietHours = times.quietHours?.value;
  if (!quietHours) throw new Error("content/stay.ts has no quiet hours.");
  const sayFrom: Readonly<Record<SayId, readonly [string, string]>> = {
    "door-in": ["arrival", "Front door"],
    "check-in": ["arrival", "Check in"],
    "shoes-off": ["arrival", "Shoes off"],
    cubby: ["arrival", "Shoes"],
    "take-shoes": ["leaving-early", "Shoes"],
    pack: ["leaving-early", "Pack here"],
    "check-out": ["leaving-early", "Check out"],
    water: ["water", "Free water"],
  };

  return {
    v: 1,
    board: [2 * width + GAP, Math.max(...floors.map((f) => f.at[1] + f.crop[3]))],
    floors,
    nodes,
    edges,
    pods,
    rules: Object.fromEntries(GAME_RULES.map((id) => [id, ruleText(id)])) as Record<GameRule, { rule: string; why: string }>,
    says: Object.fromEntries(SAYS.map((id) => [id, doesOf(model, ...sayFrom[id])])) as Record<SayId, string>,
    door: { from: minutes(times.frontDoorLocked.value.from), until: minutes(times.frontDoorLocked.value.until) },
    quiet: quietHours,
    lights,
    links: { book: pages.book.path, play: `${pages.house.path}#play` },
  };
}

/** The board as committed to public/game/find-your-pod.json. */
export function gameJson(graph: GameGraph = buildGameGraph()): string {
  return `${JSON.stringify(graph)}\n`;
}
