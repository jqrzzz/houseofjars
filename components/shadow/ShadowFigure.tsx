import { useId } from "react";
import styles from "./ShadowFigure.module.css";

/*
 * Shadow, the house's AI concierge, drawn flat in the site's own language:
 * a cream ghost in a brown vest with two orange buttons, an orange bow tie,
 * a caramel bellhop cap with an orange band and knob, and his brown
 * clipboard. Faithful to the 3D mascot, which stays as the feature image of
 * the home page's "Ask Shadow" section.
 *
 * One drawing, two crops: "full" for empty states and the 404, "bust" (head
 * and bow tie) for the floating button and the chat window's header. Always
 * decorative: the button or heading beside it carries the name.
 */

const BODY =
  "M58 25C81 25 96 41 96 64C96 84 92 100 92 116C92 128 90 135 86 140Q80 146 72 141Q64 136 56 142Q48 148 40 143" +
  "C32 139 24 146 17 146C11 146 10 141 14 139C20 136 24 131 24 122C24 108 20 90 20 64C20 41 35 25 58 25Z";

const VIEWBOX = { full: "4 0 110 152", bust: "2 3 112 112" } as const;

export function ShadowFigure({ variant = "full", className }: { variant?: keyof typeof VIEWBOX; className?: string }) {
  // Unique per drawing: the button and the chat window's header can show him at once.
  const id = useId();
  const body = `${id}body`;
  const clip = `${id}clip`;
  return (
    <svg
      className={[styles.figure, className].filter(Boolean).join(" ")}
      viewBox={VIEWBOX[variant]}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path id={body} d={BODY} />
        <clipPath id={clip}>
          <use href={`#${body}`} />
        </clipPath>
      </defs>
      {/* The arm on his right side, behind the body. */}
      <path className={styles.ghost} d="M26 104C14 102 8 110 11 116C14 121 22 119 27 114Z" />
      <use href={`#${body}`} className={styles.ghost} />
      {/* A little shade on the side away from the light. */}
      <path className={styles.shade} d="M86 50C92 62 91 88 88 112C87 124 84 134 80 140C86 137 90 130 91 118C92 100 96 82 92 62C91 57 89 53 86 50Z" />
      <g clipPath={`url(#${clip})`}>
        <path className={styles.vest} d="M8 97H46L58 117L70 97H108V139L58 146L8 139Z" />
        <path className={styles.line} d="M46 97L55 122M70 97L61 122M33 121H45" />
      </g>
      <circle className={styles.button} cx="58" cy="126" r="2.7" />
      <circle className={styles.button} cx="58" cy="135.5" r="2.7" />
      <g className={styles.bowtie}>
        <path d="M58 101L44.5 94Q41 101 44.5 108Z" />
        <path d="M58 101L71.5 94Q75 101 71.5 108Z" />
        <rect className={styles.knot} x="54" y="97" width="8" height="8" rx="2.5" />
      </g>
      <g className={styles.cap}>
        <path className={styles.dome} d="M39 30C39 17 47 11 58 11C69 11 77 17 77 30Z" />
        <rect className={styles.band} x="37" y="26" width="42" height="7.5" rx="3.75" />
        <path className={styles.band} d="M56.5 9.5h3v3h-3Z" />
        <circle className={styles.band} cx="58" cy="7" r="4.2" />
      </g>
      <g className={styles.eyes}>
        <ellipse cx="45" cy="62" rx="5" ry="6.4" />
        <ellipse cx="71" cy="62" rx="5" ry="6.4" />
        <circle className={styles.glint} cx="46.8" cy="59.6" r="1.7" />
        <circle className={styles.glint} cx="72.8" cy="59.6" r="1.7" />
      </g>
      <ellipse className={styles.cheek} cx="34.5" cy="74" rx="6" ry="4" />
      <ellipse className={styles.cheek} cx="81.5" cy="74" rx="6" ry="4" />
      <path className={styles.smile} d="M52 72Q58 78.5 64 72" />
      <g className={styles.clipboard}>
        <rect className={styles.board} x="81" y="95" width="25" height="35" rx="3" transform="rotate(9 93.5 112.5)" />
        <rect className={styles.clip} x="88.5" y="92" width="10" height="6" rx="1.6" transform="rotate(9 93.5 112.5)" />
        <circle className={styles.ghost} cx="101" cy="126" r="5.6" />
      </g>
    </svg>
  );
}
