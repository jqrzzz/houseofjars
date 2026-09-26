import { ViewTransition, type ReactNode } from "react";
import { laoNumeral } from "@/content/text";
import { JarMark } from "../brand/JarMark";
import styles from "./Section.module.css";

interface SectionProps {
  children: ReactNode;
  tone?: "paper" | "cream" | "deep";
  /** Vertical padding. */
  space?: "l" | "m" | "none";
  id?: string;
  className?: string;
  labelledBy?: string;
}

export function Section({ children, tone = "paper", space = "l", id, className, labelledBy }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={[styles.section, styles[tone], styles[`space-${space}`], className].filter(Boolean).join(" ")}
    >
      {children}
    </section>
  );
}

interface EyebrowProps {
  children: ReactNode;
  /** A section number, set in Lao digits beside the label (decorative). */
  number?: number;
  /**
   * The page this eyebrow leads to (e.g. "the-house"). Following a link
   * there, the eyebrow and its jar glide into that page's header.
   */
  morph?: string;
  className?: string;
}

/** Small-caps label above a heading, with a tiny jar as a section marker. */
export function Eyebrow({ children, number, morph, className }: EyebrowProps) {
  const eyebrow = (
    <p className={[styles.eyebrow, className].filter(Boolean).join(" ")}>
      {number === undefined ? null : (
        <span className={styles.number} aria-hidden="true" lang="lo">
          {laoNumeral(number)}
        </span>
      )}
      <JarMark className={styles.eyebrowMark} />
      <span>{children}</span>
    </p>
  );
  return morph ? (
    <ViewTransition name={`eyebrow-${morph}`} share="morph" default="none">
      {eyebrow}
    </ViewTransition>
  ) : (
    eyebrow
  );
}
