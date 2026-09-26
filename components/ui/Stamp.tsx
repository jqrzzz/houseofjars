import { useId } from "react";

/**
 * A round rubber stamp: words around the rim, a tick in the middle.
 * Decorative (the words are always said elsewhere on the page too).
 */
export function Stamp({ text, className }: { text: string; className?: string }) {
  const rim = useId();
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <path id={rim} d="M50 50m-35 0a35 35 0 1 1 70 0a35 35 0 1 1-70 0" />
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="24" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text fontSize="10" fontWeight="650" letterSpacing="1" fill="currentColor">
        <textPath href={`#${rim}`} textLength="212" lengthAdjust="spacing">
          {`${text.toUpperCase()} ·`}
        </textPath>
      </text>
      <path d="M39 51l7.5 7.5L62 42" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
