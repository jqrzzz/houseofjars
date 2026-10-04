import Image, { type StaticImageData } from "next/image";
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
  /** Load first: the photograph is the page's largest image above the fold. */
  priority?: boolean;
  className?: string;
}

/** A frame for a photograph of the house, drawn until the photograph exists; photos swap in through the same frame. */
export function PhotoFrame({
  caption,
  photo,
  drawing,
  shape = "rect",
  aspect = "4 / 3",
  sizes = "(min-width: 60rem) 40vw, 100vw",
  priority = false,
  className,
}: PhotoFrameProps) {
  const figureClass = [styles.figure, className].filter(Boolean).join(" ");
  const frameClass = [styles.frame, styles[shape]].join(" ");

  if (!photo) {
    // The drawing is decorative: the text beside it says the same.
    return (
      <figure className={figureClass} aria-hidden="true">
        <div className={`${frameClass} ${styles.drawn}`} style={{ aspectRatio: aspect }}>
          <Drawing name={drawing} className={styles.drawing} sizes={sizes} />
        </div>
      </figure>
    );
  }

  return (
    <figure className={figureClass}>
      <div className={frameClass} style={{ aspectRatio: aspect }}>
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          className={styles.image}
          style={photo.focus ? { objectPosition: photo.focus } : undefined}
        />
      </div>
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}
