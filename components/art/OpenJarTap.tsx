"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArchWisp } from "./ArchWisp";
import styles from "./OpenJar.module.css";

/** Motion is allowed unless the guest prefers reduced motion or has chosen Still (html[data-motion="still"]). */
function motionAllowed() {
  return document.documentElement.dataset.motion !== "still" && !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The 404 jar as a button: a tap, a click or Enter wobbles it ±3° about its
 * foot (420 ms) and sends one arch wisp up from its mouth. Each press plays
 * once more. With Still or reduced motion it stays put.
 */
export function OpenJarTap({ className, children }: { className?: string; children: ReactNode }) {
  const drawing = useRef<HTMLSpanElement>(null);
  const [wisps, setWisps] = useState(0);
  const tap = () => {
    if (!motionAllowed()) return;
    drawing.current?.animate(
      [{ rotate: "0deg" }, { rotate: "3deg" }, { rotate: "-3deg" }, { rotate: "1.5deg" }, { rotate: "0deg" }],
      { duration: 420, easing: "cubic-bezier(0.37, 0, 0.63, 1)" },
    );
    setWisps((n) => n + 1);
  };
  return (
    <button type="button" className={className} onClick={tap} aria-label="Tap the empty jar">
      <span ref={drawing} className={styles.wobble}>
        {children}
      </span>
      {/* A new key each press, so the wisp rises again. */}
      {wisps ? <ArchWisp key={wisps} size={72} play className={styles.wisp} /> : null}
    </button>
  );
}
