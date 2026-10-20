import { shadowDock, shadowFigure } from "@/components/concierge/mascot";
import styles from "./ShadowMascot.module.css";

/*
 * Shadow as the home page and the dock show him: the 3D mascot, whole and
 * trimmed to his outline, before a soft disc of lamplight, as the dock has
 * him. "small" is the dock's cut (up to 72px tall), "large" the figure's (up
 * to 120px); the CSS that places him sets his height (--mascot-height).
 * Always decorative: the heading or button beside him carries the name.
 */
export function ShadowMascot({ size = "large", className }: { size?: "small" | "large"; className?: string }) {
  const art = size === "small" ? shadowDock : shadowFigure;
  return (
    <span className={[styles.mascot, className].filter(Boolean).join(" ")}>
      {/* Two tiny files picked by the screen's sharpness: next/image would add nothing but weight. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.figure}
        src={art.src}
        srcSet={`${art.src} 1x, ${art.src2x} 2x`}
        width={art.width}
        height={art.height}
        alt=""
        decoding="async"
        draggable={false}
      />
    </span>
  );
}
