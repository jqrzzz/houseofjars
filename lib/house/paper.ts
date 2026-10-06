/**
 * The paper stage: the House Model in its paper outfit, cut into layers that share one frame, and the
 * overlays a page lays over them in the same coordinates (a walk's thread and its stops, the lights, the
 * anchors of labels and hotspots, a pod's curtain). See docs/HOUSE_MODEL.md.
 *
 * Every layer has the same integer viewBox, big enough for every floor lifted 2.5 m apart and for the
 * street front. The floors are drawn stacked; a page lifts a floor by liftPerLevel x its level (in viewBox
 * units). Server code and scripts only: never import lib/house into a "use client" file.
 */
import { S, type Vec2, type Vec3, escapeXml, isoProjection, num } from "./geometry";
import { PAPER_POD } from "./fixtures";
import { houseOfJars } from "./house-of-jars";
import { FACADE_CUT, PLAN_SCALE, STREET_DEPTH, areaRects, renderCutaway, renderPlan, renderStreet } from "./render";
import type { Box3, Fixture, Floor, FloorId, Route } from "./types";

export type PaperLayerId = "street" | "ground" | "ground-front" | "floor1" | "floor2";

/** The layers, bottom to top as a page stacks them: the front pieces cover the floors above, the street covers all. */
export const PAPER_LAYERS: readonly PaperLayerId[] = ["ground", "floor1", "floor2", "ground-front", "street"];

export interface StageGeometry {
  readonly viewBox: readonly [number, number, number, number];
  /** How far a page lifts each floor per level, in viewBox units: 2.5 m x 36 px = 90. */
  readonly liftPerLevel: number;
  /** The frame (viewBox units) that holds these floors lifted apart, the ground floor's front pieces with it. */
  readonly crop: (floors: readonly FloorId[]) => readonly [number, number, number, number];
}

/** A step of a walk, placed on the stage. */
export interface StageStop {
  label: string;
  floor: FloorId;
  /** Where its ring is, in viewBox units with the floors stacked. */
  x: number;
  y: number;
  /** How far along the walk it is, 0 to 1 (by the thread's drawn length). */
  at: number;
  does?: string;
  rules: readonly string[];
  area?: string;
}

/** A walk's thread, ready to inline: one small SVG per floor, moved with its floor's layer. */
export interface ThreadLayer {
  /** Per floor: <svg aria-hidden> holding <path class="th" pathLength="1"> in walking order and a <circle data-stop data-at> per stop. */
  floors: Partial<Record<FloorId, string>>;
  /** The stairs between floors, drawn with the floors lifted apart: <svg aria-hidden> of <path class="tl" pathLength="1">, or "". */
  link: string;
  stops: readonly StageStop[];
  /** The share of the walk each floor's path draws, [from, to]. */
  shares: Partial<Record<FloorId, readonly [number, number]>>;
}

/** A light of the house the stage can light (a glow disc), never the shrine. */
export interface LightPoint {
  id: string;
  floor: FloorId;
  x: number;
  y: number;
  /** The glow's radius, viewBox units. */
  r: number;
  kind: "pendant" | "wall-lamp" | "window" | "jar" | "sign" | "fridge";
  /** Its place in walking order on the arrival walk (0 first); lights off that walk follow, floor by floor. */
  order: number;
}

const model = houseOfJars;
const EXPLODE = 2.5;
const LIFT = EXPLODE * S;
const proj = isoProjection(model.depth);
const PREFIX = /^[A-Za-z_][A-Za-z0-9_-]*$/;

function floorOf(id: FloorId): Floor {
  const floor = model.floors.find((f) => f.id === id);
  if (!floor) throw new Error(`No floor ${id}`);
  return floor;
}

const viewBoxOf = (svg: string) => /viewBox="([^"]+)"/.exec(svg)![1]!.split(" ").map(Number) as [number, number, number, number];

function unionFrames(frames: readonly (readonly [number, number, number, number])[]): [number, number, number, number] {
  const x0 = Math.min(...frames.map((f) => f[0]));
  const y0 = Math.min(...frames.map((f) => f[1]));
  const x1 = Math.max(...frames.map((f) => f[0] + f[2]));
  const y1 = Math.max(...frames.map((f) => f[1] + f[3]));
  return [x0, y0, x1 - x0, y1 - y0];
}

// ---------------------------------------------------------------------------
// The layers

const FRONT_TYPES = new Set<string>(["awning", "post", "sign-hostel", "sign-hanging"]);

/**
 * The ground floor's pieces in front of the facade that a page must draw over the floors above (the
 * ground-front layer): the awning on its posts, its signs, and the small jar for cigarette butts.
 */
export function isFrontPiece(f: Fixture): boolean {
  return f.floor === "ground" && f.box.y1 <= 0 && (FRONT_TYPES.has(f.type) || f.id === "jar-butts");
}

const frontOnly = { fixtures: isFrontPiece, fixturesOnly: true, groupId: "floor-ground-front" } as const;

let stage: StageGeometry | undefined;

/** The stage's one frame, the lift per level and the crops; computed once from the model. */
export function stageGeometry(): StageGeometry {
  if (stage) return stage;
  const viewBox = unionFrames([
    viewBoxOf(renderStreet({ outfit: "paper", theme: "day" })),
    viewBoxOf(renderCutaway({ outfit: "paper", theme: "day", fitExplode: EXPLODE })),
    viewBoxOf(renderCutaway({ outfit: "paper", theme: "day", floors: ["ground"] }, frontOnly)),
  ]);
  const crops = new Map<string, readonly [number, number, number, number]>();
  const crop = (floors: readonly FloorId[]) => {
    if (floors.length === 0) throw new Error("stageGeometry().crop: no floors");
    const wanted = model.floors.filter((f) => floors.includes(f.id)).map((f) => f.id);
    if (wanted.length !== new Set(floors).size) throw new Error(`stageGeometry().crop: unknown floor in ${floors.join(", ")}`);
    const key = wanted.join(" ");
    const known = crops.get(key);
    if (known) return known;
    const frames = [viewBoxOf(renderCutaway({ outfit: "paper", theme: "day", floors: wanted, explode: EXPLODE }))];
    if (wanted.includes("ground")) frames.push(viewBoxOf(renderCutaway({ outfit: "paper", theme: "day", floors: ["ground"] }, frontOnly)));
    const [x, y, w, h] = unionFrames(frames);
    // Inside the stage's frame.
    const x0 = Math.max(x, viewBox[0]);
    const y0 = Math.max(y, viewBox[1]);
    const out = [x0, y0, Math.min(x + w, viewBox[0] + viewBox[2]) - x0, Math.min(y + h, viewBox[1] + viewBox[3]) - y0] as const;
    crops.set(key, out);
    return out;
  };
  stage = { viewBox, liftPerLevel: LIFT, crop };
  return stage;
}

const pods = (floor: FloorId) => model.fixtures.filter((f) => f.floor === floor && f.type === "pod").length;
const areaNames = (floor: FloorId) =>
  model.areas
    .filter((a) => a.floor === floor && !a.parent)
    .map((a) => a.name)
    .join(", ");

const LAYER_TEXT: Record<PaperLayerId, () => { title: string; desc: string }> = {
  street: () => ({
    title: `${model.name} from the street, in paper`,
    desc: `The ${model.name} shophouse from the street at the front right, cut from paper: the orange-red facade with its big arch, the glass door and grid window under the wooden awning with its "hostel" sign, and the tiled terrace; the side wall and roof are cropped ${STREET_DEPTH} m back, where the cutaway takes over.`,
  }),
  ground: () => ({
    title: `${model.name}: the ground floor, in paper`,
    desc: `The ground floor cut open from the front right, in paper: ${areaNames("ground")}. The awning, its posts and the signs are in their own layer, in front.`,
  }),
  "ground-front": () => ({
    title: `${model.name}: the awning and signs, in paper`,
    desc: "The pieces in front of the ground floor's facade, in paper: the wooden awning on its two posts with its \"hostel\" sign, the hanging board, and the small jar for cigarette butts.",
  }),
  floor1: () => ({
    title: `${model.name}: Floor 1, in paper`,
    desc: `Floor 1 cut open from the front right, in paper: ${areaNames("floor1")}, with ${pods("floor1")} pods.`,
  }),
  floor2: () => ({
    title: `${model.name}: Floor 2, in paper`,
    desc: `Floor 2 cut open from the front right, in paper and faded: drawn as a copy of Floor 1, not yet photographed (${areaNames("floor2")}).`,
  }),
};

const layerCache = new Map<string, string>();

/** One layer of the paper stage, in Day or Evening colours, in the stage's frame. */
export function renderPaperLayer(layer: PaperLayerId, theme: "day" | "evening"): string {
  const key = `${layer} ${theme}`;
  const cached = layerCache.get(key);
  if (cached) return cached;
  const { viewBox } = stageGeometry();
  const { title, desc } = LAYER_TEXT[layer]();
  const common = { outfit: "paper", theme, title } as const;
  const viewBoxLean = { viewBox, lean: true } as const;
  let svg: string;
  switch (layer) {
    case "street":
      svg = renderStreet(common, { ...viewBoxLean, desc });
      break;
    case "ground":
      svg = renderCutaway({ ...common, floors: ["ground"] }, { ...viewBoxLean, desc, fixtures: (f) => !isFrontPiece(f) });
      break;
    case "ground-front":
      svg = renderCutaway({ ...common, floors: ["ground"] }, { ...frontOnly, ...viewBoxLean, desc });
      break;
    case "floor1":
      svg = renderCutaway({ ...common, floors: ["floor1"] }, { ...viewBoxLean, desc });
      break;
    case "floor2":
      svg = renderCutaway({ ...common, floors: ["floor2"] }, { ...viewBoxLean, desc, dim: true });
      break;
    default:
      throw new Error(`No paper layer ${String(layer)}`);
  }
  layerCache.set(key, svg);
  return svg;
}

/** Where a layer is served: "/house/paper-floor1-day.svg". */
export function paperLayerSrc(layer: PaperLayerId, theme: "day" | "evening"): string {
  return `/house/paper-${layer}-${theme}.svg`;
}

// ---------------------------------------------------------------------------
// Overlays: points and shapes in the stage's coordinates (floors stacked)

const round = (v: number, places: number) => {
  const k = 10 ** places;
  const r = Math.round(v * k) / k;
  return r === 0 ? 0 : r;
};

/** A model point (z above its floor) on the stage, floors stacked. */
function stagePoint(floor: Floor, [x, y, z]: Vec3): Vec2 {
  return proj.point([x, y, floor.z + z]);
}

function routeById(id: string): Route {
  const route = model.routes.find((r) => r.id === id);
  if (!route) throw new Error(`No route "${id}" in the model`);
  return route;
}

function fixtureById(id: string): Fixture {
  const bare = id.replace(/^fx-/, "");
  const fx = model.fixtures.find((f) => f.id === bare);
  if (!fx) throw new Error(`No fixture "${bare}" in the model`);
  return fx;
}

/** A walk drawn on the stage: each segment's points projected, with the distance along the whole walk. */
interface Walk {
  readonly pieces: readonly { readonly floor: FloorId; readonly pts: readonly Vec2[]; readonly from: number }[];
  readonly total: number;
}

function walkOf(route: Route, floors?: readonly FloorId[]): Walk {
  const pieces: { floor: FloorId; pts: Vec2[]; from: number }[] = [];
  let total = 0;
  for (const segment of route.segments) {
    if (floors && !floors.includes(segment.floor)) continue;
    const floor = floorOf(segment.floor);
    const pts = segment.points.map(([x, y, z]) => stagePoint(floor, [x!, y!, (z ?? 0) + 0.04]));
    pieces.push({ floor: segment.floor, pts, from: total });
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  }
  return { pieces, total };
}

/**
 * The nearest place on a walk's stretches on a floor to a point, at or after `after` (a distance along the
 * walk): the first that comes within half a pixel of the nearest, so a walk that passes a spot twice finds
 * it the first time after the previous step.
 */
function nearestOnWalk(walk: Walk, floor: FloorId, target: Vec2, after = 0): { pos: number; pt: Vec2; dist: number } | undefined {
  const hits: { pos: number; pt: Vec2; dist: number }[] = [];
  for (const piece of walk.pieces) {
    if (piece.floor !== floor) continue;
    let at = piece.from;
    for (let i = 1; i < piece.pts.length; i++) {
      const a = piece.pts[i - 1]!;
      const b = piece.pts[i]!;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len > 1e-9) {
        const t = Math.max(0, Math.min(1, ((target[0] - a[0]) * (b[0] - a[0]) + (target[1] - a[1]) * (b[1] - a[1])) / (len * len)));
        const pt: Vec2 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        if (at + len * t >= after - 1e-6) hits.push({ pos: at + len * t, pt, dist: Math.hypot(pt[0] - target[0], pt[1] - target[1]) });
      }
      at += len;
    }
  }
  if (hits.length === 0) return undefined;
  const best = Math.min(...hits.map((h) => h.dist));
  return hits.find((h) => h.dist <= best + 0.5);
}

const pathD = (pts: readonly Vec2[]) => pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${num(x)} ${num(y)}`).join("");

function overlaySvg(floor: string | undefined, inner: string): string {
  const [x, y, w, h] = stageGeometry().viewBox;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" aria-hidden="true" focusable="false"${floor ? ` data-floor="${floor}"` : ""} fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

/**
 * A walk's thread for the stage: per floor, its path in walking order (pathLength 1, so a page draws it on
 * with stroke-dashoffset) and its stops' rings (data-stop, data-at); the stairs between floors in the lifted
 * pose; the stops with their text; each floor's share of the walk. `curtain` (a pod's id) adds that pod's
 * curtain, a unit square mapped onto the side of the pod the camera sees, for a page to slide closed.
 * Strokes and fills come from the page (var(--thread)); nothing here is themed.
 */
export function renderThreadLayer(routeId: string, o: { idPrefix: string; floors?: readonly FloorId[]; curtain?: string }): ThreadLayer {
  if (o.idPrefix !== "" && !PREFIX.test(o.idPrefix)) throw new Error(`idPrefix "${o.idPrefix}" must start with a letter or _ and hold only letters, digits, _ and -`);
  const route = routeById(routeId);
  for (const f of o.floors ?? []) floorOf(f);
  const walk = walkOf(route, o.floors);
  const total = walk.total || 1;
  const visited = model.floors.filter((f) => walk.pieces.some((p) => p.floor === f.id)).map((f) => f.id);

  const stops: StageStop[] = [];
  let after = 0;
  let lastFloor: FloorId | undefined;
  for (const stop of route.stops ?? []) {
    if (!visited.includes(stop.floor)) continue;
    const target = stagePoint(floorOf(stop.floor), [stop.at[0], stop.at[1], 0.04]);
    const hit = nearestOnWalk(walk, stop.floor, target, lastFloor === stop.floor || lastFloor === undefined ? after : 0) ?? nearestOnWalk(walk, stop.floor, target);
    if (!hit) continue;
    after = hit.pos;
    lastFloor = stop.floor;
    stops.push({
      label: stop.label,
      floor: stop.floor,
      x: round(hit.pt[0], 1),
      y: round(hit.pt[1], 1),
      at: round(hit.pos / total, 3),
      ...(stop.does ? { does: stop.does } : {}),
      rules: stop.rules ?? [],
      ...(stop.area ? { area: stop.area } : {}),
    });
  }

  const shares: Partial<Record<FloorId, readonly [number, number]>> = {};
  const floors: Partial<Record<FloorId, string>> = {};
  const curtainFx = o.curtain === undefined ? undefined : fixtureById(o.curtain);
  const curtainFloors = curtainFx ? [curtainFx.floor] : [];
  for (const floor of model.floors.map((f) => f.id).filter((id) => visited.includes(id) || curtainFloors.includes(id))) {
    const pieces = walk.pieces.filter((p) => p.floor === floor);
    let inner = "";
    if (curtainFx && curtainFx.floor === floor) {
      const face = curtainFx.faces === "-y" ? "front" : "right";
      inner += `<g data-curtain="${escapeXml(curtainFx.id)}" stroke="none" transform="matrix(${faceMatrix(curtainFx.id, face).join(" ")})"><rect width="1" height="1"/></g>`;
    }
    if (pieces.length > 0) {
      const last = pieces[pieces.length - 1]!;
      let end = last.from;
      for (let i = 1; i < last.pts.length; i++) end += Math.hypot(last.pts[i]![0] - last.pts[i - 1]![0], last.pts[i]![1] - last.pts[i - 1]![1]);
      shares[floor] = [round(pieces[0]!.from / total, 3), round(end / total, 3)];
      inner += `<path id="${escapeXml(o.idPrefix)}th-${floor}" class="th" pathLength="1" d="${pieces.map((p) => pathD(p.pts)).join("")}"/>`;
      for (const s of stops.filter((x) => x.floor === floor)) inner += `<circle data-stop="${escapeXml(s.label)}" data-at="${s.at}" cx="${num(s.x)}" cy="${num(s.y)}" r="5"/>`;
    }
    floors[floor] = overlaySvg(floor, inner);
  }

  // The stairs between floors: from the top of one floor's stretch to the start of the next, each lifted with its floor.
  let links = "";
  for (let i = 0; i + 1 < walk.pieces.length; i++) {
    const a = walk.pieces[i]!;
    const b = walk.pieces[i + 1]!;
    if (a.floor === b.floor) continue;
    const pa = a.pts[a.pts.length - 1]!;
    const pb = b.pts[0]!;
    const la = floorOf(a.floor).level * LIFT;
    const lb = floorOf(b.floor).level * LIFT;
    links += `<path class="tl" pathLength="1" data-from="${a.floor}" data-to="${b.floor}" d="M${num(pa[0])} ${num(pa[1] - la)}L${num(pb[0])} ${num(pb[1] - lb)}"/>`;
  }
  return { floors, link: links ? overlaySvg(undefined, links) : "", stops, shares };
}

/** Where a light's glow sits on its fixture, and how big it is; undefined for what the stage does not light. */
function lightOf(f: Fixture): Omit<LightPoint, "order"> | undefined {
  const floor = floorOf(f.floor);
  const b = f.box;
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const at = (pt: Vec3, r: number, kind: LightPoint["kind"]) => {
    const [x, y] = stagePoint(floor, pt);
    return { id: f.id, floor: f.floor, x: round(x, 1), y: round(y, 1), r, kind };
  };
  switch (f.type) {
    case "pendant-lamp":
      return at([cx, cy, b.z0 + 0.02], 16, "pendant");
    case "wall-lamp":
      return at([cx, cy, (b.z0 + b.z1) / 2], 13, "wall-lamp");
    case "jar-big":
      return at([cx, cy, b.z1], 16, "jar");
    case "jar-clay": {
      // The landing jar (one that stands on the stairs); not the corridor's jars or the butts jar.
      const host = model.fixtures.find((g) => g.id === f.mountedOn);
      return host?.type === "stairs" ? at([cx, cy, b.z1], 11, "jar") : undefined;
    }
    case "sign-hostel":
    case "sign-hanging":
      return at([cx, b.y0, (b.z0 + b.z1) / 2], f.type === "sign-hostel" ? 18 : 14, "sign");
    case "fridge-drinks":
      return at([b.x1, cy, (b.z0 + b.z1) / 2], 20, "fridge");
    case "window": {
      // Its glass where the cutaway shows it, below the facade's cut; a window all above the cut is not lit.
      const sill = f.variant === "shopfront" ? 0.95 : 0;
      const z0 = b.z0 + sill;
      const z1 = Math.min(b.z1, FACADE_CUT);
      if (z1 - z0 < 0.25) return undefined;
      return at([cx, b.y0, (z0 + z1) / 2], Math.round(Math.min(22, Math.max(10, (b.x1 - b.x0) * S * 0.45))), "window");
    }
    case "door":
      if (b.y1 > 0) return undefined;
      return at([cx, b.y0, (b.z0 + Math.min(b.z1, FACADE_CUT)) / 2], 16, "window");
    default:
      return undefined;
  }
}

let lights: readonly LightPoint[] | undefined;

/**
 * The house's own lights for the stage's glow discs: the café's pendants, the wall lamps, the windows and
 * glass door below the facade's cut, the big jar and the landing jar, the signs and the drinks fridge. Never
 * the staff room's shrine. Numbered in walking order on the arrival walk; lights off that walk follow,
 * floor by floor, front to back.
 */
export function lightPoints(floors?: readonly FloorId[]): readonly LightPoint[] {
  if (!lights) {
    const arrival = walkOf(routeById("arrival"));
    const found = model.fixtures
      .filter((f) => f.type !== "shrine")
      .map((f) => ({ f, light: lightOf(f) }))
      .filter((x): x is { f: Fixture; light: Omit<LightPoint, "order"> } => x.light !== undefined)
      .map(({ f, light }) => ({ f, light, pos: nearestOnWalk(arrival, f.floor, [light.x, light.y])?.pos }));
    const level = (id: FloorId) => floorOf(id).level;
    found.sort((a, b) =>
      a.pos !== undefined && b.pos !== undefined
        ? a.pos - b.pos || a.f.id.localeCompare(b.f.id)
        : a.pos !== undefined
          ? -1
          : b.pos !== undefined
            ? 1
            : level(a.f.floor) - level(b.f.floor) || a.f.box.y0 - b.f.box.y0 || a.f.id.localeCompare(b.f.id),
    );
    lights = found.map(({ light }, order) => ({ ...light, order }));
  }
  const all = lights;
  if (!floors) return all;
  for (const f of floors) floorOf(f);
  return all.filter((l) => floors.includes(l.floor)).map((l, order) => ({ ...l, order }));
}

/** Where an area ("area-cafe") or a fixture ("fx-pod-H01") sits on the stage, floors stacked: an area's label anchor, a fixture's middle. */
export function anchorOf(id: string): { floor: FloorId; x: number; y: number } | undefined {
  const areaId = /^area-(.+)$/.exec(id)?.[1];
  if (areaId) {
    const area = model.areas.find((a) => a.id === areaId);
    if (!area) return undefined;
    const [x, y] = stagePoint(floorOf(area.floor), [area.anchor?.x ?? (area.rect.x0 + area.rect.x1) / 2, area.anchor?.y ?? (area.rect.y0 + area.rect.y1) / 2, area.anchor?.z ?? 0]);
    return { floor: area.floor, x: round(x, 1), y: round(y, 1) };
  }
  const fxId = /^fx-(.+)$/.exec(id)?.[1];
  if (fxId) {
    const f = model.fixtures.find((g) => g.id === fxId);
    if (!f) return undefined;
    const b = f.box;
    const [x, y] = stagePoint(floorOf(f.floor), [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2]);
    return { floor: f.floor, x: round(x, 1), y: round(y, 1) };
  }
  return undefined;
}

/**
 * The matrix(a b c d e f) that maps a unit square onto a fixture's face on the stage (floors stacked): the
 * square's x along the face (to the right on screen), its y down. "front" is the face to the street, "right"
 * the face to the right. On a pod it is the opening between its deck, rail and ends, where the curtain hangs.
 */
export function faceMatrix(fixtureId: string, face: "front" | "right"): readonly [number, number, number, number, number, number] {
  const f = fixtureById(fixtureId);
  const floor = floorOf(f.floor);
  let b: Box3 = f.box;
  if (f.type === "pod") {
    const { deck, rail, end } = PAPER_POD;
    b = face === "front" ? { ...b, x0: b.x0 + end, x1: b.x1 - end, z0: b.z0 + deck, z1: b.z1 - rail } : { ...b, y0: b.y0 + end, y1: b.y1 - end, z0: b.z0 + deck, z1: b.z1 - rail };
  }
  const corner = (x: number, y: number, z: number) => stagePoint(floor, [x, y, z]);
  const o = face === "front" ? corner(b.x0, b.y0, b.z1) : corner(b.x1, b.y0, b.z1);
  const u = face === "front" ? corner(b.x1, b.y0, b.z1) : corner(b.x1, b.y1, b.z1);
  const v = face === "front" ? corner(b.x0, b.y0, b.z0) : corner(b.x1, b.y0, b.z0);
  return [round(u[0] - o[0], 2), round(u[1] - o[1], 2), round(v[0] - o[0], 2), round(v[1] - o[1], 2), round(o[0], 2), round(o[1], 2)];
}

const planCache = new Map<string, string>();

/** A paper plan's frame and its areas' shapes, in its own coordinates, for laying highlights and the game over it. */
export function planOverlay(floor: "ground" | "floor1"): { viewBox: readonly [number, number, number, number]; areas: readonly { id: string; d: string }[] } {
  const svg = planCache.get(floor) ?? renderPlan(floor, { outfit: "paper", theme: "day" });
  planCache.set(floor, svg);
  const s = PLAN_SCALE;
  const at = (x: number, y: number) => [x * s, (model.depth - y) * s] as const;
  const areas = model.areas
    .filter((a) => a.floor === floor)
    .map((a) => ({
      id: a.id,
      d: areaRects(a)
        .map((r) => {
          const [x0, y1] = at(r.x0, r.y0);
          const [x1, y0] = at(r.x1, r.y1);
          return `M${num(x0)} ${num(y0)}L${num(x1)} ${num(y0)}L${num(x1)} ${num(y1)}L${num(x0)} ${num(y1)}Z`;
        })
        .join(""),
    }));
  return { viewBox: viewBoxOf(svg), areas };
}

/** Every walk's thread for the stage, as public/house/walks.json holds it (npm run house:render writes it). */
export function walksJson(): string {
  const { viewBox, liftPerLevel } = stageGeometry();
  const routes = Object.fromEntries(
    model.routes.map((r) => [r.id, { name: r.name, ...(r.who ? { who: r.who } : {}), ...(r.when ? { when: r.when } : {}), ...renderThreadLayer(r.id, { idPrefix: `walk-${r.id}-` }) }]),
  );
  return `${JSON.stringify({ viewBox, liftPerLevel, routes })}\n`;
}
