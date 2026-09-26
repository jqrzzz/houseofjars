import type { ReactNode } from "react";
import { Eyebrow } from "../ui/Section";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  eyebrow: string;
  /** This page's name for the eyebrow that glides in from a link elsewhere (see Eyebrow). */
  morph?: string;
  title: string;
  lede: ReactNode;
  /** A drawing or mark set beside the title on wide screens. */
  art?: ReactNode;
}

export function PageHeader({ eyebrow, morph, title, lede, art }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.text}>
          <Eyebrow morph={morph}>{eyebrow}</Eyebrow>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lede}>{lede}</p>
        </div>
        {art ? (
          <div className={styles.art} aria-hidden="true">
            {art}
          </div>
        ) : null}
      </div>
    </header>
  );
}
