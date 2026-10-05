import type { CSSProperties } from "react";
import { seeded } from "./stone-jar";
import styles from "./Motes.module.css";

/**
 * Lamp motes (docs/DESIGN.md §10.1): as a lamp lights, three to five warm
 * specks (4–6 px lamplight discs) rise 24–40 px and fade, all within 3 s,
 * once. Their rest frame is gone, so Still, reduced motion and screenshots
 * never show them.
 *
 * The parent must be positioned: the motes rise from --motes-x, --motes-y
 * (default its middle). They play when an ancestor's phrase plays
 * ([data-played], from StageLife) or carries [data-play]; with on="load" they
 * play once the page loads instead. --delay (a time) holds them back. The
 * spread comes from `seed`, so every build draws the same motes.
 */
export function Motes({
  count = 4,
  seed = 1,
  on = "phrase",
  className,
}: {
  count?: number;
  seed?: number;
  on?: "phrase" | "load";
  className?: string;
}) {
  const random = seeded(seed * 131 + 7);
  const n = Math.min(5, Math.max(3, Math.round(count)));
  const motes = Array.from({ length: n }, (_, k) => {
    // Spread across the source, left to right, with a little play.
    const x = ((k + 0.5) / n - 0.5) * 26 + (random() - 0.5) * 6;
    const style = {
      "--x": `${Math.round(x)}px`,
      "--dx": `${Math.round((random() - 0.5) * 12)}px`,
      "--dy": `${-Math.round(24 + random() * 16)}px`,
      "--s": `${(4 + random() * 2).toFixed(1)}px`,
      "--w": `${Math.round(k * 140 + random() * 120)}ms`,
      "--d": `${Math.round(1900 + random() * 400)}ms`,
    } as CSSProperties;
    return <i key={k} style={style} />;
  });
  return (
    <span className={[styles.motes, className].filter(Boolean).join(" ")} data-on={on} aria-hidden="true">
      {motes}
    </span>
  );
}
