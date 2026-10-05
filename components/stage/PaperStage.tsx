import Image from "next/image";
import type { CSSProperties } from "react";
import { ArchWisp } from "@/components/art/ArchWisp";
import glow from "@/components/art/glow.module.css";
import { Motes } from "@/components/art/Motes";
import {
  PAPER_LAYERS,
  anchorOf,
  faceMatrix,
  lightPoints,
  paperLayerSrc,
  renderThreadLayer,
  stageGeometry,
  type PaperLayerId,
  type StageStop,
  type ThreadLayer,
} from "@/lib/house/paper";
import type { FloorId } from "@/lib/house/types";
import { arriveFrames, beadFrames, keyframes, shareAlong, threadFrames, walkClock } from "@/lib/stage/acts";
import { PaperSky } from "./PaperSky";
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

/** The rest of a stage's markup works in its one viewBox; positions become shares of it. */
function placer() {
  const [vx, vy, vw, vh] = stageGeometry().viewBox;
  return (x: number, y: number): Vars => ({ "--x": `${round(((x - vx) / vw) * 100)}%`, "--y": `${round(((y - vy) / vh) * 100)}%` });
}

/**
 * The awning's valance, in the unit square of its front face (matrix from
 * faceMatrix): a cloth strip hanging below the beam, cut in shallow scallops.
 * It is the one piece of the street the wind can move (§10.1, a breath of wind).
 */
const VALANCE = `M0 1H1V1.5${Array.from({ length: 8 }, (_, k) => `Q${1 - (k + 0.5) / 8} 1.95 ${1 - (k + 1) / 8} 1.5`).join("")}Z`;

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

/** The thread laid on a paper casing (the same path, wider, in the page's near paper), so it reads on any floor. */
const caseThread = (svg: string) =>
  svg.replace(/<path id="[^"]*" class="th" pathLength="1" d="([^"]+)"\/>/, '<path class="thc" pathLength="1" d="$1"/>$&');

/**
 * A floor's stop rings as markup (spans placed in percent of the stage), so a
 * walk chosen on the page can swap them as it swaps the thread (WalkPicker).
 */
function ringsHtml(stops: readonly StageStop[], floor: FloorId, p: string): string {
  const [vx, vy, vw, vh] = stageGeometry().viewBox;
  return stops
    .map((s, k) =>
      s.floor === floor
        ? `<span data-ring="${k}" style="--x:${round(((s.x - vx) / vw) * 100)}%;--y:${round(((s.y - vy) / vh) * 100)}%;--at:${s.at};--kf:${p}r${k}"></span>`
        : "",
    )
    .join("");
}

/** Each light's place along the walk (0 to 1): where the thread passes nearest it on its floor, or the end of the floor's stretch. */
function lightShare(thread: ThreadLayer | undefined, floor: FloorId, x: number, y: number): number {
  const share = thread?.shares[floor];
  const d = pathOf(thread?.floors[floor]);
  if (!share || !d) return 1;
  const near = shareAlong(d, [x, y]);
  return near.distance > 140 ? share[1] : round(share[0] + (share[1] - share[0]) * near.share, 4);
}

/** The keyframes a scroll stage plays inside its acts, named after the stage, so two stages on a page never share them. */
/** The floor the walk ends on: the one whose stretch ends last. */
function endFloor(thread: ThreadLayer | undefined, floors: readonly FloorId[]): FloorId | undefined {
  return floors
    .filter((f) => thread?.shares[f])
    .sort((a, b) => thread!.shares[a]![1] - thread!.shares[b]![1])
    .at(-1);
}

function actKeyframes(
  p: string,
  thread: ThreadLayer,
  floors: readonly FloorId[],
  lights: readonly { share: number }[],
): { css: string; light: (share: number) => string } {
  const clock = walkClock(thread.stops);
  const walked = floors.filter((f) => thread.shares[f]);
  const lastFloor = endFloor(thread, floors);
  let css = "";
  for (const floor of walked) {
    const share = thread.shares[floor]!;
    css += keyframes(`${p}t-${floor}`, threadFrames(clock, share));
    css += keyframes(`${p}b-${floor}`, beadFrames(clock, share, floor === lastFloor));
  }
  thread.stops.forEach((stop, k) => {
    css += keyframes(
      `${p}r${k}`,
      arriveFrames(clock, stop.at, { wait: "opacity:0;scale:.6", ahead: "opacity:.5;scale:.6", rest: "opacity:1;scale:1" }),
    );
  });
  const names = new Map<number, string>();
  const light = (share: number) => {
    const at = Math.round(share * 100);
    const known = names.get(at);
    if (known) return known;
    const name = `${p}l${at}`;
    names.set(at, name);
    css += keyframes(name, arriveFrames(clock, at / 100, { wait: "opacity:0;scale:.9", rest: "opacity:1;scale:1", lead: 0.03 }));
    return name;
  };
  for (const l of lights) light(l.share);
  return { css, light };
}

function Layer({ layer }: { layer: PaperLayerId }) {
  const [, , vw, vh] = stageGeometry().viewBox;
  const level = layer === "floor1" || layer === "floor2" ? LEVEL[layer] : 0;
  const img = (theme: "day" | "evening", other: "day" | "evening") => (
    <Image
      src={paperLayerSrc(layer, theme)}
      data-alt-src={paperLayerSrc(layer, other)}
      width={vw}
      height={vh}
      alt=""
      unoptimized
      loading="lazy"
      className={`for-${theme}`}
    />
  );
  return (
    <div data-layer={layer} data-level={level || undefined}>
      {img("day", "evening")}
      {img("evening", "day")}
    </div>
  );
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
 *     <div id="theatre-steps">…text, each step with data-act (and data-stop)…</div>
 *     <PaperStage id="theatre" floors={["ground", "floor1"]} route="arrival" open curtain="pod-H01" lift="scroll" labels={…} caption="…" />
 *     <StageDirector stage="theatre" steps="theatre-steps" />
 *   </section>
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
  const at = placer();
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
  const acts = scroll && thread ? actKeyframes(p, thread, floors, [...lights, ...stopGlows]) : undefined;
  const lastFloor = endFloor(thread, floors);

  // The air that rises at the front desk: the big jar glows, a wisp of warm air traces the arch and a few motes rise.
  const jar = has("ground") ? lights.find((l) => l.id === "jar-big") : undefined;
  const deskStop = thread?.stops.findIndex((s: StageStop) => s.area === "desk") ?? -1;

  const lamp = curtain && thread ? faceMatrix(curtain, "right") : undefined;
  const valance = has("ground") ? faceMatrix("fx-awning", "front") : undefined;

  const byFloor = <T extends { floor: FloorId }>(items: readonly T[], floor: FloorId) => items.filter((i) => i.floor === floor);
  const placed = <T extends { anchor: string }>(items: readonly T[]) =>
    items.flatMap((item) => {
      const a = anchorOf(item.anchor);
      return a && has(a.floor) ? [{ ...item, floor: a.floor, x: a.x, y: a.y }] : [];
    });
  const tags = placed(labels);
  const notes = placed(hotspots);
  const dots = placed(spots);
  // Dots at one place stand in a row, centred on it.
  const dotRow = (dot: (typeof dots)[number]) => {
    const group = dots.filter((d) => d.anchor === dot.anchor);
    return { "--nudge": group.length > 1 ? group.indexOf(dot) - (group.length - 1) / 2 : 0 } as Vars;
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
      {acts ? (
        <style href={`paper-stage-${p}`} precedence="default">
          {acts.css}
        </style>
      ) : null}
      <div className={styles.frame}>
        <PaperSky phrase={scroll} />
        <span className={styles.fibre} />
        <div
          className={styles.world}
          style={{ "--vx": vx, "--vy": vy, "--vw": vw, "--vh": vh, "--cx": cx, "--cy": cy, "--cw": cw, "--ch": ch } as Vars}
        >
          <div className={styles.house}>
            {layers.map((layer) => (
              <Layer key={layer} layer={layer} />
            ))}
            <div data-link="" dangerouslySetInnerHTML={{ __html: thread?.link ?? "" }} />
            {floors.map((floor) => {
              const svg = thread?.floors[floor];
              const share = thread?.shares[floor];
              const d = pathOf(svg);
              return (
                <div key={floor} data-ov={floor} data-level={LEVEL[floor] || undefined}>
                  {[...byFloor(lights, floor), ...byFloor(stopGlows, floor)].map((l) => (
                    <i
                      key={l.id}
                      className={glow.glow}
                      style={
                        {
                          ...at(l.x, l.y),
                          "--r": `${round(((l.r * 1.15) / vw) * 100, 2)}%`,
                          "--i": "order" in l ? l.order : 0,
                          "--at": l.share,
                          "--kf": acts?.light(l.share) ?? "none",
                        } as Vars
                      }
                    />
                  ))}
                  {lamp && floor === anchorOf(curtain!.startsWith("fx-") ? curtain! : `fx-${curtain}`)?.floor ? (
                    <i
                      className={`${glow.disc} ${styles.podLamp}`}
                      style={
                        {
                          ...at(lamp[4] + lamp[0] * 0.5 + lamp[2] * 0.3, lamp[5] + lamp[1] * 0.5 + lamp[3] * 0.3),
                          "--r": `${round((15 / vw) * 100, 2)}%`,
                        } as Vars
                      }
                    />
                  ) : null}
                  <div
                    data-thread={floor}
                    style={{ "--a": share?.[0] ?? 0, "--b": share?.[1] ?? 1, "--kf": `${p}t-${floor}` } as Vars}
                    dangerouslySetInnerHTML={{ __html: svg ? caseThread(dressCurtain(svg)) : "" }}
                  />
                  <svg data-beads="" viewBox={`${vx} ${vy} ${vw} ${vh}`} aria-hidden="true" focusable="false">
                    <g
                      data-bead={floor}
                      data-last={floor === lastFloor ? "" : undefined}
                      style={
                        { offsetPath: d ? `path("${d}")` : "none", "--a": share?.[0] ?? 0, "--b": share?.[1] ?? 1, "--kf": `${p}b-${floor}` } as Vars
                      }
                    >
                      <path d="M0 0h0" />
                      <path d="M0 0h0" />
                    </g>
                  </svg>
                  <div data-rings={floor} dangerouslySetInnerHTML={{ __html: ringsHtml(thread?.stops ?? [], floor, p) }} />
                  {jar && floor === "ground" ? (
                    <span className={styles.air} data-play-at={deskStop >= 0 ? deskStop : undefined} style={at(jar.x, jar.y)}>
                      <ArchWisp size={40} className={styles.wisp} />
                      <Motes count={4} seed={3} className={styles.motes} />
                    </span>
                  ) : null}
                  {byFloor(tags, floor).map((tag) => (
                    // The words beside the stage say the same: the tags are for the eye.
                    <span
                      key={tag.text}
                      className={styles.tag}
                      data-k={tags.indexOf(tag)}
                      style={{ ...at(tag.x, tag.y), "--k": tags.indexOf(tag) } as Vars}
                      aria-hidden="true"
                    >
                      <span className={styles.plate}>{tag.text}</span>
                    </span>
                  ))}
                  {byFloor(notes, floor).map((spot) => (
                    <details
                      key={spot.id}
                      name={`${id}-notes`}
                      className={styles.note}
                      data-side={spot.x - vx < vw * 0.4 ? "start" : spot.x - vx > vw * 0.7 ? "end" : "middle"}
                      style={at(spot.x, spot.y)}
                    >
                      <summary className={styles.plate}>{spot.title}</summary>
                      <p className={styles.tip}>
                        <strong>{spot.title}.</strong> {spot.text}
                      </p>
                    </details>
                  ))}
                  {byFloor(dots, floor).map((dot) => (
                    <a key={dot.key} className={styles.camera} href={`#photo-${dot.key}`} style={{ ...at(dot.x, dot.y), ...dotRow(dot) }}>
                      <span aria-hidden="true">{dot.n}</span>
                      <span className="visually-hidden">
                        Photo {dot.n}: {dot.caption}
                      </span>
                    </a>
                  ))}
                </div>
              );
            })}
          </div>
          {open && has("ground") ? <Layer layer="street" /> : null}
          {valance ? (
            <svg
              className={styles.valance}
              viewBox={`${vx} ${vy} ${vw} ${vh}`}
              data-phrase={scroll ? "" : undefined}
              aria-hidden="true"
              focusable="false"
            >
              <g className={`${styles.breath} amb`} style={{ transformOrigin: `${valance[4]}px ${round(valance[5] + valance[3], 2)}px` }}>
                <g transform={`matrix(${valance.join(" ")})`}>
                  <path d={VALANCE} />
                </g>
              </g>
            </svg>
          ) : null}
        </div>
      </div>
      <figcaption className={styles.caption}>
        <span>{caption}</span>
        {note ? <span>{note}</span> : null}
      </figcaption>
    </figure>
  );
}
