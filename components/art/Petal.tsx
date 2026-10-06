import styles from "./Petal.module.css";

/**
 * One dok champa petal (docs/DESIGN.md §2.3.6): a 14 px flower, masked from
 * /brand/dok-champa.svg, that crosses its section once on a breeze, turning
 * to 200°. Its rest frame is gone, so Still and screenshots never show it.
 *
 * It fills its positioned parent (and clips to it) and plays when an
 * ancestor's phrase plays ([data-played], from StageLife) or carries
 * [data-play]; --delay (a time) holds it back. Decorative.
 */
export function Petal({ className }: { className?: string }) {
  return (
    <span className={[styles.petal, className].filter(Boolean).join(" ")} aria-hidden="true">
      <i />
    </span>
  );
}
