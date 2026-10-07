"use client";

import type { CSSProperties } from "react";
import { HouseLamp } from "@/components/art/HouseLamp";
import styles from "./Hero.module.css";

/**
 * The house's own lamps over the hero's arch (docs/DESIGN.md §5.1, §10.11):
 * where each hangs across the arch's crown, and how long its cord is (px).
 * They are let down on their cords and catch light one by one, left to
 * right; each sends up one warm mote as it lights, three in all. Afterwards
 * a bulb stutters now and then (HouseLamp.module.css), each on its own slow
 * cycle (Hero.module.css). The row is a stage (data-stage), so StageLife
 * rests that stutter while the lamps are off screen. Decorative, and drawn
 * here rather than on the server, so the page carries them once.
 */
const LAMPS: readonly { at: string; cord: number; motes?: number }[] = [
  { at: "22%", cord: 28, motes: 1 },
  { at: "50%", cord: 44, motes: 1 },
  { at: "78%", cord: 36, motes: 1 },
];

export function HeroLamps() {
  return (
    <div className={styles.lamps} data-stage="" aria-hidden="true">
      {LAMPS.map((lamp, index) => (
        <span key={lamp.at} className={styles.hang} style={{ "--at": lamp.at } as CSSProperties}>
          <HouseLamp cord={lamp.cord} index={index} motes={lamp.motes} />
        </span>
      ))}
    </div>
  );
}
