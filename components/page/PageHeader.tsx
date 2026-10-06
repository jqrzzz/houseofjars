import type { ReactNode } from "react";
import { Eyebrow } from "../ui/Section";
import { ShareButton } from "../ui/ShareButton";
import styles from "./PageHeader.module.css";

type PageHeaderProps = {
  title: string;
  lede: ReactNode;
  /** A drawing or a small scene beside the title (above it on phones). Decorative. */
  art?: ReactNode;
  /**
   * How the art sits:
   * - "tile" (default): a drawing beside the title on wide screens, and on
   *   phones a 6rem paper tile above the eyebrow;
   * - "scene": a small scene that is its own card (a Diorama), a little wider
   *   beside the title, and 8rem wide above the eyebrow on phones;
   * - "band": a long, low picture (a train on its line) along the foot of the
   *   header on wide screens, and across its top on phones.
   */
  artShape?: "tile" | "scene" | "band";
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

export function PageHeader({ eyebrow, morph, trail, title, lede, art, artShape = "tile", meta }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={["container", styles.grid, art ? styles[artShape] : ""].filter(Boolean).join(" ")}>
        <div className={styles.text}>
          {trail ?? <Eyebrow morph={morph}>{eyebrow}</Eyebrow>}
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lede}>{lede}</p>
          {meta ? <p className={styles.meta}>{meta}</p> : null}
          <ShareButton className={styles.share} />
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
