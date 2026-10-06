import styles from "./OpenJar.module.css";
import { OpenJarTap } from "./OpenJarTap";
import paper from "./paper.module.css";
import { PaperJar } from "./StoneJars";

// Seen from a little above, so the open mouth shows. Old like the plain's jars: cracked and streaked.
const SPEC = {
  w: 200,
  h: 176,
  foot: 0.84,
  belly: 0.4,
  neck: 0.84,
  lip: 0.94,
  lipH: 0.15,
  top: 0.3,
  skew: 0.04,
  seed: 7,
  rough: 0.025,
  crack: { at: 0.42, length: 0.34 },
} as const;

/**
 * "This jar is empty": a stone jar standing open, in cut paper, for the 404
 * page. The drawing is server-rendered; a tap or Enter wobbles it (±3°,
 * 680 ms) and sends one arch wisp up from its mouth (OpenJarTap, a small
 * client island), unless the guest has chosen Still or prefers reduced motion.
 */
export function OpenJar({ className }: { className?: string }) {
  return (
    <OpenJarTap className={[styles.jar, className].filter(Boolean).join(" ")}>
      <svg
        className={`${paper.paper} ${styles.drawing}`}
        viewBox={`${-SPEC.w / 2 - 20} ${-SPEC.h - 6} ${SPEC.w + 40} ${SPEC.h + 22}`}
        aria-hidden="true"
        focusable="false"
      >
        {/* It appears once, on the 404 page, so a fixed id is safe. */}
        <PaperJar spec={SPEC} id="open-jar" open lichenAt={[-62, -70]} />
      </svg>
    </OpenJarTap>
  );
}
