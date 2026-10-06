import Image from "next/image";
import { drawings, type DrawingName } from "./drawings";

const DAY = { colorScheme: "light" } as const;

/**
 * One drawing from the set, as two cached images: the Day twin and the
 * Evening twin (public/art/evening/). The site's theme shows one of them
 * (`.for-day` and `.for-evening` in app/globals.css), so drawings follow the
 * Day or Evening choice, not only the device's. Both are lazy, and a lazy
 * image hidden with display:none is never fetched. With `preload` both stay
 * lazy (an eager or preloaded twin would be fetched even while hidden) and
 * are fetched at high priority, so only the twin on show loads, and first.
 * The Day twin is pinned to a light colour scheme, because an image reads
 * prefers-color-scheme from its <img>: with the device in dark mode and Day
 * chosen on the site, it still draws in Day colours. Decorative: the words
 * around it carry the facts.
 */
export function Drawing({
  name,
  className,
  sizes,
  preload,
  priority,
}: {
  name: DrawingName;
  className?: string;
  sizes?: string;
  /** Load first: the drawing is at the top of the page (a page header's art). */
  preload?: boolean;
  /** @deprecated Use `preload`, as next/image does from Next.js 16. */
  priority?: boolean;
}) {
  const { src, evening, width, height } = drawings[name];
  // Never eager: next/image's theme images stay lazy and take a fetch priority instead (its docs, "Theme detection").
  const fetchPriority = (preload ?? priority) ? "high" : undefined;
  const twin = (theme: "for-day" | "for-evening") => [theme, className].filter(Boolean).join(" ");
  // SVG needs no resizing, so both skip the image optimiser. Each reserves the drawing's own size.
  return (
    <>
      <Image
        src={src}
        width={width}
        height={height}
        alt=""
        sizes={sizes}
        unoptimized
        loading="lazy"
        fetchPriority={fetchPriority}
        className={twin("for-day")}
        style={DAY}
      />
      <Image
        src={evening}
        width={width}
        height={height}
        alt=""
        sizes={sizes}
        unoptimized
        loading="lazy"
        fetchPriority={fetchPriority}
        className={twin("for-evening")}
      />
    </>
  );
}
