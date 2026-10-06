import type { CSSProperties } from "react";
import { Drawing } from "@/components/art/Drawing";
import styles from "./PodDiagram.module.css";

/**
 * Where the drawing's orange dots are, in percent, in the order of
 * beds.perBed: the curtain, the reading light, the socket, the locker. Each
 * plate hangs from its dot as a tag.
 */
const dots = [
  { x: 90.8, y: 28.9 },
  { x: 35, y: 7.8 },
  { x: 50, y: 7.8 },
  { x: 91.7, y: 93.1 },
] as const;

/** Folds every 15 units across the opening, and the woven hem's diamonds, in the drawing's own 480 by 360 frame. */
const FOLDS = Array.from({ length: 11 }, (_, k) => `M${121 + k * 15} 80V246`).join("");
const HEM = Array.from({ length: 12 }, (_, k) => `M${112 + k * 15} 229l4 -4l4 4l-4 4Z`).join("");
const RINGS = Array.from({ length: 12 }, (_, k) => `M${113 + k * 15} 74h0`).join("");

/**
 * A pod drawn apart, as an architect would, in paper: its parts are numbered
 * to match the list beside it, on plates that hang from the drawing's dots.
 * As it first comes into view the curtain slides open along its rail and the
 * plates swing on their cords, once; at rest the curtain is open, as drawn.
 * Decorative, since the list says the same.
 */
export function PodDiagram({ className }: { className?: string }) {
  return (
    <figure className={[styles.figure, className].filter(Boolean).join(" ")} data-phrase="" aria-hidden="true">
      <div className={styles.canvas}>
        <Drawing name="pod" className={styles.drawing} sizes="(min-width: 60rem) 40vw, 100vw" />
        <svg className={styles.curtain} viewBox="0 0 480 360" focusable="false">
          <g className={styles.cloth}>
            <path className={styles.fabric} d="M106 74H286V248H106Z" />
            <path className={styles.folds} d={FOLDS} />
            <path className={styles.header} d="M106 70H286V86H106Z" />
            <path className={styles.rings} d={RINGS} />
            <path className={styles.holes} d={RINGS} />
            <path className={styles.hem} d="M106 224H286V234H106Z" />
            <path className={styles.diamonds} d={HEM} />
          </g>
        </svg>
        {dots.map((dot, index) => (
          <span key={index} className={styles.tag} style={{ left: `${dot.x}%`, top: `${dot.y}%`, "--k": index } as CSSProperties}>
            <span className={styles.number}>{index + 1}</span>
          </span>
        ))}
      </div>
    </figure>
  );
}
