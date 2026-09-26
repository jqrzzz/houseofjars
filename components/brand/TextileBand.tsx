import styles from "./TextileBand.module.css";

interface TextileBandProps {
  className?: string;
  /** "saffron" on deep sections, "stone" on paper. */
  tone?: "saffron" | "stone" | "ink";
  size?: "s" | "m";
}

/**
 * A woven border after the hems of Lao sinh skirts: lozenges, stepped
 * diamonds and small hooks. Abstract and original; used sparingly.
 */
export function TextileBand({ className, tone = "stone", size = "m" }: TextileBandProps) {
  return <div aria-hidden="true" className={[styles.band, styles[tone], styles[size], className].filter(Boolean).join(" ")} />;
}
