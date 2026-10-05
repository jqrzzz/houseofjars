import type { CSSProperties } from "react";
import {
  PAPER_LAYERS,
  anchorOf,
  faceMatrix,
  lightPoints,
  paperLayerSrc,
  renderPaperLayer,
  renderThreadLayer,
  stageGeometry,
  type PaperLayerId,
  type StageStop,
  type ThreadLayer,
} from "@/lib/house/paper";
import { convexHull } from "@/lib/house/geometry";
import type { FloorId } from "@/lib/house/types";
import { shareAlong, type StageClock } from "@/lib/stage/acts";
import { StageArt, type ArtFloor, type StageArtData } from "./StageArt";
import { StageKeyframes } from "./StageKeyframes";
import type { StageLight } from "./StageLights";
import styles from "./PaperStage.module.css";

export interface StageLabel {
  readonly text: string;
  /** "area-…" or "fx-…", as lib/house/paper's anchorOf() takes. */
  readonly anchor: string;
}

export interface StageSpot {
  /** The photo's number, repeated in the gallery. */
  readonly n: number;
  /** The photo's key in content/photos.ts: the dot links to #photo-{key}. */
  readonly key: string;
  readonly caption: string;
  readonly anchor: string;
}

export interface StageHotspot {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly anchor: string;
}

export interface PaperStageProps {
  /** The figure's id; also prefixes the thread's ids and the stage's keyframes. */
  id: string;
  /** The floors on the stage, bottom up; their frame is stageGeometry().crop(floors). */
  floors: readonly FloorId[];
  /** A walk of the house model ("arrival"): its thread, stop rings and bead. */
  route?: string;
  /** Start from the street front, which opens in Act A (scroll stages only). */
  open?: boolean;
  /** A pod whose curtain closes in Act D ("pod-H01"). */
  curtain?: string;
  /**
   * "scroll": the acts follow the ancestor's scroll timeline (--stage-timeline,
   * --act-a … --act-d). "static": the stage rests lifted, and its lights come
   * on once as it comes into view.
   */
  lift: "scroll" | "static";
  labels?: readonly StageLabel[];
  spots?: readonly StageSpot[];
  hotspots?: readonly StageHotspot[];
  caption: string;
  note?: string;
}

const LEVEL: Record<FloorId, number> = { ground: 0, floor1: 1, floor2: 2 };
const LAYER_FLOOR: Record<PaperLayerId, FloorId> = {
  street: "ground",
  ground: "ground",
  "ground-front": "ground",
  floor1: "floor1",
  floor2: "floor2",
};
/** Where the walk's light catches a fixture at a stop: the cubbies glow as the walk reaches the Floor 1 landing. */
const STOP_GLOWS: Readonly<Record<string, string>> = { "landing-1": "fx-shoe-cubbies" };

const round = (v: number, places = 2) => {
  const k = 10 ** places;
  const r = Math.round(v * k) / k;
  return r === 0 ? 0 : r;
};

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * The house's hanging sign under the awning ("House of Jars", fx-sign-hanging),
 * the one real thing on the street front the wind can move (§10.1, a breath of
 * wind). The stage lays a second copy of the ground-front sheet over the first,
 * cut to the sign's board (its faces as the layer draws them, a hair wider for
 * the ink), so at rest it is the layer itself, pixel for pixel; the breath
 * turns it up to 2° about the top of its hangers. Positions are shares of the
 * stage's viewBox.
 */
function hangingSign(): { clip: string; origin: string } | undefined {
  const svg = renderPaperLayer("ground-front", "day");
  const group = /<g id="fx-sign-hanging">([\s\S]*?)<\/g>/.exec(svg)?.[1];
  if (!group) return undefined;
  // The board's three faces (front, side and top); its hangers and inner lines stay inside them.
  const faces = [...group.matchAll(/class="wk[0-2]" d="([^"]+)"/g)].map((m) => m[1]!);
  const nums = faces.flatMap((d) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number));
  const points: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) points.push([nums[i]!, nums[i + 1]!]);
  if (points.length < 3) return undefined;
  const hull = convexHull(points);
  const mx = hull.reduce((a, p) => a + p[0], 0) / hull.length;
  const my = hull.reduce((a, p) => a + p[1], 0) / hull.length;
  const [vx, vy, vw, vh] = stageGeometry().viewBox;
  const pct = (x: number, y: number) => `${round(((x - vx) / vw) * 100, 3)}% ${round(((y - vy) / vh) * 100, 3)}%`;
  const grow = (p: readonly [number, number]) => {
    const dx = p[0] - mx;
    const dy = p[1] - my;
    const k = 1 + 2 / Math.max(1, Math.hypot(dx, dy));
    return pct(mx + dx * k, my + dy * k);
  };
  // It hangs from the awning's beam: the top of its face, midway between the hangers.
  const [a, b, , , e, f] = faceMatrix("fx-sign-hanging", "front");
  return { clip: `polygon(${hull.map(grow).join(",")})`, origin: pct(e + a / 2, f + b / 2) };
}

/** The thread's path on a floor, as its <path class="th"> draws it. */
const pathOf = (svg: string | undefined) => (svg ? /class="th" pathLength="1" d="([^"]+)"/.exec(svg)?.[1] : undefined);

/**
 * The curtain inside the thread's SVG gains a body to slide: the unit square
 * and three gold stripes, in a group that scales along the rail.
 */
const dressCurtain = (svg: string) =>
  svg.replace(
    /(<g data-curtain="[^"]*"[^>]*>)<rect width="1" height="1"\/>/,
    '$1<g data-cloth=""><rect width="1" height="1"/><path d="M.25 0V1M.5 0V1M.75 0V1"/></g>',
  );

/**
 * The thread laid on a paper casing (the same path, wider, in the page's near
 * paper), so it reads on any floor. Its stop circles go: the stage draws the
 * rings in HTML, a steady size at any scale.
 */
const caseThread = (svg: string) =>
  svg
    .replace(/<circle data-stop[^>]*\/>/g, "")
    .replace(/<path id="[^"]*" class="th" pathLength="1" d="([^"]+)"\/>/, '<path class="thc" pathLength="1" d="$1"/>$&');

/** Each light's place along the walk (0 to 1): where the thread passes nearest it on its floor, or the end of the floor's stretch. */
function lightShare(thread: ThreadLayer | undefined, floor: FloorId, x: number, y: number): number {
  const share = thread?.shares[floor];
  const d = pathOf(thread?.floors[floor]);
  if (!share || !d) return 1;
  const near = shareAlong(d, [x, y]);
  return near.distance > 140 ? share[1] : round(share[0] + (share[1] - share[0]) * near.share, 4);
}

/** The floor the walk ends on: the one whose stretch ends last. */
function endFloor(thread: ThreadLayer | undefined, floors: readonly FloorId[]): FloorId | undefined {
  return floors
    .filter((f) => thread?.shares[f])
    .sort((a, b) => thread!.shares[a]![1] - thread!.shares[b]![1])
    .at(-1);
}

/**
 * The house in paper, on a stage (docs/DESIGN.md §3.2–3.3, §4.3, §5.1–5.2,
 * §10.1). The layers of lib/house/paper are stacked as cut paper (lazy
 * Day and Evening twins, each with its card edge), every floor in its own lift
 * wrapper; above them all, per floor, the walk's thread, its stop rings and
 * bead, the house's lights as glow discs, and HTML tags, hotspots and camera
 * dots on solid paper (text never sits on the art). A paper sky stands behind.
 *
 * Every element's base style is the stage's rest frame: floors lifted, thread
 * drawn, labels shown, curtain closed, lamps lit by Evening. That is what
 * Still, reduced motion, browsers without scroll timelines and screenshots
 * see. With `lift="scroll"` the acts play on the ancestor's timeline:
 *   --stage-timeline  the named timeline (the theatre's view-timeline)
 *   --act-a           Open the house: the street front fades and slides off
 *   --act-b           Floor lift, and the label tags swing in
 *   --act-c           Thread walk, rings and lights in walking order
 *   --act-d           Curtain close; by Evening the pod's lamp lights
 * (animation-range values, such as "contain 0% contain 20%"). Without scroll
 * timelines StageDirector sets data-act, data-step and --walk on the figure
 * and CSS transitions play the same states.
 *
 * The frame keeps the floors' aspect ratio, or fills --stage-height when an
 * ancestor sets it (a sticky stage), the house fitted and centred. The home
 * theatre, for example:
 *   <section id="the-house-story" style="view-timeline: --theatre;
 *     --stage-timeline: --theatre; --act-a: contain 0% contain 20%;
 *     --act-b: contain 20% contain 45%; --act-c: contain 45% contain 95%;
 *     --act-d: contain 95% contain 100%">
 *     …the words, and a track of cues, each with data-act (and data-stop)…
 *     <PaperStage id="theatre" floors={["ground", "floor1"]} route="arrival" open curtain="pod-H01" lift="scroll" labels={…} caption="…" />
 *     <StageDirector stage="theatre" steps="theatre-cues" line={0.5} />
 *   </section>
 * (components/home/HouseTheatre.tsx). The server works out every place from
 * the house model and hands StageArt the figures, and StageKeyframes the
 * walk's few numbers, so the page carries the stage's markup once.
 */
export function PaperStage({
  id,
  floors,
  route,
  open = false,
  curtain,
  lift,
  labels = [],
  spots = [],
  hotspots = [],
  caption,
  note,
}: PaperStageProps) {
  const geometry = stageGeometry();
  const [vx, vy, vw, vh] = geometry.viewBox;
  const [cx, cy, cw, ch] = geometry.crop(floors);
  const p = `${id.replace(/[^A-Za-z0-9_-]/g, "")}-`;
  const has = (f: FloorId) => floors.includes(f);
  const scroll = lift === "scroll";

  const layers = PAPER_LAYERS.filter((layer) => has(LAYER_FLOOR[layer]) && layer !== "street");
  const thread = route ? renderThreadLayer(route, { idPrefix: p, floors, ...(curtain ? { curtain } : {}) }) : undefined;
  const lights = lightPoints(floors).map((l) => ({ ...l, share: lightShare(thread, l.floor, l.x, l.y) }));
  const stopGlows = (thread?.stops ?? []).flatMap((stop) => {
    const fx = stop.area ? STOP_GLOWS[stop.area] : undefined;
    const anchor = fx ? anchorOf(fx) : undefined;
    return anchor && has(anchor.floor) ? [{ id: fx!, floor: anchor.floor, x: anchor.x, y: anchor.y, r: 14, share: stop.at }] : [];
  });
  const lastFloor = endFloor(thread, floors);
  const clock: StageClock | undefined =
    scroll && thread
      ? {
          ats: thread.stops.map((s) => s.at),
          shares: Object.fromEntries(floors.flatMap((f) => (thread.shares[f] ? [[f, thread.shares[f]!]] : []))),
          last: lastFloor,
          lights: [...lights, ...stopGlows].map((l) => l.share),
        }
      : undefined;

  // The air that rises at the front desk: the big jar glows, a wisp of warm air traces the arch and a few motes rise.
  const jar = has("ground") ? lights.find((l) => l.id === "jar-big") : undefined;
  const deskStop = thread?.stops.findIndex((s: StageStop) => s.area === "desk") ?? -1;

  const lamp = curtain && thread ? faceMatrix(curtain, "right") : undefined;
  const sign = has("ground") ? hangingSign() : undefined;

  const byFloor = <T extends { floor: FloorId }>(items: readonly T[], floor: FloorId) => items.filter((i) => i.floor === floor);
  const placed = <T extends { anchor: string }>(items: readonly T[]) =>
    items.flatMap((item) => {
      const a = anchorOf(item.anchor);
      return a && has(a.floor) ? [{ ...item, floor: a.floor, x: a.x, y: a.y }] : [];
    });
  const tags = placed(labels);
  const notes = placed(hotspots);
  const dots = placed(spots);
  const px = (x: number) => round(((x - vx) / vw) * 100);
  const py = (y: number) => round(((y - vy) / vh) * 100);
  const sheets = (layer: PaperLayerId) => [paperLayerSrc(layer, "day"), paperLayerSrc(layer, "evening")] as const;
  const lampFloor = curtain ? anchorOf(curtain.startsWith("fx-") ? curtain : `fx-${curtain}`)?.floor : undefined;

  // Everything the stage's world draws, worked out here from the house model; StageArt draws it.
  const art: StageArtData = {
    p,
    id,
    scroll,
    world: [vx, vy, vw, vh, cx, cy, cw, ch],
    layers: layers.map((layer) => [layer, layer === "floor1" || layer === "floor2" ? LEVEL[layer] : 0, ...sheets(layer)]),
    ...(sign ? { sign: { after: "ground-front", ...sign, day: sheets("ground-front")[0], evening: sheets("ground-front")[1] } } : {}),
    ...(open && has("ground") ? { street: sheets("street") } : {}),
    link: thread?.link ?? "",
    floors: floors.map((floor): ArtFloor => {
      const svg = thread?.floors[floor];
      const share = thread?.shares[floor];
      const bead = pathOf(svg);
      return {
        floor,
        level: LEVEL[floor],
        lights: [...byFloor(lights, floor), ...byFloor(stopGlows, floor)].map(
          (l): StageLight => [px(l.x), py(l.y), round(((l.r * 1.15) / vw) * 100), "order" in l ? Number(l.order) : 0, l.share],
        ),
        ...(lamp && floor === lampFloor
          ? {
              podLamp: [
                px(lamp[4] + lamp[0] * 0.5 + lamp[2] * 0.3),
                py(lamp[5] + lamp[1] * 0.5 + lamp[3] * 0.3),
                round((15 / vw) * 100),
              ] as const,
            }
          : {}),
        thread: svg ? caseThread(dressCurtain(svg)) : "",
        ...(share ? { share } : {}),
        ...(bead ? { bead } : {}),
        last: floor === lastFloor,
        rings: (thread?.stops ?? []).flatMap((s, k) => (s.floor === floor ? [[k, px(s.x), py(s.y), s.at] as const] : [])),
        ...(jar && floor === "ground" ? { air: [px(jar.x), py(jar.y), deskStop] as const } : {}),
        tags: byFloor(tags, floor).map((t) => [t.text, px(t.x), py(t.y), tags.indexOf(t)] as const),
        notes: byFloor(notes, floor).map(
          (n) => [n.id, n.title, n.text, px(n.x), py(n.y), n.x - vx < vw * 0.4 ? "start" : n.x - vx > vw * 0.7 ? "end" : "middle"] as const,
        ),
        dots: byFloor(dots, floor).map((d) => {
          // Dots at one place stand in a row, centred on it.
          const group = dots.filter((o) => o.anchor === d.anchor);
          return [d.n, d.key, d.caption, px(d.x), py(d.y), group.length > 1 ? group.indexOf(d) - (group.length - 1) / 2 : 0] as const;
        }),
      };
    }),
  };

  return (
    <figure
      id={id}
      className={styles.stage}
      data-stage=""
      data-phrase={scroll ? undefined : ""}
      data-lift={lift}
      data-open={open ? "" : undefined}
      style={{ "--stage-aspect": `${cw} / ${ch}` } as Vars}
    >
      {clock ? <StageKeyframes p={p} clock={clock} /> : null}
      <StageArt art={art} />
      <figcaption className={styles.caption}>
        <span>{caption}</span>
        {note ? <span>{note}</span> : null}
      </figcaption>
    </figure>
  );
}
