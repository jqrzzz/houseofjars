"use client";

import { useId, type AnimationEvent, type CSSProperties } from "react";
import glow from "./glow.module.css";
import styles from "./HouseLamp.module.css";
import { Motes } from "./Motes";

/**
 * The first phrase is over, every mote gone (lamp-hung, a moment rather than
 * a move, in HouseLamp.module.css): from now on a bulb lit again, by a theme
 * switch, catches at once ([data-hung] sets --light-at to 0). An attribute,
 * because a custom property an animation sets may not time other animations.
 */
function hung(event: AnimationEvent<HTMLSpanElement>) {
  if (event.target === event.currentTarget && event.animationName.endsWith("lamp-hung")) event.currentTarget.setAttribute("data-hung", "");
}

/**
 * One of the house's own lamps (the café pendant with its stone shade, as in
 * the lamp photograph), never a generic lantern: a 1 px cord as long as
 * `cord`, an 8 by 3 teak cap and a squat bell shade 28 wide and 20 tall, flat
 * at the foot. Lit in both lights: a soft alabaster glow by Day, lamplight by
 * Evening, with a glow disc 2.2 times the shade's width behind it. Units are
 * pixels.
 *
 * The cord is the lamp's ::after, not part of the drawing, so the Lamplighting
 * (HouseLamp.module.css) can pay it out from the ceiling while the drawing,
 * the cap and the shade, is let down on it: two moves the compositor runs,
 * smooth even while the page is still starting up.
 *
 * `index` is the lamp's place in its row, left to right: it staggers the
 * Lamplighting. `motes` sends a few warm motes up as this lamp lights.
 * Decorative: the words beside it carry the facts.
 */
export function HouseLamp({ cord, index, motes, className }: { cord: number; index: number; motes?: number; className?: string }) {
  const id = useId();
  const top = cord + 3;
  const height = cord + 24;
  // The bell: a dome over the cap, round shoulders, a skirt flaring to a flat foot.
  const shade =
    `M12 ${top}H20C25 ${top} 26 ${top + 4} 26.5 ${top + 8}C27 ${top + 13} 29 ${top + 17} 30 ${top + 20}` +
    `H2C3 ${top + 17} 5 ${top + 13} 5.5 ${top + 8}C6 ${top + 4} 7 ${top} 12 ${top}Z`;
  return (
    <span className={[styles.lamp, className].filter(Boolean).join(" ")} style={{ "--i": index } as CSSProperties} onAnimationEnd={hung}>
      <span className={`${glow.disc} ${styles.halo}`} />
      <svg viewBox={`0 0 32 ${height}`} width="32" height={height} aria-hidden="true" focusable="false">
        <rect x="12" y={cord} width="8" height="3" />
        {/* The card edge: the shade again, offset, behind it. */}
        <use href={`#${id}`} />
        <path id={id} d={shade} />
        {/* A vein in the stone, as in the alabaster shades. */}
        <path d={`M7 ${top + 13}Q15 ${top + 9} 25 ${top + 15}`} />
      </svg>
      {motes ? <Motes count={motes} seed={index + 1} on="load" className={styles.motes} /> : null}
    </span>
  );
}
