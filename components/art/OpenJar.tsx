import { num, stoneJar } from "./stone-jar";
import styles from "./OpenJar.module.css";

// Seen from a little above, so the open mouth shows. Old like the hero's jars: cracked and streaked.
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
const jar = stoneJar(SPEC);
const rimX = (SPEC.w / 2) * SPEC.lip;
const rimY = rimX * SPEC.top;
const yTop = -SPEC.h + rimY;
// The opening as stone-jar.ts sets it: 0.68 of the rim across, a little back.
const mouth = { rx: rimX * 0.68, ry: rimY * 0.52, cy: yTop - rimY * 0.04 };
// The inner wall at the back catches the light; the front of the hollow is in shadow.
const innerWall =
  `M${num(-mouth.rx)} ${num(mouth.cy)}A${num(mouth.rx)} ${num(mouth.ry)} 0 0 1 ${num(mouth.rx)} ${num(mouth.cy)}` +
  `A${num(mouth.rx * 0.96)} ${num(mouth.ry * 0.62)} 0 0 0 ${num(-mouth.rx)} ${num(mouth.cy)}Z`;

/** "This jar is empty": a stone jar standing open, for the 404 page. Decorative. */
export function OpenJar({ className }: { className?: string }) {
  return (
    <svg
      className={[styles.jar, className].filter(Boolean).join(" ")}
      viewBox={`${-SPEC.w / 2 - 20} ${-SPEC.h - 6} ${SPEC.w + 40} ${SPEC.h + 22}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* It appears once, on the 404 page, so fixed ids are safe. */}
        <clipPath id="open-jar-clip">
          <path d={jar.body} />
        </clipPath>
        {/* Light from the upper left: lit stone, then shade. */}
        <linearGradient id="open-jar-shade" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" className={styles.lit} />
          <stop offset=".45" className={styles.none} />
          <stop offset=".6" className={styles.none} />
          <stop offset="1" className={styles.shaded} />
        </linearGradient>
        <linearGradient id="open-jar-stain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={styles.stain} />
          <stop offset=".6" className={styles.clean} />
          <stop offset=".86" className={styles.clean} />
          <stop offset="1" className={styles.stain} />
        </linearGradient>
      </defs>
      <ellipse className={styles.shadow} cx="0" cy="2" rx={SPEC.w * 0.6} ry="9" />
      <path className={styles.stone} d={jar.body} />
      <g clipPath="url(#open-jar-clip)">
        <path d={jar.body} fill="url(#open-jar-shade)" />
        <path d={jar.stains} fill="url(#open-jar-stain)" />
        <path className={styles.under} d={jar.collar} />
        <path className={styles.crack} d={jar.crack} />
      </g>
      <path className={styles.top} d={jar.top} />
      <path className={styles.hollow} d={jar.mouth} />
      <path className={styles.wall} d={innerWall} />
    </svg>
  );
}
