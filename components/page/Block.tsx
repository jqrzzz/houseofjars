import type { ReactNode } from "react";
import styles from "./Block.module.css";

interface BlockProps {
  /** Used for the heading id and in-page links. */
  id: string;
  title: string;
  /** A short line under the heading, or a drawing. */
  aside?: ReactNode;
  children: ReactNode;
  tone?: "paper" | "cream";
}

/** A titled section of a content page: heading on the left, text on the right on wide screens. */
export function Block({ id, title, aside, children, tone = "paper" }: BlockProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`${styles.block} ${styles[tone]}`}>
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.head}>
            <h2 id={`${id}-title`} className={styles.title}>
              {title}
            </h2>
            {aside ? <div className={styles.aside}>{aside}</div> : null}
          </div>
          <div className={styles.body}>{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Running text inside a Block. */
export function Prose({ children }: { children: ReactNode }) {
  return <div className={styles.prose}>{children}</div>;
}

/**
 * A plain list with a small saffron jar for each item; `columns` sets short
 * items side by side on wide screens, `numbered` counts them (to match a
 * numbered drawing).
 */
export function TickList({
  items,
  columns = false,
  numbered = false,
}: {
  items: readonly ReactNode[];
  columns?: boolean;
  numbered?: boolean;
}) {
  const className = [styles.ticks, columns ? styles.columns : "", numbered ? styles.numbered : ""].filter(Boolean).join(" ");
  const children = items.map((item, index) => <li key={index}>{item}</li>);
  return numbered ? (
    <ol className={className}>{children}</ol>
  ) : (
    <ul role="list" className={className}>
      {children}
    </ul>
  );
}
