"use client";

import { useId, useSyncExternalStore, type JSX } from "react";
import { subscribeMotion, useMotionChoice } from "@/lib/motion/hooks";
import { REDUCED_MOTION_QUERY, setMotion, type MotionChoice as Choice } from "@/lib/motion/prefs";
import plates from "../layout/ThemeSwitch.module.css";
import styles from "./MotionChoice.module.css";

/** Whether the device asks for less motion. */
function deviceReduces(): boolean {
  try {
    return matchMedia(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}

/** The house's thread, drawn for this site: slack and moving (Full), or pulled taut and still (Still). */
function ThreadIcon({ moving }: { moving: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className={`${plates.optionIcon} ${styles.icon}`}>
      <path
        className={moving ? styles.wave : undefined}
        d={moving ? "M1.5 8c1.4-3.3 3-3.3 4.3 0s2.9 3.3 4.3 0 2.7-3.1 4.4-.4" : "M1.5 8h13"}
      />
      <circle cx="1.5" cy="8" r="1.35" />
      <circle cx="14.5" cy={moving ? "7.6" : "8"} r="1.35" />
    </svg>
  );
}

const choices: { value: Choice; label: string }[] = [
  { value: "full", label: "Full" },
  { value: "still", label: "Still" },
];

/**
 * Motion: Full or Still, for the whole site (lib/motion/prefs.ts). It sits
 * beside the theme choice in the footer and in the phone menu, on the teak
 * band ("deep") or on the page. A device set to reduce motion wins whatever
 * the choice, so then the switch shows Still, Full can't be chosen, and a line
 * under it says why. The guest's own choice is kept for when the device
 * setting changes.
 */
export function MotionChoice({ tone = "deep", className }: { tone?: "deep" | "page"; className?: string }): JSX.Element {
  const choice = useMotionChoice();
  // Not known on the server: the stored choice shows until the page is running.
  const reduced = useSyncExternalStore(subscribeMotion, deviceReduces, () => false);
  const name = useId();
  const hint = useId();
  const note = useId();
  return (
    <fieldset
      className={[plates.choices, tone === "page" ? plates.onPage : null, className].filter(Boolean).join(" ")}
      aria-describedby={reduced ? `${note} ${hint}` : hint}
    >
      <legend className={plates.legend}>Motion</legend>
      <p id={hint} className="visually-hidden">
        Still keeps every scene on the site at rest. A device set to reduce motion is always respected.
      </p>
      <div className={plates.options}>
        {choices.map(({ value, label }) => (
          <label key={value} className={`${plates.option} ${styles.option}`}>
            <input
              type="radio"
              name={name}
              value={value}
              checked={reduced ? value === "still" : choice === value}
              disabled={reduced && value === "full"}
              onChange={() => setMotion(value)}
              className={plates.radio}
            />
            <ThreadIcon moving={value === "full"} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {reduced ? (
        <p id={note} className={styles.note}>
          Your device asks for less motion.
        </p>
      ) : null}
    </fieldset>
  );
}
