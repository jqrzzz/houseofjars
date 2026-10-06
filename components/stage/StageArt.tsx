"use client";

import { Fragment, type CSSProperties } from "react";
import { ArchWisp } from "@/components/art/ArchWisp";
import glow from "@/components/art/glow.module.css";
import { Motes } from "@/components/art/Motes";
import { LayerTwins } from "./LayerTwins";
import { PaperSky } from "./PaperSky";
import { StageLights, type StageLight } from "./StageLights";
import styles from "./PaperStage.module.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** A layer: its id, its level (floors lift by it), and its Day and Evening sheets. */
export type ArtLayer = readonly [id: string, level: number, day: string, evening: string];

/** One floor's overlays, in percent of the stage (x, y) unless said otherwise. */
export interface ArtFloor {
  readonly floor: string;
  readonly level: number;
  readonly lights: readonly StageLight[];
  /** The curtained pod's own lamp: x, y, radius (percent of the stage's width). */
  readonly podLamp?: readonly [number, number, number];
  /** The walk's thread on this floor, as markup, and its stretch of the walk. */
  readonly thread: string;
  readonly share?: readonly [number, number];
  /** The thread's path, for the bead to ride; whether the walk ends on this floor. */
  readonly bead?: string;
  readonly last: boolean;
  /** Stop rings: the stop's index, x, y and its share of the walk. */
  readonly rings: readonly (readonly [k: number, x: number, y: number, at: number])[];
  /** The air over the big jar at the front desk: x, y and the stop it rises at. */
  readonly air?: readonly [x: number, y: number, at: number];
  /** Label tags: text, x, y, their order and which way the plate hangs from its pin ("start", "end" or "" for centred). */
  readonly tags: readonly (readonly [text: string, x: number, y: number, k: number, side: string])[];
  /** Notes on the house: id, title, text, x, y and which way the tip opens. */
  readonly notes: readonly (readonly [id: string, title: string, text: string, x: number, y: number, side: string])[];
  /** Camera dots: the photo's number, key, caption, x, y and its nudge in a row. */
  readonly dots: readonly (readonly [n: number, key: string, caption: string, x: number, y: number, nudge: number])[];
}

export interface StageArtData {
  /** The stage's prefix, for its keyframes' names and the notes' group. */
  readonly p: string;
  readonly id: string;
  readonly scroll: boolean;
  /** The stage's viewBox and the floors' crop of it: x, y, width, height each. */
  readonly world: readonly [number, number, number, number, number, number, number, number];
  readonly layers: readonly ArtLayer[];
  /** The hanging sign's copy, laid over the layer named `after`. */
  readonly sign?: { readonly after: string; readonly clip: string; readonly origin: string; readonly day: string; readonly evening: string };
  /** The street front's sheets, when the stage opens from the street. */
  readonly street?: readonly [day: string, evening: string];
  readonly link: string;
  readonly floors: readonly ArtFloor[];
}

const at = (x: number, y: number): Vars => ({ "--x": `${x}%`, "--y": `${y}%` });

/**
 * The paper stage's world (PaperStage.tsx works out every place from the
 * house model on the server and passes the figures): the sky, the layers as
 * cut paper, and over each floor its lights, thread, bead, rings, air, tags,
 * notes and camera dots. It sits on the client side of the boundary only so
 * the page carries the stage's markup once; the HTML is still rendered on the
 * server and nothing here changes after it.
 */
export function StageArt({ art }: { art: StageArtData }) {
  const { p, id, scroll, world, layers, sign, street, link, floors } = art;
  const [vx, vy, vw, vh, cx, cy, cw, ch] = world;
  const layer = ([name, level, day, evening]: ArtLayer, alt = true) => (
    <div data-layer={name} data-level={level || undefined}>
      <LayerTwins day={day} evening={evening} width={vw} height={vh} alt={alt} />
    </div>
  );
  return (
    <div className={styles.frame}>
      <PaperSky phrase={scroll} />
      <span className={styles.fibre} />
      <div className={styles.world} style={{ "--vx": vx, "--vy": vy, "--vw": vw, "--vh": vh, "--cx": cx, "--cy": cy, "--cw": cw, "--ch": ch } as Vars}>
        <div className={styles.house}>
          {layers.map((l) => (
            <Fragment key={l[0]}>
              {layer(l)}
              {sign && sign.after === l[0] ? (
                // The hanging sign, a copy of its own sheet cut to the board: the breath of wind turns it.
                <div className="amb" data-sign="" data-play-act={scroll ? "b" : undefined} style={{ clipPath: sign.clip, transformOrigin: sign.origin }}>
                  <LayerTwins day={sign.day} evening={sign.evening} width={vw} height={vh} />
                </div>
              ) : null}
            </Fragment>
          ))}
          {/* Bedtime by Evening: the paper house dims under its lights as the curtain closes (Act D), and H01's lamp glows on. */}
          {floors.some((f) => f.podLamp) ? (
            <span
              className={styles.hush}
              style={{ "--hush-mask": layers.map(([, level, , evening]) => `url(${evening}) 0 ${level ? `calc(var(--u) * ${-90 * level})` : "0"} / 100% 100% no-repeat`).join(", ") } as Vars}
            />
          ) : null}
          <div data-link="" dangerouslySetInnerHTML={{ __html: link }} />
          {floors.map((f) => (
            <div key={f.floor} data-ov={f.floor} data-level={f.level || undefined}>
              <StageLights p={p} scroll={scroll} lights={f.lights} />
              <div
                data-thread={f.floor}
                style={{ "--a": f.share?.[0] ?? 0, "--b": f.share?.[1] ?? 1, "--kf": `${p}t-${f.floor}` } as Vars}
                dangerouslySetInnerHTML={{ __html: f.thread }}
              />
              {/* The pod's lamp glows through its closed curtain, so it lies over the cloth. */}
              {f.podLamp ? <i className={`${glow.disc} ${styles.podLamp}`} style={{ ...at(f.podLamp[0], f.podLamp[1]), "--r": `${f.podLamp[2]}%` } as Vars} /> : null}
              <svg data-beads="" viewBox={`${vx} ${vy} ${vw} ${vh}`} aria-hidden="true" focusable="false">
                <g
                  data-bead={f.floor}
                  data-last={f.last ? "" : undefined}
                  style={
                    {
                      offsetPath: f.bead ? `path("${f.bead}")` : "none",
                      "--a": f.share?.[0] ?? 0,
                      "--b": f.share?.[1] ?? 1,
                      "--kf": `${p}b-${f.floor}`,
                    } as Vars
                  }
                >
                  <path d="M0 0h0" />
                  <path d="M0 0h0" />
                </g>
              </svg>
              {/* Markup, not elements: a walk chosen on the page swaps the rings as it swaps the thread (WalkPicker). */}
              <div
                data-rings={f.floor}
                dangerouslySetInnerHTML={{
                  __html: f.rings.map(([k, x, y, share]) => `<span data-ring="${k}" style="--x:${x}%;--y:${y}%;--at:${share};--kf:${p}r${k}"></span>`).join(""),
                }}
              />
              {f.air ? (
                <span className={`${styles.air} amb`} data-play-at={f.air[2] >= 0 ? f.air[2] : undefined} style={at(f.air[0], f.air[1])}>
                  <ArchWisp size={40} className={styles.wisp} />
                  <Motes count={3} seed={3} className={styles.motes} />
                </span>
              ) : null}
              {f.tags.map(([text, x, y, k, side]) => (
                // The words beside the stage say the same: the tags are for the eye.
                <span key={text} className={styles.tag} data-k={k} data-side={side || undefined} style={{ ...at(x, y), "--k": k } as Vars} aria-hidden="true">
                  <span className={styles.plate}>{text}</span>
                </span>
              ))}
              {f.notes.map(([note, title, text, x, y, side]) => (
                <details key={note} name={`${id}-notes`} className={styles.note} data-side={side} style={at(x, y)}>
                  <summary className={styles.plate}>{title}</summary>
                  <p className={styles.tip}>
                    <strong>{title}.</strong> {text}
                  </p>
                </details>
              ))}
              {f.dots.map(([n, key, caption, x, y, nudge]) => (
                <a key={key} className={styles.camera} href={`#photo-${key}`} style={{ ...at(x, y), "--nudge": nudge } as Vars}>
                  <span aria-hidden="true">{n}</span>
                  <span className="visually-hidden">
                    Photo {n}: {caption}
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
        {street ? layer(["street", 0, street[0], street[1]]) : null}
      </div>
    </div>
  );
}
