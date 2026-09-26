import type { ReactNode } from "react";
import { JarMark } from "../brand/JarMark";
import styles from "./Section.module.css";

interface SectionProps {
  children: ReactNode;
  tone?: "paper" | "cream" | "deep" | "band";
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

/** Small-caps label above a heading, with a tiny jar as a section marker. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={[styles.eyebrow, className].filter(Boolean).join(" ")}>
      <JarMark className={styles.eyebrowMark} />
      <span>{children}</span>
    </p>
  );
}
