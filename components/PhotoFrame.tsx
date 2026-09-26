import Image, { type StaticImageData } from "next/image";
import { JarMark } from "./brand/JarMark";
import styles from "./PhotoFrame.module.css";

export interface Photo {
  readonly src: StaticImageData | string;
  readonly alt: string;
}

interface PhotoFrameProps {
  /** What the photograph shows (or will show). */
  caption: string;
  /** A real photograph. Until one exists the frame renders a stone placeholder. */
  photo?: Photo;
  shape?: "arch" | "jar" | "rect";
  /** CSS aspect-ratio, e.g. "4 / 5". Ignored for the jar shape (always square). */
  aspect?: string;
  /** next/image sizes hint. */
  sizes?: string;
  className?: string;
  priority?: boolean;
}

export function PhotoFrame({
  caption,
  photo,
  shape = "arch",
  aspect = "4 / 5",
  sizes = "(min-width: 60rem) 40vw, 100vw",
  className,
  priority = false,
}: PhotoFrameProps) {
  const frameClass = [styles.frame, styles[shape], photo ? "" : styles.placeholder].filter(Boolean).join(" ");
  const style = shape === "jar" ? undefined : { aspectRatio: aspect };

  if (!photo) {
    // Decorative until a real photograph exists, so hidden from assistive tech.
    return (
      <figure className={[styles.figure, className].filter(Boolean).join(" ")} aria-hidden="true">
        <div className={frameClass} style={style}>
          <JarMark className={styles.watermark} />
          <figcaption className={styles.placeholderCaption}>{caption}</figcaption>
        </div>
      </figure>
    );
  }

  return (
    <figure className={[styles.figure, className].filter(Boolean).join(" ")}>
      <div className={frameClass} style={style}>
        <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} className={styles.image} />
      </div>
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}
