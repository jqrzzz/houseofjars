import type { ReactNode } from "react";
import { Eyebrow } from "../ui/Section";
import styles from "./PageHeader.module.css";

type PageHeaderProps = {
  title: string;
  lede: ReactNode;
  /** A drawing or mark set beside the title on wide screens. */
  art?: ReactNode;
  /** A short line under the lede, e.g. when the page was last reviewed. */
  meta?: ReactNode;
} & (
  | {
      eyebrow: string;
      /** This page's name for the eyebrow that glides in from a link elsewhere (see Eyebrow). */
      morph?: string;
      trail?: never;
    }
  /** Breadcrumbs (components/page/Breadcrumbs), in the eyebrow's place. */
  | { trail: ReactNode; eyebrow?: never; morph?: never }
);

export function PageHeader({ eyebrow, morph, trail, title, lede, art, meta }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.text}>
          {trail ?? <Eyebrow morph={morph}>{eyebrow}</Eyebrow>}
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lede}>{lede}</p>
          {meta ? <p className={styles.meta}>{meta}</p> : null}
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
