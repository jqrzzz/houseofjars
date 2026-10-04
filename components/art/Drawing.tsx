import Image from "next/image";
import { drawings, type DrawingName } from "./drawings";

/** One drawing from the set, as a cached image. Decorative: the words around it carry the facts. */
export function Drawing({
  name,
  className,
  sizes,
  priority = false,
}: {
  name: DrawingName;
  className?: string;
  sizes?: string;
  /** Load first: the drawing is at the top of the page (a page header's art). */
  priority?: boolean;
}) {
  const { src, width, height } = drawings[name];
  // SVG needs no resizing, so it skips the image optimiser.
  return <Image src={src} width={width} height={height} alt="" sizes={sizes} unoptimized priority={priority} className={className} />;
}
