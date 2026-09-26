import { Drawing } from "@/components/art/Drawing";
import styles from "./PodDiagram.module.css";

/**
 * Where the drawing's saffron dots are, in percent, in the order of
 * beds.perBed: the curtain, the reading light, the socket, the locker.
 */
const dots = [
  { x: 90.8, y: 28.9 },
  { x: 35, y: 7.8 },
  { x: 50, y: 7.8 },
  { x: 91.7, y: 93.1 },
] as const;

/**
 * A pod drawn apart, as an architect would: its parts are numbered to match
 * the list beside it. Decorative, since the list says the same.
 */
export function PodDiagram({ className }: { className?: string }) {
  return (
    <figure className={[styles.figure, className].filter(Boolean).join(" ")} aria-hidden="true">
      <div className={styles.canvas}>
        <Drawing name="pod" className={styles.drawing} sizes="(min-width: 60rem) 40vw, 100vw" />
        {dots.map((dot, index) => (
          <span key={index} className={styles.number} style={{ left: `${dot.x}%`, top: `${dot.y}%` }}>
            {index + 1}
          </span>
        ))}
      </div>
    </figure>
  );
}
