"use client";

import Link from "next/link";
import { Ledger } from "@/components/ui/Ledger";
import { Eyebrow } from "@/components/ui/Section";
import { Stamp } from "@/components/ui/Stamp";
import buttons from "@/components/ui/button.module.css";
import { ArrowIcon } from "@/components/ui/icons";
import styles from "./Standards.module.css";

export interface StandardRow {
  readonly term: string;
  readonly value: string;
  readonly note: string;
  /** Words for a rubber stamp beside the value (decorative: the row says them too). */
  readonly stamp?: string;
}

/**
 * The view of ② (Standards.tsx): the server writes the rows from content/
 * and passes them; this side draws them. It sits on the client side of the
 * boundary only so the page carries its markup once (the HTML is still
 * rendered on the server, with every word in it).
 */
export function StandardsView({ rows, rules }: { rows: readonly StandardRow[]; rules: string }) {
  return (
    <div className={`container ${styles.split}`}>
      <div className={styles.intro}>
        <Eyebrow number={2} morph="house-rules">
          How we run the house
        </Eyebrow>
        <h2 id="standards-title" className={styles.heading}>
          Small things, done well, every day.
        </h2>
        <p className={styles.lede}>
          A calm stay is mostly routine: clean bathrooms, fixed times and someone at the desk whenever you need them. These
          are the house’s standards.
        </p>
        <Link href={rules} className={buttons.textLink} transitionTypes={["nav-forward"]}>
          <span>Read the house rules</span>
          <ArrowIcon />
        </Link>
      </div>
      <Ledger rows={rows.map(({ stamp, ...row }) => ({ ...row, mark: stamp ? <Stamp text={stamp} /> : undefined }))} ticks />
    </div>
  );
}
