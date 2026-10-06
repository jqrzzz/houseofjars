/**
 * "Find your pod": the rules of play, as pure functions over the board in public/game/find-your-pod.json. Turn
 * based: each move or action is a minute on the house clock. You are a small lamp light walking the plans, and
 * you cannot lose: a mistake brings a nudge (the house rule it broke, word for word) and costs a lamp, never
 * the errand. Client-safe: no lib/house, no content/ (the board carries their words).
 */
import type {
  Act,
  Dir,
  ErrandId,
  GameGraph,
  GameNode,
  GameOption,
  GameState,
  Milestone,
  Move,
  NudgeRule,
  PlayResult,
} from "./types";

/** The pod the errands are about, on the owner's bed register (a lower bunk in Dorm H, by the door). */
export const YOUR_POD = "H12";

export const ERRAND_ORDER: readonly ErrandId[] = ["arrive", "late", "early"];

export interface Errand {
  /** The house clock when it starts. */
  readonly clock: number;
  /** For buttons: "16:20, you’ve arrived". */
  readonly name: string;
  readonly title: string;
  /** Where the errand starts: on the terrace, or in your pod. */
  readonly from: "outside" | "pod";
  readonly start: Pick<GameState, "shoes" | "bag" | "checkedIn">;
  readonly steps: readonly (readonly [Milestone, string])[];
  /** The step that ends the errand. */
  readonly goal: Milestone;
}

const hm = (h: number, m: number) => h * 60 + m;

export const ERRANDS: Readonly<Record<ErrandId, Errand>> = {
  arrive: {
    clock: hm(16, 20),
    name: "16:20, you’ve arrived",
    title: `16:20, you’ve arrived: find pod ${YOUR_POD}.`,
    from: "outside",
    start: { shoes: "on", bag: "none", checkedIn: false },
    steps: [
      ["in", "In through the glass door"],
      ["checked-in", "Check in at the front desk: passport and deposit"],
      ["shoes-off", "Shoes off at the foot of the stairs"],
      ["cubby", "Shoes into a cubby on the landing"],
      ["pod", `Climb into ${YOUR_POD}`],
    ],
    goal: "pod",
  },
  late: {
    clock: hm(23, 50),
    name: "23:50, back late",
    title: "23:50, back late: the door is locked.",
    from: "outside",
    start: { shoes: "on", bag: "none", checkedIn: true },
    steps: [
      ["opened", "Knock on the glass: the night staff open up"],
      ["in", "In through the glass door"],
      ["shoes-off", "Shoes off at the foot of the stairs"],
      ["cubby", "Shoes into a cubby on the landing"],
      ["pod", `Back into ${YOUR_POD}, quietly`],
    ],
    goal: "pod",
  },
  early: {
    clock: hm(6, 40),
    name: "06:40, leaving early",
    title: "06:40, leaving early.",
    from: "pod",
    start: { shoes: "cubby", bag: "pod", checkedIn: true },
    steps: [
      ["bag", `Your bag from ${YOUR_POD}`],
      ["shoes", "Your shoes from the landing"],
      ["shoes-on", "Shoes on at the foot of the stairs"],
      ["packed", "Pack in the café, by the front desk"],
      ["checked-out", "Padlock and towel in: deposit back (you told the team beforehand)"],
      ["opened", "The night staff open the door"],
      ["out", "Out onto the terrace"],
    ],
    goal: "out",
  },
};

// ---------------------------------------------------------------------------
// The board

export function nodeOf(graph: GameGraph, id: string): GameNode {
  const found = graph.nodes.find((n) => n.id === id);
  if (!found) throw new Error(`No place "${id}" on the board.`);
  return found;
}

/** The places one step from here, with how the step is taken. */
export function links(graph: GameGraph, id: string): { to: string; via?: "door" | "stairs" }[] {
  const out: { to: string; via?: "door" | "stairs" }[] = [];
  for (const [a, b, via] of graph.edges) {
    if (a === id) out.push({ to: b, via });
    else if (b === id) out.push({ to: a, via });
  }
  return out;
}

const startNode = (graph: GameGraph, from: Errand["from"]) =>
  from === "outside" ? graph.nodes.find((n) => n.zone === "outside") : graph.nodes.find((n) => n.pods?.includes(YOUR_POD));

export function start(errand: ErrandId, graph: GameGraph): GameState {
  const def = ERRANDS[errand];
  const at = startNode(graph, def.from);
  if (!at) throw new Error(`The board has no place to start "${errand}".`);
  return {
    errand,
    node: at.id,
    clock: def.clock,
    ...def.start,
    checkedOut: false,
    doorOpen: false,
    nudges: 0,
    done: [],
    trail: [at.id],
  };
}

const DAY = 24 * 60;

/** Whether the front door is locked at this minute (from 23:30 until 07:00). */
export function doorLocked(state: GameState, graph: GameGraph): boolean {
  const t = state.clock % DAY;
  const { from, until } = graph.door;
  return from > until ? t >= from || t < until : t >= from && t < until;
}

export function formatClock(minutes: number): string {
  const t = ((minutes % DAY) + DAY) % DAY;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export const isDone = (state: GameState) => state.done.includes(ERRANDS[state.errand].goal);

/** Lamps for an errand: three, less one for each nudge, never fewer than one. */
export function lamps(state: GameState): number {
  return Math.max(1, 3 - state.nudges);
}

// ---------------------------------------------------------------------------
// What can be done here

const bunk = (node: GameNode, pod: string) => (node.pods?.[0] === pod ? "top bunk" : "lower bunk");

const POD_ACTS: readonly Act[] = ["climb", "take-bag", "pack-here"];
const actsOf = (node: GameNode): readonly Act[] => node.acts ?? (node.pods ? POD_ACTS : []);

function offered(act: Act, state: GameState, graph: GameGraph, here: GameNode): boolean {
  const early = state.errand === "early";
  const mine = here.pods?.includes(YOUR_POD) ?? false;
  const shut = doorLocked(state, graph) && !state.doorOpen;
  switch (act) {
    case "knock":
      return shut;
    case "ask-open":
      return shut;
    case "check-in":
      return !state.checkedIn;
    case "check-out":
      return early && state.checkedIn && !state.checkedOut;
    case "shoes-off":
      return state.shoes === "on";
    case "shoes-on":
      return state.shoes === "carried";
    case "cubby":
      return state.shoes === "carried" && !early;
    case "take-shoes":
      return state.shoes === "cubby";
    case "shoes-on-here":
      return early && state.shoes !== "on";
    case "take-bag":
      return mine && state.bag === "pod";
    case "pack-here":
      return mine && early && (state.bag === "pod" || state.bag === "carried");
    case "pack":
      return state.bag === "carried";
    case "water":
      return true;
    case "climb":
      return !early && !isDone(state);
  }
}

const ACT_LABELS: Readonly<Record<Exclude<Act, "climb">, string>> = {
  knock: "Knock on the glass",
  "ask-open": "Ask the night staff to open the door",
  "check-in": "Check in: passport and deposit",
  "check-out": "Hand in your padlock and towel: deposit back",
  "shoes-off": "Take your shoes off",
  "shoes-on": "Put your shoes on",
  cubby: "Leave your shoes in a cubby",
  "take-shoes": "Take your shoes from the cubby",
  "shoes-on-here": "Put your shoes on here",
  "take-bag": "Take your bag",
  "pack-here": "Pack your bag here",
  pack: "Pack your bag",
  water: "Have a glass of water",
};

function moveLabel(from: GameNode, to: GameNode, via?: "door" | "stairs"): string {
  if (via === "stairs") return to.floor === "ground" ? "Go down the stairs" : "Go up the stairs";
  if (via === "door") return to.zone === "outside" ? "Go out through the glass door" : "Go in through the glass door";
  if (from.zone === "landing" && to.zone === "dorm") return "Go into Dorm H";
  if (from.zone === "dorm" && to.zone === "landing") return `Go out to ${to.label}`;
  return `Go to ${to.label}`;
}

const VECTORS: Readonly<Record<Dir, readonly [number, number]>> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/**
 * The place an arrow key leads to: of the places one step away and within 60° of the arrow, the one most nearly
 * straight ahead (the nearer one when two are as straight).
 */
export function neighbourInDirection(state: GameState, graph: GameGraph, dir: Dir): string | null {
  const here = nodeOf(graph, state.node);
  const [ux, uy] = VECTORS[dir];
  let best: { id: string; cos: number; d: number } | null = null;
  for (const { to } of links(graph, here.id)) {
    const n = nodeOf(graph, to);
    const dx = n.x - here.x;
    const dy = n.y - here.y;
    const d = Math.hypot(dx, dy);
    if (d === 0) continue;
    const cos = (dx * ux + dy * uy) / d;
    if (cos < 0.5 - 1e-9) continue;
    if (!best || cos > best.cos + 0.02 || (Math.abs(cos - best.cos) <= 0.02 && d < best.d)) best = { id: to, cos, d };
  }
  return best?.id ?? null;
}

/** Everything the lamp can do here: actions first, then the steps to the places next door. */
export function options(state: GameState, graph: GameGraph): GameOption[] {
  if (isDone(state)) return [];
  const here = nodeOf(graph, state.node);
  const out: GameOption[] = [];
  for (const act of actsOf(here)) {
    if (!offered(act, state, graph, here)) continue;
    if (act === "climb") {
      for (const pod of here.pods ?? []) {
        out.push({ key: `climb:${pod}`, move: { kind: "act", act, pod }, label: `Climb into ${pod}: ${bunk(here, pod)}` });
      }
    } else {
      out.push({ key: act, move: { kind: "act", act }, label: ACT_LABELS[act] });
    }
  }
  const arrows = new Map<string, Dir>();
  for (const dir of ["up", "down", "left", "right"] as const) {
    const to = neighbourInDirection(state, graph, dir);
    if (to && !arrows.has(to)) arrows.set(to, dir);
  }
  for (const { to, via } of links(graph, here.id)) {
    out.push({ key: `go:${to}`, move: { kind: "go", to }, label: moveLabel(here, nodeOf(graph, to), via), dir: arrows.get(to) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Playing a move

const tick = (state: GameState): GameState => ({ ...state, clock: state.clock + 1 });
const reach = (state: GameState, ...milestones: Milestone[]): GameState => ({
  ...state,
  done: [...state.done, ...milestones.filter((m) => !state.done.includes(m))],
});

function nudged(state: GameState, graph: GameGraph, rule: NudgeRule): PlayResult {
  const { rule: text, why } = graph.rules[rule];
  return { state: { ...state, nudges: state.nudges + 1 }, say: `${text} ${why}`, nudge: rule };
}

const stay = (state: GameState, say: string): PlayResult => ({ state, say });

/** What a move does: the new state, what to say, and the rule broken if Shadow nudges. */
export function play(state: GameState, move: Move, graph: GameGraph): PlayResult {
  if (isDone(state)) return stay(state, "");
  return move.kind === "go" ? go(state, move.to, graph) : act(state, move.act, move.pod, graph);
}

function go(state: GameState, id: string, graph: GameGraph): PlayResult {
  const here = nodeOf(graph, state.node);
  const step = links(graph, here.id).find((l) => l.to === id);
  if (!step) return stay(state, "That isn’t one step from here.");
  const to = nodeOf(graph, id);
  const early = state.errand === "early";

  if (step.via === "door") {
    const out = to.zone === "outside";
    if (out && early) {
      if (state.bag === "pod") return stay(state, `Your bag is still up in ${YOUR_POD}.`);
      if (state.shoes !== "on") return stay(state, "Your shoes first: put them on at the foot of the stairs.");
      if (state.bag === "carried") return stay(state, "Pack your bag first, by the front desk.");
    }
    if (doorLocked(state, graph) && !state.doorOpen) return nudged(state, graph, "front-door-locked");
    if (out && early && !state.checkedOut) return nudged(state, graph, "leaving-before-eight");
  }
  if (step.via === "stairs" && to.floor !== "ground") {
    if (!state.checkedIn) return nudged(state, graph, "registered-guests-upstairs");
    if (state.shoes === "on") return nudged(state, graph, "no-shoes-upstairs");
  }
  if (here.zone === "landing" && to.zone === "dorm" && state.shoes !== "cubby") return nudged(state, graph, "no-shoes-upstairs");

  let next = tick({ ...state, node: to.id, trail: [...state.trail, to.id] });
  const says: string[] = [];
  if (step.via === "door" && to.zone !== "outside" && !state.done.includes("in")) {
    next = reach(next, "in");
    says.push(graph.says["door-in"]);
  }
  if (step.via === "door" && to.zone === "outside" && early) {
    next = reach(next, "out");
    says.push("Out onto the terrace, with the house still asleep behind you.");
  }
  if (here.zone !== "dorm" && to.zone === "dorm") says.push(`${graph.rules.quiet.rule} ${graph.rules.quiet.why}`);
  if (to.pods) says.push(`${to.pods[0]} is the top bunk, ${to.pods[1]} the lower one.`);
  if (to.note) says.push(to.note);
  return morning(state, { state: next, say: says.join(" ") }, graph);
}

/** At 07:00 the front door is unlocked for the day: said once, as the minute passes. */
function morning(before: GameState, result: PlayResult, graph: GameGraph): PlayResult {
  if (result.nudge || !doorLocked(before, graph) || doorLocked(result.state, graph) || before.doorOpen) return result;
  const state = before.errand === "early" ? reach(result.state, "opened") : result.state;
  const say = [result.say, `${formatClock(state.clock)}: the front door is unlocked for the day.`].filter(Boolean).join(" ");
  return { state, say };
}

function act(state: GameState, what: Act, pod: string | undefined, graph: GameGraph): PlayResult {
  return morning(state, acted(state, what, pod, graph), graph);
}

function acted(state: GameState, what: Act, pod: string | undefined, graph: GameGraph): PlayResult {
  const here = nodeOf(graph, state.node);
  if (!actsOf(here).includes(what) || !offered(what, state, graph, here)) return stay(state, "That can’t be done here.");
  const s = tick(state);
  switch (what) {
    case "knock":
      return { state: reach({ ...s, doorOpen: true }, "opened"), say: "You knock on the glass, and the night staff open the door." };
    case "ask-open":
      return { state: reach({ ...s, doorOpen: true }, "opened"), say: "The night staff open the glass door for you." };
    case "check-in":
      return { state: reach({ ...s, checkedIn: true }, "checked-in"), say: graph.says["check-in"] };
    case "check-out":
      return { state: reach({ ...s, checkedOut: true }, "checked-out"), say: graph.says["check-out"] };
    case "shoes-off":
      return { state: reach({ ...s, shoes: "carried" }, "shoes-off"), say: graph.says["shoes-off"] };
    case "shoes-on":
      return { state: reach({ ...s, shoes: "on" }, ...(state.errand === "early" ? (["shoes-on"] as const) : [])), say: "Shoes on, at the foot of the stairs." };
    case "cubby":
      return { state: reach({ ...s, shoes: "cubby" }, "cubby"), say: graph.says.cubby };
    case "take-shoes":
      return { state: reach({ ...s, shoes: "carried" }, "shoes"), say: graph.says["take-shoes"] };
    case "shoes-on-here":
      return nudged(state, graph, "no-shoes-upstairs");
    case "take-bag":
      return { state: reach({ ...s, bag: "carried" }, "bag"), say: `You take your bag from ${YOUR_POD}, quietly.` };
    case "pack-here":
      return nudged(state, graph, "pack-downstairs");
    case "pack":
      return { state: reach({ ...s, bag: "packed" }, "packed"), say: graph.says.pack };
    case "water":
      return { state: s, say: graph.says.water };
    case "climb": {
      if (!pod || !here.pods?.includes(pod)) return stay(state, "That can’t be done here.");
      if (pod !== YOUR_POD) return { state: s, say: `${pod} is someone else’s pod. Yours is ${YOUR_POD}.` };
      return { state: reach(s, "pod"), say: `${pod}, the ${bunk(here, pod)}: your pod. Draw the curtain.` };
    }
  }
}

// ---------------------------------------------------------------------------
// Words for the panel and the status line

export function steps(state: GameState): { label: string; done: boolean }[] {
  return ERRANDS[state.errand].steps.map(([m, label]) => ({ label, done: state.done.includes(m) }));
}

/** The next thing to do, as the status line says it after "Next:". */
export function nextTask(state: GameState, graph: GameGraph): string {
  const here = nodeOf(graph, state.node);
  const outside = here.zone === "outside";
  const shut = doorLocked(state, graph) && !state.doorOpen;
  switch (state.errand) {
    case "arrive":
    case "late":
      if (isDone(state)) return "sleep well";
      if (outside && shut) return "knock on the glass door";
      if (outside) return "go in through the glass door";
      if (!state.checkedIn) return "check in at the front desk";
      if (state.shoes === "on") return "take your shoes off at the foot of the stairs";
      if (state.shoes === "carried") return "leave your shoes in a cubby on the 1st floor landing";
      return `find pod ${YOUR_POD} in Dorm H and climb in`;
    case "early":
      if (isDone(state)) return "safe travels";
      if (state.bag === "pod") return `take your bag from ${YOUR_POD}`;
      if (state.shoes === "cubby") return "take your shoes from the cubby on the landing";
      if (state.shoes === "carried") return "put your shoes on at the foot of the stairs";
      if (state.bag === "carried") return "pack your bag by the front desk";
      if (!state.checkedOut) return "hand in your padlock and towel at the front desk";
      if (shut) return "ask the night staff to open the glass door";
      return "go out through the glass door";
  }
}

/** Where the lamp is, for the start of a sentence: "The front desk". */
export function placeName(state: GameState, graph: GameGraph): string {
  const label = nodeOf(graph, state.node).label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}
