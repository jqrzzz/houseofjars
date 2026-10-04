import styles from "./WovenBand.module.css";

export type WeavePattern = "diamond" | "lozenge" | "hooks";

interface WovenBandProps {
  /**
   * The motif: "diamond" (under the hero, and the hem of the splash's
   * curtain), "lozenge" (along the booking ticket) or "hooks" (along the top
   * of the footer).
   */
  pattern: WeavePattern;
  /** Weave the band in as it scrolls into view; without it the band is simply there. */
  weave?: boolean;
  className?: string;
}

/**
 * A woven border from the house's own curtains: gold thread and orange
 * hearts on the curtains' dark ground, with the fine ribbing of the weave.
 * The motifs are abstract and original (no naga or other sacred figures), and
 * used sparingly: one band per place. Each tile (public/brand/weave-*.svg)
 * has a thread layer and a heart layer, drawn in the theme's colours.
 */
export function WovenBand({ pattern, weave = false, className }: WovenBandProps) {
  return (
    <div
      aria-hidden="true"
      className={[styles.band, styles[pattern], weave ? styles.weave : "", className].filter(Boolean).join(" ")}
    >
      <span className={styles.thread} />
      <span className={styles.heart} />
    </div>
  );
}
