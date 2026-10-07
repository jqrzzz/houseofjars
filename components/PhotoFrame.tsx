import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { Drawing } from "./art/Drawing";
import type { DrawingName } from "./art/drawings";
import styles from "./PhotoFrame.module.css";

export interface Photo {
  /** The photograph itself; a page that only shows its drawing need not carry it. */
  readonly src?: StaticImageData | string;
  readonly alt: string;
  /** Which part of the photograph stays in view when the frame crops it (CSS object-position). */
  readonly focus?: string;
  /** The photograph's size in pixels, so the frame can ask for enough of it (coverSizes). */
  readonly size?: readonly [width: number, height: number];
  /**
   * The photograph redrawn in the house's paper style (public/art/): what the
   * site shows in its place everywhere but the booking page (see `real`).
   */
  readonly drawing?: DrawingName;
  /** What the drawing shows, for screen readers. */
  readonly drawnAlt?: string;
}

/** How much larger than its frame a photograph is drawn at rest: the settled scale (PhotoFrame.module.css). */
const REST_SCALE = 1.08;

/** A CSS aspect-ratio ("2 / 3", "1.5") as a number, width over height. */
function ratioOf(aspect: string): number {
  const [width, height = 1] = aspect.split("/").map((part) => Number(part.trim()));
  return width! / height;
}

/**
 * The sizes hint for a photograph that covers its frame: each length is
 * scaled by how much wider than the frame the photograph is drawn, so the
 * browser fetches enough pixels. A photograph wider than its frame is cropped
 * at the sides and drawn as tall as the frame, so wider than it by the ratio
 * of their aspects; every photograph is also drawn a little larger than its
 * frame at rest (REST_SCALE). Without the photograph's size the hint is kept
 * as it is. The factor goes first, so next/image still reads the vw lengths.
 */
export function coverSizes(sizes: string, aspect: string, size?: Photo["size"]): string {
  if (!size) return sizes;
  const factor = Math.ceil(Math.max(1, size[0] / size[1] / ratioOf(aspect)) * REST_SCALE * 100) / 100;
  return splitTop(sizes)
    .map((entry) => {
      const { condition, length } = splitLength(entry.trim());
      return `${condition}calc(${factor} * ${length})`;
    })
    .join(", ");
}

/** A sizes list split at its top-level commas (not those inside a calc() or min()). */
function splitTop(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const char = list[i];
    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "," && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(list.slice(start));
  return parts;
}

/** One sizes entry as its media condition (with its trailing space, or "") and its length: the last token, or the last function call. */
function splitLength(entry: string): { condition: string; length: string } {
  let at = entry.length;
  if (entry.endsWith(")")) {
    let depth = 0;
    for (at = entry.length - 1; at >= 0; at--) {
      if (entry[at] === ")") depth++;
      else if (entry[at] === "(" && --depth === 0) break;
    }
    while (at > 0 && /[\w-]/.test(entry[at - 1]!)) at--;
  } else {
    at = entry.lastIndexOf(" ") + 1;
  }
  return { condition: entry.slice(0, at), length: entry.slice(at) };
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
  /**
   * A small plate tucked into the foot of the mat, beside the caption (the
   * hero's guest score). It sits on the mat and the page, never over the
   * photograph.
   */
  plate?: ReactNode;
  /**
   * Show the photograph itself. Off by default: a photograph with a drawing
   * shows its drawing, so the real photographs appear only where a page asks
   * for them (the booking page, docs/DESIGN.md §10.5).
   */
  real?: boolean;
  /** @deprecated Use `preload`: next/image renamed it in Next 16. Kept so older callers still compile. */
  priority?: boolean;
  className?: string;
}

/**
 * A frame for a view of the house. It shows, in order of preference:
 * - the photograph itself, only when the page asks for it (`real`);
 * - else the photograph's drawing, filling the frame as the photograph did,
 *   with the photograph's caption and its own alt text;
 * - else, with no photograph, a decorative drawing set inside the frame.
 *
 * By default the frame sits in a cut-paper mat (docs/DESIGN.md §2.4): a
 * --paper-near ground 1.5 to 2.25rem wide with a card edge, and a narrow
 * cream slip rimmed with a gilt line round the window. A soft lamplight glow
 * stands behind it, and the picture comes up out of the paper as it scrolls
 * into view. By Evening the mat is washed with lamplight behind the picture,
 * never over it. Nothing drawn crosses into a photograph.
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
  plate,
  real = false,
  className,
}: PhotoFrameProps) {
  const figureClass = [styles.figure, plate ? styles.plated : null, className].filter(Boolean).join(" ");
  const frameClass = [styles.frame, styles[shape]].join(" ");
  const inMat = (frame: ReactNode) =>
    mat ? (
      <div className={shape === "arch" ? `${styles.mount} ${styles.archMount}` : styles.mount}>
        <div className={`${styles.mat} ${styles[shape]}`}>
          <div className={`${styles.window} ${styles[shape]}`}>{frame}</div>
        </div>
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

  if (photo.drawing && (!real || !photo.src)) {
    // The photograph's drawing fills the frame and settles in it as the photograph would.
    return (
      <figure className={figureClass}>
        {inMat(
          <div className={frameClass} style={{ aspectRatio: aspect }}>
            <Drawing
              name={photo.drawing}
              alt={photo.drawnAlt ?? photo.alt}
              className={`${styles.image} ${styles.scene}`}
              sizes={sizes}
              preload={preload ?? priority}
            />
          </div>,
        )}
        {plate ? <div className={styles.plate}>{plate}</div> : null}
        <figcaption className={styles.caption}>{caption}</figcaption>
      </figure>
    );
  }

  if (!photo.src) return null;

  return (
    <figure className={figureClass}>
      {inMat(
        <div className={frameClass} style={{ aspectRatio: aspect }}>
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes={coverSizes(sizes, aspect, photo.size)}
            preload={preload ?? priority ?? false}
            className={styles.image}
            style={photo.focus ? { objectPosition: photo.focus } : undefined}
          />
        </div>,
      )}
      {plate ? <div className={styles.plate}>{plate}</div> : null}
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}
