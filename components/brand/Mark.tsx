import { ARCH_OUTLINE, MARK_PATH, MARK_VIEWBOX } from "./mark-shape";

const SYMBOL_ID = "house-mark";

/** The id of the arch clip path that frames photographs (PhotoFrame's "arch" shape). */
export const ARCH_CLIP_ID = "arch-frame";

/** The id of the cut along a "no" icon's slash (components/ui/HouseIcon.tsx), on the icons' 256 grid. */
export const ICON_CUT_ID = "icon-cut";

/**
 * The mark, the arch frame and the cut for "no" icons, drawn once per page
 * (in the root layout); every mark then reuses the symbol, so a page with a
 * dozen marks carries the path only once.
 */
export function MarkSymbol() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <symbol id={SYMBOL_ID} viewBox={MARK_VIEWBOX}>
        <path d={MARK_PATH} fill="currentColor" />
      </symbol>
      <clipPath id={ARCH_CLIP_ID} clipPathUnits="objectBoundingBox">
        <path d={ARCH_OUTLINE} />
      </clipPath>
      <mask id={ICON_CUT_ID} maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
        <rect width="256" height="256" fill="#fff" />
        <path d="M48 48L208 208" stroke="#000" strokeWidth="34" />
      </mask>
    </svg>
  );
}

interface MarkProps {
  className?: string;
  /** Accessible name. Omit for a decorative mark. */
  title?: string;
}

/** The arch mark in the text's colour, 2:3: size it by its height. */
export function Mark({ className, title }: MarkProps) {
  return (
    <svg
      className={className}
      viewBox={MARK_VIEWBOX}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <use href={`#${SYMBOL_ID}`} />
    </svg>
  );
}
