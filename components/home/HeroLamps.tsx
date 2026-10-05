"use client";

import type { CSSProperties } from "react";
import { HouseLamp } from "@/components/art/HouseLamp";
import styles from "./Hero.module.css";

/**
 * The house's own lamps over the hero's arch (docs/DESIGN.md §5.1): where
 * each hangs across the arch's crown, and how long its cord is (px). The
 * middle one sends up a few warm motes as it lights. Decorative, and drawn
 * here rather than on the server, so the page carries them once.
 */
const LAMPS: readonly { at: string; cord: number; motes?: number }[] = [
  { at: "22%", cord: 28 },
  { at: "50%", cord: 44, motes: 3 },
  { at: "78%", cord: 36 },
];

export function HeroLamps() {
  return (
    <div className={styles.lamps} aria-hidden="true">
      {LAMPS.map((lamp, index) => (
        <span key={lamp.at} className={styles.hang} style={{ "--at": lamp.at } as CSSProperties}>
          <HouseLamp cord={lamp.cord} index={index} motes={lamp.motes} />
        </span>
      ))}
    </div>
  );
}
