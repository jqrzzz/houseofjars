import type { CSSProperties } from "react";
import styles from "./ArchWisp.module.css";

/** S-curl up from a mouth at the foot, then the crown of the mark's arch (ARCH_OUTLINE), on a 40 by 64 grid. */
const WISP = "M20 64C13 57 27 50 20 43C15 38 4 33 4 24C4 15.9 10.3 10.7 20 10.7C29.7 10.7 36 15.9 36 24";

/**
 * Warm air rising from a jar or a cup and tracing the arch of the house's mark
 * (docs/DESIGN.md §2.3.4): it draws itself up from the mouth, then rises 16 px
 * and fades, once. Its rest frame is gone: with Still, reduced motion or no
 * JavaScript there is no wisp, only the jar or cup it came from.
 *
 * `size` is its height in pixels (default 64); the foot of its box is the
 * mouth it rises from. It plays when it, or an ancestor, carries [data-play],
 * or when an ancestor's phrase plays ([data-played], from StageLife).
 * Decorative.
 */
export function ArchWisp({ size = 64, play, className }: { size?: number; play?: boolean; className?: string }) {
  const scale = size / 64;
  return (
    <svg
      className={[styles.wisp, className].filter(Boolean).join(" ")}
      viewBox="0 0 40 64"
      width={Math.round(40 * scale)}
      height={Math.round(size)}
      data-play={play ? "" : undefined}
      // Two pixels on screen at any size.
      style={scale === 1 ? undefined : ({ "--sw": +(2 / scale).toFixed(2) } as CSSProperties)}
      aria-hidden="true"
      focusable="false"
    >
      <path pathLength="1" d={WISP} />
    </svg>
  );
}
