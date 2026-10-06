/*
 * The house in words: a plain description of every floor, room and thing in
 * the model, with the house rules placed where they apply. It is written for
 * Shadow and for any assistant that needs to know the house: where things
 * are, how many there are, what is only assumed, and which rule applies
 * where. npm run house:render writes it to docs/house-context.md.
 */
import { houseOfJars } from "./house-of-jars";
import { placedHouseRules, rulesAt, type ResolvedRule } from "./rules";
import type { Area, Fixture, FixtureType, HouseModel } from "./types";

/** What each kind of thing is called, one and many; null for parts of the building that are not worth listing. */
const NAMES: Readonly<Record<FixtureType, readonly [string, string] | null>> = {
  "ac-indoor": ["air-conditioner", "air-conditioners"],
  "ac-outdoor": ["outdoor air-conditioning unit", "outdoor air-conditioning units"],
  awning: null,
  "back-counter": ["back counter", "back counters"],
  basin: ["basin", "basins"],
  bench: ["bench", "benches"],
  "bench-seat": ["built-in bench seat", "built-in bench seats"],
  bin: ["bin", "bins"],
  chair: ["chair", "chairs"],
  "ceiling-light": ["ceiling light", "ceiling lights"],
  "coffee-machine": ["coffee machine", "coffee machines"],
  cupboard: ["cupboard", "cupboards"],
  counter: ["counter", "counters"],
  dehumidifier: ["dehumidifier", "dehumidifiers"],
  door: ["glass front door", "glass front doors"],
  "door-leaf": null,
  "door-panel": ["closet door", "closet doors"],
  doormat: ["doormat", "doormats"],
  extinguisher: ["fire extinguisher", "fire extinguishers"],
  fan: ["fan", "fans"],
  "fan-ceiling": ["ceiling fan", "ceiling fans"],
  "fan-exhaust": ["exhaust fan", "exhaust fans"],
  "fridge-drinks": ["drinks fridge", "drinks fridges"],
  fridge: ["fridge", "fridges"],
  "fuse-box": ["electrical panel", "electrical panels"],
  "hair-dryer": ["hair dryer", "hair dryers"],
  "hand-dryer": ["hand dryer", "hand dryers"],
  "jar-big": ["big clay jar", "big clay jars"],
  "jar-clay": ["clay jar", "clay jars"],
  "kitchen-counter": ["kitchen counter", "kitchen counters"],
  "lattice-door": ["lattice door", "lattice doors"],
  ladder: null,
  "ladder-wall": ["ladder to the ceiling hatch", "ladders to the ceiling hatch"],
  locker: ["locker", "lockers"],
  "luggage-space": ["space for luggage", "spaces for luggage"],
  mirror: ["mirror", "mirrors"],
  "pendant-lamp": ["pendant lamp", "pendant lamps"],
  "picture-frame": ["framed photograph", "framed photographs"],
  plant: ["plant", "plants"],
  pod: ["pod", "pods"],
  post: null,
  printer: ["printer", "printers"],
  rack: ["steel shelving rack", "steel shelving racks"],
  shelves: ["set of open shelves", "sets of open shelves"],
  "shoe-cubbies": ["shoe cubby", "shoe cubbies"],
  shower: ["shower", "showers"],
  shrine: ["shrine with offerings", "shrines with offerings"],
  "sign-hanging": ["hanging House of Jars sign", "hanging House of Jars signs"],
  "sign-hostel": ['"hostel" sign', '"hostel" signs'],
  "sign-plate": null,
  sink: ["sink", "sinks"],
  "sink-small": ["small sink", "small sinks"],
  "staff-lockers": ["set of staff lockers", "sets of staff lockers"],
  stairs: ["flight of stairs", "flights of stairs"],
  "stool-bar": ["bar stool", "bar stools"],
  "stool-low": ["low stool", "low stools"],
  table: ["low table", "low tables"],
  "table-small-round": ["small round table", "small round tables"],
  "table-tall-round": ["tall round table", "tall round tables"],
  toilet: ["toilet", "toilets"],
  "toilet-stall": ["toilet stall", "toilet stalls"],
  "track-light": ["track light", "track lights"],
  vanity: ["vanity", "vanities"],
  "wall-lamp": ["wall lamp", "wall lamps"],
  "water-dispenser": ["water dispenser", "water dispensers"],
  "water-tank": ["water tank", "water tanks"],
  window: ["window", "windows"],
  "window-ledge": ["window ledge to sit at", "window ledges to sit at"],
};

/** How many of a thing a fixture stands for: a grid of cubbies counts each cubby. */
function units(f: Fixture): number {
  return f.type === "shoe-cubbies" && f.grid ? f.grid.cols * f.grid.rows : 1;
}

/** "H01 to H12" for labels that run in order, otherwise the labels listed. */
function labelRange(labels: readonly string[]): string {
  const sorted = [...labels].sort();
  if (sorted.length <= 2) return sorted.join(" and ");
  const range = `${sorted[0]} to ${sorted[sorted.length - 1]}`;
  // Numbers the house skips (no 4, 13 or 14 on the beds) are said, so nobody looks for them.
  const parts = sorted.map((l) => /^([A-Z]+)(\d+)$/.exec(l));
  const letter = parts[0]?.[1];
  if (!letter || parts.some((x) => x?.[1] !== letter)) return range;
  const width = parts[0]![2]!.length;
  const have = new Set(parts.map((x) => Number(x![2])));
  const missing: string[] = [];
  for (let n = Math.min(...have); n <= Math.max(...have); n++) if (!have.has(n)) missing.push(`${letter}${String(n).padStart(width, "0")}`);
  if (missing.length === 0) return range;
  const list = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} or ${missing[missing.length - 1]}`;
  return `${range}, with no ${list}`;
}

/** Things hung on the outside of the front wall belong to the street, not to the room behind it. */
const outdoors = (f: Fixture) => f.type === "ac-outdoor";

/** Things counted by kind: "3 bar stools, 14 pods (H01 to H17, with no H04, H13 or H14)". */
function counted(fixtures: readonly Fixture[]): string {
  const byType = new Map<FixtureType, Fixture[]>();
  for (const f of fixtures) {
    if (!NAMES[f.type]) continue;
    byType.set(f.type, [...(byType.get(f.type) ?? []), f]);
  }
  const parts = [...byType.entries()].map(([type, list]) => {
    const [one, many] = NAMES[type]!;
    const n = list.reduce((sum, f) => sum + units(f), 0);
    const labels = type === "pod" || type === "locker" ? list.map((f) => f.label).filter((l): l is string => Boolean(l)) : [];
    return `${n} ${n === 1 ? one : many}${labels.length > 0 ? ` (${labelRange(labels)})` : ""}`;
  });
  return parts.sort((a, b) => a.replace(/^\d+ /, "").localeCompare(b.replace(/^\d+ /, ""))).join(", ");
}

/** The things in one area. */
function contents(model: HouseModel, area: Area): string {
  return counted(model.fixtures.filter((f) => f.area === area.id && !outdoors(f)));
}

/** A note split into its sentences. */
const sentences = (note: string) => note.split(/(?<=\.)\s+(?=[A-Z"])/);

/**
 * What is assumed in an area or its things, sentence by sentence, each said
 * once; sentences the floor's own note already says are left out.
 */
function assumed(model: HouseModel, area: Area): string[] {
  const floorNote = model.floors.find((f) => f.id === area.floor)?.note;
  const said = new Set(floorNote ? sentences(floorNote) : []);
  const out: string[] = [];
  for (const x of [area, ...model.fixtures.filter((f) => f.area === area.id && !outdoors(f))]) {
    if (x.confirmed !== false || !x.note) continue;
    for (const sentence of sentences(x.note)) {
      if (said.has(sentence)) continue;
      said.add(sentence);
      out.push(sentence);
    }
  }
  return out;
}

function ruleLine(rule: ResolvedRule): string {
  return `- ${rule.rule} ${rule.why} (${rule.where})`;
}

/** The whole house in Markdown, floor by floor, with the rules where they apply. */
export function describeHouse(model: HouseModel = houseOfJars): string {
  const all = placedHouseRules();
  const lines: string[] = [
    `# ${model.name}: the house in words`,
    "",
    "Generated by `npm run house:render` from the house model in `lib/house/`; do not edit it by hand.",
    "Counts come from the owner's walk on 5 October 2026 and are exact. Positions are approximate. What was not seen is listed under \"Assumed\".",
    "Floors are named as the house names them: the Ground floor (the lobby), Floor 1 and Floor 2.",
  ];

  const section = (area: Area, depth: string) => {
    lines.push("", `${depth} ${area.name}`, "");
    const things = contents(model, area);
    if (things) lines.push(`In it: ${things}.`);
    // A part of a room (the front desk in the café) lists only the rules that name it, not the room's own.
    const inherited = area.parent ? new Set(rulesAt(model, area.parent, all).map((r) => r.id)) : new Set<string>();
    const here = rulesAt(model, area.id, all).filter((r) => (r.scope !== "house" || r.places.length > 0) && !inherited.has(r.id));
    if (here.length > 0) lines.push("", "Rules here:", ...here.map(ruleLine));
    const notes = assumed(model, area);
    if (notes.length > 0) lines.push("", "Assumed:", ...notes.map((n) => `- ${n}`));
  };

  for (const floor of model.floors) {
    lines.push("", `## ${floor.name}`);
    if (floor.confirmed === false && floor.note) lines.push("", floor.note);
    for (const area of model.areas.filter((a) => a.floor === floor.id && a.kind !== "outside" && !a.parent)) {
      section(area, "###");
      for (const sub of model.areas.filter((a) => a.parent === area.id)) section(sub, "####");
    }
  }

  lines.push("", "## Outside");
  for (const area of model.areas.filter((a) => a.kind === "outside")) section(area, "###");
  const onFront = counted(model.fixtures.filter(outdoors));
  if (onFront) lines.push("", "### On the front wall", "", `${onFront}, at Floor 1's height.`);

  if (model.customs?.length) lines.push("", "## House customs", "", ...model.customs.map((c) => `- ${c}`));
  lines.push("", "## Rules everywhere indoors", "", ...all.filter((r) => r.scope === "house").map(ruleLine));
  lines.push("", "## Rules about the stay", "", ...all.filter((r) => r.scope === "stay").map(ruleLine));

  // The walks, step by step: where each step happens, what happens there, and the rules met on the way.
  lines.push("", "## Walks through the house");
  for (const route of model.routes) {
    lines.push("", `### ${route.name}`);
    const meta = [route.who === "staff" ? "For the team" : route.who === "guest" ? "For guests" : undefined, route.when].filter(Boolean);
    if (meta.length > 0) lines.push("", `${meta.join(". ")}.`);
    const steps = route.stops ?? [];
    if (steps.length === 0) continue;
    lines.push("");
    steps.forEach((step, i) => {
      const where = step.area ? model.areas.find((a) => a.id === step.area)?.name : undefined;
      const rules = step.rules?.length ? ` (rules: ${step.rules.map((id) => id.replaceAll("-", " ")).join(", ")})` : "";
      lines.push(`${i + 1}. ${step.label}${where && where !== step.label ? `, ${where}` : ""}: ${step.does ?? ""}${rules}`.replace(/: $/, "."));
    });
  }
  return `${lines.join("\n")}\n`;
}
