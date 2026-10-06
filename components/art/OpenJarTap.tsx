"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motionAllowed } from "@/lib/motion/prefs";
import { ArchWisp } from "./ArchWisp";
import styles from "./OpenJar.module.css";

/** The jar's answer to a press, in words. */
const EMPTY = "Nothing in here but air.";

/** Shown under the jar when it stays still: small and soft, like a caption. */
const shown: CSSProperties = { fontSize: "var(--step--1)", color: "var(--text-soft)" };

/**
 * The 404 jar as a button: a tap, a click or Enter wobbles it ±3° about its
 * foot (680 ms) and sends one arch wisp up from its mouth. Each press plays
 * once more. With Still or reduced motion it stays put and answers in words
 * under it instead: "Nothing in here but air." Screen readers hear that line
 * on every press, whatever the motion.
 */
export function OpenJarTap({ className, children }: { className?: string; children: ReactNode }) {
  const drawing = useRef<HTMLSpanElement>(null);
  const [wisps, setWisps] = useState(0);
  // Every press, and whether the last one was still (then the line shows).
  const [said, setSaid] = useState({ presses: 0, still: false });
  const tap = () => {
    const moving = motionAllowed();
    setSaid((last) => ({ presses: last.presses + 1, still: !moving }));
    if (!moving) return;
    drawing.current?.animate(
      [{ rotate: "0deg" }, { rotate: "3deg" }, { rotate: "-3deg" }, { rotate: "1.5deg" }, { rotate: "0deg" }],
      { duration: 680, easing: "cubic-bezier(0.37, 0, 0.63, 1)" },
    );
    setWisps((n) => n + 1);
  };
  return (
    <>
      <button type="button" className={className} onClick={tap} aria-label="Tap the empty jar">
        <span ref={drawing} className={styles.wobble}>
          {children}
        </span>
        {/* A new key each press, so the wisp rises again. */}
        {wisps ? <ArchWisp key={wisps} size={72} play className={styles.wisp} /> : null}
      </button>
      {/* Beside the button, not in it, so it is read out; a new key each press, so it is read out again. */}
      <span role="status" className={said.still ? undefined : "visually-hidden"} style={said.still ? shown : undefined}>
        {said.presses ? <span key={said.presses}>{EMPTY}</span> : null}
      </span>
    </>
  );
}
