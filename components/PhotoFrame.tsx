import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { Drawing } from "./art/Drawing";
import type { DrawingName } from "./art/drawings";
import styles from "./PhotoFrame.module.css";

export interface Photo {
  readonly src: StaticImageData | string;
  readonly alt: string;
  /** Which part of the photograph stays in view when the frame crops it (CSS object-position). */
  readonly focus?: string;
}

interface PhotoFrameProps {
  /** What the photograph shows. */
  caption: string;
  /** A real photograph. Until one exists the frame shows the drawing. */
  photo?: Photo | null;
  /** The drawing that stands in for the photograph. */
  drawing: DrawingName;
  shape?: "arch" | "rect";
  /** CSS aspect-ratio, e.g. "4 / 3". */
  aspect?: string;
  /** next/image sizes hint. */
  sizes?: string;
  /** Sit the photograph in a cut-paper mat, as a window in a paper wall (default). */
  mat?: boolean;
  /** Load first: the photograph is the page's largest image above the fold (next/image preload). */
  preload?: boolean;
  /** @deprecated Use `preload`: next/image renamed it in Next 16. Kept so older callers still compile. */
  priority?: boolean;
  className?: string;
}

/**
 * A frame for a photograph of the house, drawn until the photograph exists;
 * photos swap in through the same frame.
 *
 * By default the frame sits in a cut-paper mat (docs/DESIGN.md §2.4): a
 * --paper-near ground 1.25rem wide with a card edge. By Evening the mat is
 * washed with lamplight behind the photograph, never over it. Nothing drawn
 * crosses into the picture.
 */
export function PhotoFrame({
  caption,
  photo,
  drawing,
  shape = "rect",
  aspect = "4 / 3",
  sizes = "(min-width: 60rem) 40vw, 100vw",
  mat = true,
  preload,
  priority,
  className,
}: PhotoFrameProps) {
  const figureClass = [styles.figure, className].filter(Boolean).join(" ");
  const frameClass = [styles.frame, styles[shape]].join(" ");
  const inMat = (frame: ReactNode) =>
    mat ? (
      <div className={shape === "arch" ? `${styles.mount} ${styles.archMount}` : styles.mount}>
        <div className={`${styles.mat} ${styles[shape]}`}>{frame}</div>
      </div>
    ) : (
      frame
    );

  if (!photo) {
    // The drawing is decorative: the text beside it says the same.
    return (
      <figure className={figureClass} aria-hidden="true">
        {inMat(
          <div className={`${frameClass} ${styles.drawn}`} style={{ aspectRatio: aspect }}>
            <Drawing name={drawing} className={styles.drawing} sizes={sizes} />
          </div>,
        )}
      </figure>
    );
  }

  return (
    <figure className={figureClass}>
      {inMat(
        <div className={frameClass} style={{ aspectRatio: aspect }}>
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes={sizes}
            preload={preload ?? priority ?? false}
            className={styles.image}
            style={photo.focus ? { objectPosition: photo.focus } : undefined}
          />
        </div>,
      )}
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}
