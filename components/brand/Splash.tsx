import { identity } from "@/content/identity";
import { MARK_PARTS, MARK_VIEWBOX } from "./mark-shape";
import styles from "./Splash.module.css";

const [leftPillar, topBlock, middleBlock, bottomBlock, rightPillar] = MARK_PARTS;

/**
 * Curtains open. The first page of a visit opens on the house's mark, on the
 * pods' own curtains (public/photos/pod-bed-with-curtain.jpg): charcoal cloth
 * woven with grey diamonds, falling in soft folds from a pale pleated heading
 * on a steel rail. The two pillars rise, the three blocks between them settle
 * in, the name appears, and the two curtains gather to the sides and slide
 * away, as a guest opens their pod, to reveal the page: about 1.7 seconds in
 * all.
 *
 * Shown only when the boot script (lib/theme.ts) marks <html class="splash">:
 * once per visit, never with reduced motion, never without JavaScript. It is
 * pure CSS from there, never takes a click (pointer-events: none) and is
 * hidden from assistive technology; the page underneath is already there.
 */
export function Splash() {
  return (
    <div className={styles.splash} aria-hidden="true">
      <span className={styles.curtain} data-side="left" />
      <span className={styles.curtain} data-side="right" />
      <span className={styles.rail} />
      <div className={styles.stage}>
        <svg className={styles.mark} viewBox={MARK_VIEWBOX} focusable="false">
          <path d={leftPillar} className={`${styles.part} ${styles.rise}`} style={{ animationDelay: "100ms" }} />
          <path d={rightPillar} className={`${styles.part} ${styles.rise}`} style={{ animationDelay: "260ms" }} />
          <path d={topBlock} className={`${styles.part} ${styles.drop}`} style={{ animationDelay: "510ms" }} />
          <path d={middleBlock} className={`${styles.part} ${styles.drop}`} style={{ animationDelay: "640ms" }} />
          <path d={bottomBlock} className={`${styles.part} ${styles.drop}`} style={{ animationDelay: "770ms" }} />
        </svg>
        <p className={styles.name}>{identity.name.value}</p>
        <p className={styles.greeting} lang="lo">
          ສະບາຍດີ
        </p>
      </div>
    </div>
  );
}
