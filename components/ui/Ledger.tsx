import type { ReactNode } from "react";
import styles from "./Ledger.module.css";

export interface LedgerRow {
  readonly term: string;
  readonly value: ReactNode;
  readonly note?: ReactNode;
  /** A small mark set beside the value, e.g. a stamp. Decorative. */
  readonly mark?: ReactNode;
}

/**
 * The house's standards and distances, set like a register: the label, dot
 * leaders, the figure (lining, tabular numerals), and a short note. With
 * `ticks`, each row is ticked off in saffron, drawn as it scrolls into view
 * where the browser can.
 */
export function Ledger({
  rows,
  variant = "standards",
  ticks = false,
  className,
}: {
  rows: readonly LedgerRow[];
  /** "places" sets the terms as names, for lists of places and distances. */
  variant?: "standards" | "places";
  ticks?: boolean;
  className?: string;
}) {
  return (
    <dl className={[styles.ledger, styles[variant], className].filter(Boolean).join(" ")}>
      {rows.map((row) => (
        <div key={row.term} className={styles.row}>
          <dt className={styles.term}>
            {ticks ? (
              <svg className={styles.tick} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path d="M4.5 10.5 8.5 14.5 15.5 5.5" pathLength="1" />
              </svg>
            ) : null}
            <span>{row.term}</span>
          </dt>
          <dd className={styles.value}>
            {row.value}
            {row.mark ? <span className={styles.mark}>{row.mark}</span> : null}
          </dd>
          {row.note ? <dd className={styles.note}>{row.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
