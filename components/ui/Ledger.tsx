import type { ReactNode } from "react";
import styles from "./Ledger.module.css";

export interface LedgerRow {
  readonly term: string;
  readonly value: ReactNode;
  readonly note?: ReactNode;
}

/**
 * The house's standards and distances, set like a register: a label, the
 * figure, and a short note. Times use tabular numerals so they line up.
 */
export function Ledger({ rows, className }: { rows: readonly LedgerRow[]; className?: string }) {
  return (
    <dl className={[styles.ledger, className].filter(Boolean).join(" ")}>
      {rows.map((row) => (
        <div key={row.term} className={styles.row}>
          <dt className={styles.term}>{row.term}</dt>
          <dd className={styles.value}>{row.value}</dd>
          {row.note ? <dd className={styles.note}>{row.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
