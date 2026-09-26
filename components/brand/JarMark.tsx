import { JAR_PATH, JAR_VIEWBOX_TIGHT } from "./jar-shape";

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
      <path d={JAR_PATH} fill="currentColor" />
    </svg>
  );
}
