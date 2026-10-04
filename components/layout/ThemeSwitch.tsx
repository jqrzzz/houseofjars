"use client";

import { useId } from "react";
import type { ThemeChoice } from "@/lib/theme";
import { AutoIcon, MoonIcon, SunIcon } from "../ui/icons";
import { setTheme, useBrowserBarSync, useResolvedTheme, useThemeChoice } from "./theme-store";
import styles from "./ThemeSwitch.module.css";

/**
 * The header's switch between Day and Evening. It shows the theme it would
 * switch to; which icon shows before the page knows the theme is decided by
 * CSS from the same data-theme and device setting, so it never flickers.
 */
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
      <MoonIcon className={styles.moon} />
      <SunIcon className={styles.sun} />
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
