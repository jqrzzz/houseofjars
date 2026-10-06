"use client";

import styles from "./PaperSky.module.css";

/*
 * Pin-prick stars: zero-length round-capped strokes, one dot each, in two sets
 * that come out one after the other. Placed by hand (no random numbers), clear
 * of the moon, in the frame's upper third.
 */
const STARS = ["M98 18h0M150 34h0M196 14h0M18 22h0M122 62h0M246 26h0M84 48h0", "M112 40h0M176 52h0M220 12h0M30 58h0M268 44h0M8 40h0"];

const CLOUDS = [
  { key: "near", className: "", d: "M14 98h92a12 12 0 0 0-14-17a18 18 0 0 0-31-9a14 14 0 0 0-27 7a11 11 0 0 0-20 19Z" },
  { key: "far", className: styles.far, d: "M152 30h60a8 8 0 0 0-9-11a12 12 0 0 0-21-5a9 9 0 0 0-17 5a7 7 0 0 0-13 11Z" },
  { key: "low", className: styles.low, d: "M246 236h44a6 6 0 0 0-7-9a9 9 0 0 0-16-4a7 7 0 0 0-14 3a5 5 0 0 0-7 10Z" },
];

/**
 * The sky behind the paper stage (docs/DESIGN.md §10.1): a back plane that
 * does not move (rate 0), in three paper bands, with three cut-paper clouds
 * that drift as the reader scrolls the stage's timeline (parallax, never a
 * loop). By Evening a paper moon and pin-prick stars fade in once, the first
 * time the sky is seen and again after a switch to Evening (`phrase` makes it
 * a [data-phrase]; otherwise an ancestor's phrase plays it), and the moon
 * rises behind the house while the walk climbs (Act C). At rest the clouds
 * sit where they are drawn and, by Evening, the moon and stars are out, the
 * moon risen. Every sheet has its card edge. Decorative.
 */
export function PaperSky({ phrase }: { phrase?: boolean }) {
  // A square sky, cut to the frame from its top: whatever the frame's shape, the moon stays in it.
  const plane = { viewBox: "0 0 300 300", preserveAspectRatio: "xMidYMin slice", focusable: "false" } as const;
  return (
    <div className={styles.sky} data-phrase={phrase ? "" : undefined} aria-hidden="true">
      <svg {...plane} className={`${styles.plane} ${styles.back}`}>
        <path className={styles.band2} d="M-50 160Q40 150 150 157T350 152V300H-50Z" />
        <path className={styles.band3} d="M-50 226Q50 218 150 224T350 220V300H-50Z" />
      </svg>
      {/* The moon on its own sheet, so it can rise whole (its craters with it) while the stars keep still. */}
      <div className={styles.moonRise}>
        <svg {...plane} className={`${styles.plane} ${styles.night} amb`}>
          <circle className={styles.moon} cx="58" cy="40" r="14" />
          <path className={styles.crater} d="M51 35a3 3 0 1 0 .1 0ZM62 46a2.1 2.1 0 1 0 .1 0ZM65 32a1.4 1.4 0 1 0 .1 0Z" />
        </svg>
      </div>
      <svg {...plane} className={`${styles.plane} ${styles.night} amb`}>
        <path className={styles.stars} d={STARS[0]} />
        <path className={`${styles.stars} ${styles.late}`} d={STARS[1]} />
      </svg>
      {CLOUDS.map((cloud) => (
        <svg key={cloud.key} {...plane} className={`${styles.plane} ${styles.cloud} ${cloud.className}`}>
          <path d={cloud.d} />
        </svg>
      ))}
    </div>
  );
}
