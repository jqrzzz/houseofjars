import { useId } from "react";
import styles from "./PaperTrain.module.css";
import paper from "./paper.module.css";

// A row of windows along a car, from x to x, 13 apart; `m` grows each by a margin, for its halo.
const windows = (from: number, to: number, m = 0) => {
  let d = "";
  for (let x = from; x + 9 <= to; x += 13) d += `M${x - m} ${29 - m}h${9 + 2 * m}v${8 + 2 * m}h-${9 + 2 * m}Z`;
  return d;
};
const ROWS = [
  [6, 100],
  [118, 200],
] as const;
const row = (m = 0) => ROWS.map(([a, b]) => windows(a, b, m)).join("");

/**
 * The Laos–China Railway's train in cut paper, gliding to the right: a
 * streamlined head car and the car behind it, a teak stripe with a gold
 * thread, a pantograph on the roof. By Evening its windows glow. Drawn in page
 * tokens (components/art/paper.module.css), so it follows Day and Evening.
 *
 * With `arrive`, it slides into place once as the page opens (900 ms); its
 * rest frame is in place, so Still and reduced motion simply show it there.
 * Decorative.
 */
export function PaperTrain({ arrive, className }: { arrive?: boolean; className?: string }) {
  const id = useId();
  return (
    <svg
      className={[paper.paper, styles.train, className].filter(Boolean).join(" ")}
      viewBox="0 0 240 68"
      width="240"
      height="68"
      data-arrive={arrive ? "" : undefined}
      aria-hidden="true"
      focusable="false"
    >
      {/* The line: ballast, rail and sleepers. */}
      <path className="s" d="M0 59H240V68H0Z" />
      <path className="h" d="M0 59H240" />
      <path className={styles.sleepers} d="M0 63H240" />
      <g className={styles.cars}>
        <use href={`#${id}`} className="o" />
        <g id={id}>
          <path className="l" d="M152 21l6-7l6 7M153 14h11" />
          <path className="c" d="M-6 21H104V55H-6ZM112 21H197C214 21 228 29 236 43L237.5 49Q238 55 232 55H112Z" />
          <path className="b" d="M104 25h8v26h-8ZM8 55h22v4H8ZM74 55h22v4H74ZM124 55h22v4h-22ZM196 55h22v4h-22Z" />
          <path className="w" d="M-6 43H104V47H-6ZM112 43H236.5L237 47H112Z" />
          <path className="t" d="M-6 48H104V49.5H-6ZM112 48H237.3L237.5 49.5H112Z" />
          {/* By Evening each window's light spills onto the car, in two steps. */}
          <path className="gl" d={row(2)} />
          <path className="gl" d={row(1)} />
          <path className="in" d={`${row()}M206 27Q221 29 229 39H206Z`} />
          <path className="h" d="M58 24V42M162 24V42M181 24V42" />
          <circle className="y" cx="232" cy="51.5" r="1.8" />
        </g>
      </g>
    </svg>
  );
}
