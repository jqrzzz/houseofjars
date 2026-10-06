import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { beds, rules } from "@/content/stay";
import { houseOfJars } from "@/lib/house/house-of-jars";
import { BOARD_TOP, buildGameGraph, gameJson, PLAN_IMAGES, PLAN_SCALE } from "./build-graph";
import {
  ERRAND_ORDER,
  ERRANDS,
  YOUR_POD,
  isDone,
  lamps,
  links,
  neighbourInDirection,
  nextTask,
  nodeOf,
  options,
  play,
  start,
  steps,
} from "./engine";
import { solve } from "./solve";
import { GAME_RULES, NUDGE_RULES, type GameGraph, type GameState, type Move } from "./types";

const graph = buildGameGraph();
const committed = readFileSync(join(process.cwd(), "public/game/find-your-pod.json"), "utf8");

/** Plays moves by their labels, failing on any the game doesn't offer. */
function walk(state: GameState, labels: readonly string[], g: GameGraph = graph) {
  let s = state;
  const said: string[] = [];
  const nudges: string[] = [];
  for (const label of labels) {
    const option = options(s, g).find((o) => o.label === label);
    if (!option) throw new Error(`"${label}" is not offered at ${s.node}: ${options(s, g).map((o) => o.label).join(" / ")}`);
    const result = play(s, option.move, g);
    s = result.state;
    said.push(result.say);
    if (result.nudge) nudges.push(result.nudge);
  }
  return { state: s, said, nudges };
}

describe("Find your pod: the board", () => {
  it("is committed as built from the model, the rules and content/stay.ts (npm run house:game)", () => {
    expect(committed).toBe(gameJson());
  });

  it("stays within 6 kB", () => {
    expect(Buffer.byteLength(committed)).toBeLessThanOrEqual(6 * 1024);
  });

  it("numbers no pod 4, 13 or 14, as the house skips them", () => {
    const skipped: readonly number[] = beds.numbering.value.skipped;
    expect(skipped).toEqual([4, 13, 14]);
    expect(graph.pods).toHaveLength(houseOfJars.fixtures.filter((f) => f.type === "pod" && f.area === "dorm-h").length);
    for (const pod of graph.pods) expect(skipped, pod).not.toContain(Number(pod.slice(1)));
    for (const node of graph.nodes) for (const pod of node.pods ?? []) expect(graph.pods).toContain(pod);
    expect(graph.pods).toContain(YOUR_POD);
  });

  it("explains the skipped numbers where the pods jump, in content's words", () => {
    const notes = graph.nodes.flatMap((n) => (n.note ? [n.note] : []));
    expect(notes.some((n) => n.includes("isn’t 13") && n.includes(beds.numbering.value.why))).toBe(true);
    expect(notes.some((n) => n.includes("isn’t 4"))).toBe(true);
  });

  it("holds every nudge's rule and reason word for word from content/stay.ts", () => {
    const all = [...rules.house, ...rules.stay].map((f) => f.value);
    for (const id of GAME_RULES) {
      const { rule, why } = graph.rules[id];
      expect(all.some((r) => r.rule === rule && r.why === why), id).toBe(true);
    }
    expect(NUDGE_RULES.every((id) => GAME_RULES.includes(id))).toBe(true);
  });

  it("says only what the model's walks say, word for word", () => {
    const does = houseOfJars.routes.flatMap((r) => (r.stops ?? []).map((s) => s.does));
    for (const [id, text] of Object.entries(graph.says)) expect(does, id).toContain(text);
  });

  it("puts places where renderPlan draws them: 50 px to the metre, the street at the bottom", () => {
    // The front desk's rectangle as the committed plan draws it, against the same rectangle projected by the game.
    const svg = readFileSync(join(process.cwd(), "public", PLAN_IMAGES.ground.day), "utf8");
    const d = /area-desk"[^>]*><path[^>]*d="M([\d.-]+) ([\d.-]+)L([\d.-]+) [\d.-]+L[\d.-]+ ([\d.-]+)/.exec(svg);
    expect(d).not.toBeNull();
    const desk = houseOfJars.areas.find((a) => a.id === "desk")!.rect;
    expect(Number(d![1])).toBeCloseTo(desk.x0 * PLAN_SCALE);
    expect(Number(d![3])).toBeCloseTo(desk.x1 * PLAN_SCALE);
    expect(Number(d![2])).toBeCloseTo((houseOfJars.depth - desk.y1) * PLAN_SCALE);
    expect(Number(d![4])).toBeCloseTo((houseOfJars.depth - desk.y0) * PLAN_SCALE);
    // And every place lies on its floor's part of the board.
    for (const node of graph.nodes) {
      const floor = graph.floors.find((f) => f.id === node.floor)!;
      expect(node.x, node.id).toBeGreaterThan(floor.at[0]);
      expect(node.x, node.id).toBeLessThan(floor.at[0] + floor.crop[2]);
      expect(node.y, node.id).toBeGreaterThan(floor.at[1]);
      expect(node.y, node.id).toBeLessThan(floor.at[1] + floor.crop[3]);
    }
  });

  it("cuts each plan along a wall across the house, through no fixture, and keeps the two floors level", () => {
    const floorOf = (area: string) => houseOfJars.areas.find((a) => a.id === area)?.floor;
    for (const floor of graph.floors) {
      const depth = BOARD_TOP[floor.id];
      const walls = houseOfJars.walls.filter((w) => w.floor === floor.id && w.box.x0 <= 0 && w.box.x1 >= houseOfJars.width && w.box.y0 < depth && depth < w.box.y1);
      expect(walls, floor.id).toHaveLength(1);
      const things = houseOfJars.fixtures.filter((f) => floorOf(f.area) === floor.id && f.box.y0 < depth && depth < f.box.y1);
      expect(things.map((f) => f.id), floor.id).toEqual([]);
      // The sheet's top edge is that depth on the plan (the street at the bottom, 50 px to the metre).
      expect(floor.crop[1], floor.id).toBe(Math.floor((houseOfJars.depth - depth) * PLAN_SCALE));
    }
    // A depth sits at the same height on both sheets: the stairs line up across the board.
    const [ground, floor1] = graph.floors;
    expect(ground!.at[1] - ground!.crop[1]).toBe(floor1!.at[1] - floor1!.crop[1]);
  });

  it("joins every place to every other, with one flight of stairs and one door", () => {
    const reached = new Set([graph.nodes[0]!.id]);
    for (let grown = true; grown; ) {
      grown = false;
      for (const id of [...reached]) {
        for (const { to } of links(graph, id)) {
          if (!reached.has(to)) {
            reached.add(to);
            grown = true;
          }
        }
      }
    }
    expect(reached.size).toBe(graph.nodes.length);
    expect(graph.edges.filter((e) => e[2] === "stairs")).toHaveLength(1);
    expect(graph.edges.filter((e) => e[2] === "door")).toHaveLength(1);
  });

  it("lets an arrow key reach every place next door, and no arrow leads anywhere else", () => {
    for (const node of graph.nodes) {
      const state = { ...start("arrive", graph), node: node.id };
      const next = links(graph, node.id).map((l) => l.to);
      const byArrow = (["up", "down", "left", "right"] as const).map((dir) => neighbourInDirection(state, graph, dir));
      for (const to of byArrow) if (to) expect(next, node.id).toContain(to);
      for (const to of next) expect(byArrow, `${node.id} to ${to}`).toContain(to);
    }
  });

  it("never lights the shrine", () => {
    const shrine = houseOfJars.fixtures.find((f) => f.type === "shrine")!;
    expect(graph.lights.length).toBeGreaterThan(8);
    const [x, y] = [((shrine.box.x0 + shrine.box.x1) / 2) * PLAN_SCALE + 14, (houseOfJars.depth - (shrine.box.y0 + shrine.box.y1) / 2) * PLAN_SCALE];
    for (const [lx, ly] of graph.lights) expect(Math.hypot(lx - x, ly - (y - graph.floors[0]!.crop[1]))).toBeGreaterThan(20);
  });
});

describe("Find your pod: the errands", () => {
  it.each(ERRAND_ORDER)("can do %s without a nudge (breadth-first search)", (errand) => {
    const path = solve(errand, graph);
    expect(path).not.toBeNull();
    let state = start(errand, graph);
    for (const option of path!) state = play(state, option.move, graph).state;
    expect(isDone(state)).toBe(true);
    expect(lamps(state)).toBe(3);
    expect(steps(state).every((s) => s.done)).toBe(true);
  });

  it("walks the first errand the way the house's arrival walk goes", () => {
    const { state, said, nudges } = walk(start("arrive", graph), [
      "Go in through the glass door",
      "Go to the café",
      "Go to the front desk",
      "Check in: passport and deposit",
      "Go to the luggage space by the front desk",
      "Go to the foot of the stairs",
      "Take your shoes off",
      "Go up the stairs",
      "Go to the shoe cubbies",
      "Leave your shoes in a cubby",
      "Go into Dorm H",
      "Go to the aisle, by the door",
      "Go to pods H15 and H12",
      `Climb into ${YOUR_POD}: lower bunk`,
    ]);
    expect(nudges).toEqual([]);
    expect(isDone(state)).toBe(true);
    expect(said).toContain(graph.says["check-in"]);
    expect(said.join(" ")).toContain("isn’t 13: the house skips 4, 13 and 14, so no guest is given an unlucky bed.");
    expect(state.clock).toBe(ERRANDS.arrive.clock + 14);
  });

  it("nudges with the rule when a guest goes upstairs before checking in or in shoes, and never moves them", () => {
    const before = walk(start("arrive", graph), ["Go in through the glass door", "Go to the café", "Go to the front desk", "Go to the luggage space by the front desk", "Go to the foot of the stairs"]).state;
    const up = options(before, graph).find((o) => o.label === "Go up the stairs")!;
    const first = play(before, up.move, graph);
    expect(first.nudge).toBe("registered-guests-upstairs");
    expect(first.state.node).toBe(before.node);
    expect(first.say).toBe(`${graph.rules["registered-guests-upstairs"].rule} ${graph.rules["registered-guests-upstairs"].why}`);
    const checkedIn = { ...first.state, checkedIn: true };
    const second = play(checkedIn, up.move, graph);
    expect(second.nudge).toBe("no-shoes-upstairs");
    expect(lamps(second.state)).toBe(1);
    expect(lamps({ ...second.state, nudges: 5 })).toBe(1);
  });

  it("keeps the door locked at 23:50 until you knock", () => {
    const late = start("late", graph);
    const inside: Move = { kind: "go", to: "entrance" };
    expect(play(late, inside, graph).nudge).toBe("front-door-locked");
    const knocked = play(late, { kind: "act", act: "knock" }, graph).state;
    expect(knocked.doorOpen).toBe(true);
    expect(play(knocked, inside, graph).nudge).toBeUndefined();
    expect(nextTask(late, graph)).toBe("knock on the glass door");
  });

  it("nudges when you pack in the dorm, put shoes on upstairs or leave without checking out", () => {
    const early = start("early", graph);
    expect(nodeOf(graph, early.node).pods).toContain(YOUR_POD);
    expect(play(early, { kind: "act", act: "pack-here" }, graph).nudge).toBe("pack-downstairs");
    const path = solve("early", graph)!;
    let state = early;
    for (const option of path.slice(0, -1)) {
      if (option.move.kind === "act" && option.move.act === "check-out") continue;
      state = play(state, option.move, graph).state;
    }
    expect(play(state, path.at(-1)!.move, graph).nudge).toBe("leaving-before-eight");
    const cubbies = { ...early, node: "cubbies" };
    expect(play(cubbies, { kind: "act", act: "shoes-on-here" }, graph).nudge).toBe("no-shoes-upstairs");
  });

  it("opens the front door at 07:00 on its own", () => {
    const early = { ...start("early", graph), node: "entrance", shoes: "on" as const, bag: "packed" as const, checkedOut: true, clock: 6 * 60 + 59 };
    expect(play(early, { kind: "go", to: "terrace" }, graph).nudge).toBe("front-door-locked");
    const later = play(early, { kind: "go", to: "cafe" }, graph);
    expect(later.say).toContain("07:00: the front door is unlocked");
    const out = play({ ...later.state, node: "entrance" }, { kind: "go", to: "terrace" }, graph);
    expect(out.nudge).toBeUndefined();
    expect(isDone(out.state)).toBe(true);
  });

  it("offers only moves the engine accepts, each once", () => {
    for (const errand of ERRAND_ORDER) {
      for (const node of graph.nodes) {
        const state = { ...start(errand, graph), node: node.id };
        const all = options(state, graph);
        expect(new Set(all.map((o) => o.key)).size, node.id).toBe(all.length);
        for (const option of all) expect(play(state, option.move, graph).say, `${errand} ${node.id} ${option.key}`).not.toMatch(/can’t be done|isn’t one step/);
      }
    }
  });
});
