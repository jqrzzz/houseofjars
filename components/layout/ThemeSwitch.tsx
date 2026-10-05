"use client";

import { useId } from "react";
import type { ThemeChoice } from "./theme-keys";
import { AutoIcon, MoonIcon, SunIcon } from "../ui/icons";
import { setTheme, useBrowserBarSync, useResolvedTheme, useThemeChoice } from "./theme-store";
import styles from "./ThemeSwitch.module.css";

/**
 * The house lamp on the header's switch: the café's pendant, drawn small for
 * this site. A squat shade with rounded shoulders and a flat bottom, under a
 * teak cap, on a cord from the top of the button. By Day it hangs unlit, a stone shade; by Evening it
 * glows. CSS reads the same data-theme and device setting as the page, so the
 * lamp is right from the first frame and never flickers.
 */
function HouseLampIcon() {
  return (
    <svg className={styles.lamp} viewBox="0 0 24 42" aria-hidden="true" focusable="false">
      <g className={styles.hang}>
        <g className={styles.halo}>
          <circle cx="12" cy="28" r="15" />
          <circle cx="12" cy="28" r="12" />
          <circle cx="12" cy="28" r="9" />
          <circle cx="12" cy="28" r="6" />
        </g>
        <path className={styles.cord} d="M12-4V15.4" />
        <ellipse className={styles.bulb} cx="12" cy="27.5" rx="3.6" ry="1.9" />
        <rect className={styles.cap} x="9.7" y="14.6" width="4.6" height="2.8" rx="0.7" />
        <path className={styles.shade} d="M1.9 27.3C1.9 21.6 6.3 17 12 17s10.1 4.6 10.1 10.3Z" />
        <path className={styles.rim} d="M2.5 25.4h19" />
      </g>
    </svg>
  );
}

/** The header's switch between Day and Evening: the lamp is lit by Evening; a press lights it, or puts it out. */
export function ThemeToggle({ className }: { className?: string }) {
  useBrowserBarSync();
  const resolved = useResolvedTheme();
  const toEvening = resolved !== "dark";
  return (
    <button
      type="button"
      className={[styles.toggle, className].filter(Boolean).join(" ")}
      aria-label={toEvening ? "Switch to the Evening (dark) theme" : "Switch to the Day (light) theme"}
      title={toEvening ? "Evening theme" : "Day theme"}
      onClick={() => setTheme(toEvening ? "dark" : "light")}
    >
      <HouseLampIcon />
    </button>
  );
}

const choices: { value: ThemeChoice; label: string; Icon: typeof SunIcon }[] = [
  { value: "system", label: "Auto", Icon: AutoIcon },
  { value: "light", label: "Day", Icon: SunIcon },
  { value: "dark", label: "Evening", Icon: MoonIcon },
];

/** The three-way choice: Auto (follow the device), Day or Evening. On the footer's teak band, or on the page (the phone menu). */
export function ThemeChoices({ className, tone = "deep" }: { className?: string; tone?: "deep" | "page" }) {
  const choice = useThemeChoice();
  const name = useId();
  return (
    <fieldset className={[styles.choices, tone === "page" ? styles.onPage : null, className].filter(Boolean).join(" ")}>
      <legend className={styles.legend}>Theme</legend>
      <div className={styles.options}>
        {choices.map(({ value, label, Icon }) => (
          <label key={value} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={value}
              checked={choice === value}
              onChange={() => setTheme(value)}
              className={styles.radio}
            />
            <Icon className={styles.optionIcon} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
