"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** The page this page load counted last; null before its first. */
let counted: string | null = null;

/** Where the browser came from, without the path: "https://www.google.com", "android-app://com.google.android.gm". */
function cameFrom(): string | null {
  try {
    const from = new URL(document.referrer);
    return `${from.protocol}//${from.host}`;
  } catch {
    return null;
  }
}

/**
 * Tells the site's server that a page was seen (POST /api/page-view, which
 * adds it to the house's counts in Shadow). Nothing is stored in the browser
 * and no cookie is set. The first page the browser loads also says where it
 * came from (the site before, without its path, and a link's own utm_source),
 * which the server reduces to a name such as "google" or "chatgpt". A browser
 * that asks sites not to follow it (Do Not Track, Global Privacy Control) is
 * not counted.
 */
export function PageCounter() {
  const path = usePathname();

  useEffect(() => {
    const browser = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (browser.doNotTrack === "1" || browser.globalPrivacyControl === true) return;
    // Once per page seen, however often React runs this (twice in development).
    if (path === counted) return;
    // A page reloaded, or come back to with Back, is not a new visit.
    const navigation = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
    const landing = counted === null && navigation?.type !== "reload" && navigation?.type !== "back_forward";
    counted = path;
    const view = landing
      ? { path, landing, referrer: cameFrom(), utm_source: new URLSearchParams(window.location.search).get("utm_source") }
      : { path };
    fetch("/api/page-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(view),
      credentials: "omit",
      keepalive: true,
    }).catch(() => {
      // Not counted; the visitor never notices.
    });
  }, [path]);

  return null;
}
