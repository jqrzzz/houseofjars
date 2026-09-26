import type { ReactNode } from "react";
import styles from "./Drawing.module.css";

/*
 * Original line drawings that stand in for photographs: one stroke weight,
 * rounded caps, drawn on a 64-unit grid.
 */

interface DrawingProps {
  className?: string;
  /** Accessible description. Omit when the drawing is decorative. */
  title?: string;
}

function Drawing({ className, title, children }: DrawingProps & { children: ReactNode }) {
  return (
    <svg
      className={[styles.drawing, className].filter(Boolean).join(" ")}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function PodBedDrawing(props: DrawingProps) {
  return (
    <Drawing {...props}>
      <rect x="6" y="12" width="52" height="40" rx="4" />
      <path d="M6 20H58" />
      <rect x="10" y="40" width="44" height="7" rx="2" />
      <rect x="12" y="32.5" width="12" height="7.5" rx="3.5" />
      <path d="M18 20V22.5M14.5 26.5H21.5L19.5 22.5H16.5Z" />
      <path d="M15.2 29.3L14.4 30.4M18 29.6V30.8M20.8 29.3L21.6 30.4" />
      <rect x="28" y="27" width="6.5" height="6.5" rx="1.6" />
      <path d="M30.3 30.25H30.4M32.1 30.25H32.2" />
      <path d="M39 23H55" />
      <path d="M42 23C43.6 30 41.4 38 43 47M47 23C48.6 30 46.4 38 48 47M52 23C53.6 30 51.4 38 53 47" />
    </Drawing>
  );
}

export function ShowerDrawing(props: DrawingProps) {
  return (
    <Drawing {...props}>
      <path d="M16 56V16C16 11.6 19.6 8 24 8H38C42.4 8 46 11.6 46 16V17" />
      <path d="M38 23C38 19.7 41.6 17 46 17C50.4 17 54 19.7 54 23Z" />
      <path d="M40 27.5L39 31M44 27.5V31.5M48 27.5V31.5M52 27.5L53 31M42 35.5L41.5 38.5M46 35.5V39M50 35.5L50.5 38.5" />
      <path d="M8 56H56" />
      <circle cx="12" cy="36" r="2" />
      <path d="M14 36H16" />
    </Drawing>
  );
}

export function BreakfastDrawing(props: DrawingProps) {
  return (
    <Drawing {...props}>
      <circle cx="24" cy="38" r="16" />
      <path d="M13.5 34.5C12.6 30.6 16 28 19 29.5C22 27.6 26.6 29.6 26 33.6C28 36.6 25.4 41 22 40.4C19 43 14.2 41 14.6 38.2C12.4 37.6 12.2 35.4 13.5 34.5Z" />
      <circle cx="20" cy="35" r="3" />
      <rect x="24.5" y="42.5" width="12" height="4.6" rx="2.3" transform="rotate(-28 30.5 44.8)" />
      <circle cx="50" cy="30" r="10" />
      <circle cx="50" cy="30" r="6" />
      <path d="M56 30H59.5C61 30 62 31 62 32.5S61 35 59.5 35H55.3" />
      <path d="M47 16C45.5 14 48.5 12 47 10M52 16C50.5 14 53.5 12 52 10" />
    </Drawing>
  );
}

export function WalkDrawing(props: DrawingProps) {
  return (
    <Drawing {...props}>
      <path d="M44 8C37.4 8 32 13.2 32 19.6C32 28 44 40 44 40S56 28 56 19.6C56 13.2 50.6 8 44 8Z" />
      <circle cx="44" cy="19.5" r="4.2" />
      <path d="M10 48C16 46 15 40 21 38.5C27 37 33 42 40 44" strokeDasharray="0.1 4.5" />
      <circle cx="10" cy="48" r="2" />
      <path d="M6 56C9.3 54 12.7 58 16 56S22.7 54 26 56 32.7 58 36 56 42.7 54 46 56 52.7 58 56 56" />
    </Drawing>
  );
}

export function LuggageDrawing(props: DrawingProps) {
  return (
    <Drawing {...props}>
      <rect x="18" y="18" width="28" height="36" rx="4" />
      <path d="M26 18V12.5C26 11.7 26.7 11 27.5 11H36.5C37.3 11 38 11.7 38 12.5V18" />
      <path d="M26 22V50M38 22V50" />
      <circle cx="23" cy="57.5" r="2" />
      <circle cx="41" cy="57.5" r="2" />
      <path d="M38 14.5L48 12.5" />
      <path d="M48 9.5L54.5 8.2L55.8 14.7L49.3 16Z" />
      <circle cx="51.2" cy="11.8" r="0.9" />
    </Drawing>
  );
}
