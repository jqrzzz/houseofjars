"use client";

import { useEffect, useSyncExternalStore } from "react";
import { THEME_KEY, themeColor, type ThemeChoice } from "@/lib/theme";

/*
 * The guest's theme lives on <html data-theme> (set before paint by the boot
 * script in lib/theme.ts). This store reads it there, so every switch on the
 * page shows the same choice, and follows the device when the choice is Auto.
 */

const CHANGE = "hoj-theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readChoice(): ThemeChoice {
  const theme = document.documentElement.getAttribute("data-theme");
  return theme === "light" || theme === "dark" ? theme : "system";
}

function readResolved(): "light" | "dark" {
  const choice = readChoice();
  if (choice !== "system") return choice;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  // Another tab changed the theme: follow it here too.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY) return;
    apply(event.newValue === "light" || event.newValue === "dark" ? event.newValue : "system");
  };
  query.addEventListener("change", onChange);
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Points the browser bar's colour at the chosen theme, or back at the device's. */
function syncBrowserBar(choice: ThemeChoice) {
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const forDark = meta.media.includes("dark");
    const theme = choice === "system" ? (forDark ? "dark" : "light") : choice;
    meta.content = themeColor[theme];
  }
}

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  syncBrowserBar(choice);
  window.dispatchEvent(new Event(CHANGE));
}

/** Sets the theme and remembers it in this browser; a soft cross-fade where motion is welcome. */
export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Storage blocked: the choice holds for this page only.
  }
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!calm && typeof document.startViewTransition === "function") {
    document.documentElement.dataset.themeFade = "";
    const fade = document.startViewTransition(() => apply(choice));
    void fade.finished.finally(() => delete document.documentElement.dataset.themeFade);
  } else {
    apply(choice);
  }
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, readChoice, () => "system");
}

export function useResolvedTheme(): "light" | "dark" | null {
  return useSyncExternalStore<"light" | "dark" | null>(subscribe, readResolved, () => null);
}

/** Once on load: the boot script set the theme before paint; the browser bar follows it here. */
export function useBrowserBarSync() {
  useEffect(() => syncBrowserBar(readChoice()), []);
}
