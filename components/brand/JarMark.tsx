import { JAR_PATH, JAR_VIEWBOX_TIGHT } from "./jar-shape";

const SYMBOL_ID = "jar-mark";

/**
 * The jar, drawn once per page (in the root layout); every mark then reuses
 * it, so a page with a dozen marks carries the path only once.
 */
export function JarMarkSymbol() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <symbol id={SYMBOL_ID} viewBox={JAR_VIEWBOX_TIGHT}>
        <path d={JAR_PATH} fill="currentColor" />
      </symbol>
    </svg>
  );
}

interface JarMarkProps {
  className?: string;
  /** Accessible name. Omit for a decorative mark. */
  title?: string;
}

export function JarMark({ className, title }: JarMarkProps) {
  return (
    <svg
      className={className}
      viewBox={JAR_VIEWBOX_TIGHT}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <use href={`#${SYMBOL_ID}`} />
    </svg>
  );
}
