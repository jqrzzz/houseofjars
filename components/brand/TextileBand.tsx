import styles from "./TextileBand.module.css";

export type TextilePattern = "diamond" | "lozenge" | "hooks";

interface TextileBandProps {
  /**
   * The motif: "diamond" (stepped diamonds, under the hero), "lozenge" (a
   * chain of lozenges, on the booking card) or "hooks" (squared hooks, in the
   * footer).
   */
  pattern: TextilePattern;
  /** "load" weaves the band in once as the page opens; "view" as it scrolls into view. */
  weave?: "load" | "view";
  className?: string;
}

/**
 * A woven border after the hems of Lao sinh skirts: two colours and a fine
 * warp. The motifs are abstract and original (no naga or other sacred
 * figures), and used sparingly: one band per place.
 */
export function TextileBand({ pattern, weave, className }: TextileBandProps) {
  return (
    <div
      aria-hidden="true"
      className={[styles.band, styles[pattern], weave ? styles[weave] : "", className].filter(Boolean).join(" ")}
    />
  );
}
