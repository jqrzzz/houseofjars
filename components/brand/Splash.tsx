import { identity } from "@/content/identity";
import { MARK_PARTS, MARK_VIEWBOX } from "./mark-shape";
import styles from "./Splash.module.css";
import { WovenBand } from "./WovenBand";

const [leftPillar, topBlock, middleBlock, bottomBlock, rightPillar] = MARK_PARTS;

/**
 * Curtain up. The first page of a visit opens on the house's mark, on a
 * curtain of teak fibre paper: the two pillars rise, the three blocks between
 * them settle in, the name appears, and the curtain rises, its woven hem cut
 * to diamond points and edged like card, to reveal the page: about 1.7
 * seconds in all.
 *
 * Shown only when the boot script (lib/theme.ts) marks <html class="splash">:
 * once per visit, never with reduced motion, never without JavaScript. It is
 * pure CSS from there, never takes a click (pointer-events: none) and is
 * hidden from assistive technology; the page underneath is already there.
 */
export function Splash() {
  return (
    <div className={styles.splash} aria-hidden="true">
      <div className={styles.stage}>
        <svg className={styles.mark} viewBox={MARK_VIEWBOX} focusable="false">
          <path d={leftPillar} className={`${styles.part} ${styles.rise}`} style={{ animationDelay: "60ms" }} />
          <path d={rightPillar} className={`${styles.part} ${styles.rise}`} style={{ animationDelay: "160ms" }} />
          <path d={topBlock} className={`${styles.part} ${styles.drop}`} style={{ animationDelay: "320ms" }} />
          <path d={middleBlock} className={`${styles.part} ${styles.drop}`} style={{ animationDelay: "400ms" }} />
          <path d={bottomBlock} className={`${styles.part} ${styles.drop}`} style={{ animationDelay: "480ms" }} />
        </svg>
        <p className={styles.name}>{identity.name.value}</p>
        <p className={styles.greeting} lang="lo">
          ສະບາຍດີ
        </p>
      </div>
      <div className={styles.hem}>
        <WovenBand pattern="diamond" />
        <span className={styles.points} />
      </div>
    </div>
  );
}
