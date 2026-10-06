import { useId } from "react";
import type { StayRail } from "@/lib/booking/stay-rail";
import styles from "./MiniRail.module.css";

/**
 * The stay on a thread, once the dates are chosen (docs/DESIGN.md §5.3):
 * check-in, breakfast, check-out, each a ring on the house's orange thread.
 * Read aloud it is the rail's own line, stop by stop ("Check-in from 14:00 on
 * Friday 9 October"). It appears with the dates and never moves: booking is
 * motion-free. Words and times from lib/booking/stay-rail.ts.
 */
export function MiniRail({ rail, className }: { rail: StayRail; className?: string }) {
  const id = useId();
  return (
    <div className={[styles.rail, className].filter(Boolean).join(" ")}>
      <p id={`${id}-rail`} className={styles.title}>
        Your stay at the house
      </p>
      <ol role="list" className={styles.stops} aria-labelledby={`${id}-rail`}>
        {rail.stops.map((stop) => (
          <li key={stop.id} data-stop={stop.id}>
            <span className={styles.label}>{stop.label}</span>
            <span className={`${styles.time} tnum`}>
              <span className="visually-hidden"> </span>
              {stop.time}
            </span>
            <span className={styles.when}>
              <span className="visually-hidden">{stop.id === "breakfast" ? ", " : " on "}</span>
              {stop.when}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
