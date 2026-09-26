import type { ReactNode } from "react";
import { Eyebrow } from "../ui/Section";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  lede: ReactNode;
  /** A drawing or mark set beside the title on wide screens. */
  art?: ReactNode;
}

export function PageHeader({ eyebrow, title, lede, art }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.text}>
          <Eyebrow>{eyebrow}</Eyebrow>
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
