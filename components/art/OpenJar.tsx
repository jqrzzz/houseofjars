import { num, stoneJar } from "./stone-jar";
import styles from "./OpenJar.module.css";

// Seen from a little above, so the open mouth shows.
const SPEC = { w: 200, h: 176, foot: 0.8, belly: 0.5, neck: 0.82, lip: 0.9, lipH: 0.13, top: 0.3, skew: 0.04 } as const;
const jar = stoneJar(SPEC);
const rimX = (SPEC.w / 2) * SPEC.lip;
const rimY = rimX * SPEC.top;
const yTop = -SPEC.h + rimY;
const mouth = { rx: rimX * 0.8, ry: rimY * 0.78, cy: yTop + rimY * 0.06 };
// The inner wall at the back catches the light; the front of the hollow is in shadow.
const innerWall =
  `M${num(-mouth.rx)} ${num(mouth.cy)}A${num(mouth.rx)} ${num(mouth.ry)} 0 0 1 ${num(mouth.rx)} ${num(mouth.cy)}` +
  `A${num(mouth.rx * 0.96)} ${num(mouth.ry * 0.62)} 0 0 0 ${num(-mouth.rx)} ${num(mouth.cy)}Z`;

/** "This jar is empty": a stone jar standing open, for the 404 page. Decorative. */
export function OpenJar({ className }: { className?: string }) {
  return (
    <svg
      className={[styles.jar, className].filter(Boolean).join(" ")}
      viewBox={`${-SPEC.w / 2 - 14} ${-SPEC.h - 6} ${SPEC.w + 28} ${SPEC.h + 22}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* It appears once, on the 404 page, so a fixed id is safe. */}
        <clipPath id="open-jar-clip">
          <path d={jar.body} />
        </clipPath>
      </defs>
      <ellipse className={styles.shadow} cx="0" cy="2" rx={SPEC.w * 0.6} ry="9" />
      <path className={styles.stone} d={jar.body} />
      <g clipPath="url(#open-jar-clip)">
        <path className={styles.lit} d={jar.litPlanes} />
        <path className={styles.dark} d={jar.darkPlanes} />
        <path className={styles.under} d={jar.under} />
      </g>
      <path className={styles.top} d={jar.top} />
      <ellipse className={styles.hollow} cx="0" cy={num(mouth.cy)} rx={num(mouth.rx)} ry={num(mouth.ry)} />
      <path className={styles.wall} d={innerWall} />
    </svg>
  );
}
