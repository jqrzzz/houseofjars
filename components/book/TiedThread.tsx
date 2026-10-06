import styles from "./TiedThread.module.css";

/*
 * The thread, tied off: the house's orange thread (the arrival route's, on
 * the home page and in the house) runs in, loops once, crosses over itself
 * and runs on. Drawn tight: that is the rest frame. The under strand breaks
 * where the loop crosses it, so the knot reads as thread, not a doodle.
 * Two paths, so the break is simply the space between them.
 */
const TAIL = "M2 30H82C87.5 30 92.4 28.2 96.5 25.4";
const LOOP = "M101.6 21.1C102.9 19.8 104 18.4 105 17C110 10 107 3 100 3C93 3 90 10 94 17C98 24 106 30 118 30H198";

/**
 * On the booking confirmation (§5.3): the thread draws in loosely and pulls
 * tight once, in 1.2 s (TiedThread.module.css). Decorative: the heading
 * beside it says the booking is made.
 */
export function TiedThread({ className }: { className?: string }) {
  return (
    <svg
      className={[styles.thread, className].filter(Boolean).join(" ")}
      viewBox="0 -12 200 48"
      width="200"
      height="48"
      aria-hidden="true"
      focusable="false"
    >
      <path className={styles.tail} pathLength={1} d={TAIL} />
      <path className={styles.loop} pathLength={1} d={LOOP} />
    </svg>
  );
}
