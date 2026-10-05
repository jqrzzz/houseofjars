"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { MOTION_EVENT, motionAllowed, REDUCED_MOTION_QUERY } from "@/lib/motion/prefs";

/*
 * The theatre's stage manager (docs/DESIGN.md, the motion toolkit). Mounted
 * once in app/layout.tsx; it renders nothing and only sets attributes:
 * - html[data-life]: script is running, so phrases may wait in their start pose;
 * - [data-stage][data-live]: the stage is within 25% of the viewport and the
 *   tab is visible, so its ambient (.amb) animations run (app/globals.css);
 * - [data-phrase][data-played]: the phrase has been at least 35% in view once,
 *   so it plays to its rest frame, and never again on this page.
 * Phrases already in view get data-played in the same frame as data-life, so
 * they never jump. Under Still or reduced motion every phrase counts as
 * played: nothing waits in a start pose. It rescans on each navigation; it
 * has no MutationObserver and no scroll listener.
 */

const SHARE = 0.35;
const THRESHOLDS = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, SHARE];
const preloaded = new Set<string>();

/** At least 35% of the phrase is in view, or it fills 35% of the screen's height (a phrase taller than the screen). */
function seen(top: number, bottom: number, visibleHeight: number, viewport: number): boolean {
  return visibleHeight > 0 && (visibleHeight >= (bottom - top) * SHARE - 0.5 || visibleHeight >= viewport * SHARE);
}

/** When the browser is idle, fetch the other theme's pictures (img[data-alt-src]), so switching theme shows them at once. */
function preloadAltPictures() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return;
  for (const img of document.querySelectorAll<HTMLImageElement>("img[data-alt-src]")) {
    const src = img.dataset.altSrc;
    if (!src || preloaded.has(src)) continue;
    preloaded.add(src);
    const picture = new Image();
    picture.decoding = "async";
    picture.src = src;
  }
}

export function StageLife(): null {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const play = (phrase: Element) => phrase.setAttribute("data-played", "");
    const unplayed = () => document.querySelectorAll("[data-phrase]:not([data-played])");

    // Phrases: those in view now play in this very frame; the rest wait for 35%.
    const viewport = window.innerHeight;
    const waiting: Element[] = [];
    const still = !motionAllowed();
    for (const phrase of unplayed()) {
      const box = phrase.getBoundingClientRect();
      const visible = Math.min(box.bottom, viewport) - Math.max(box.top, 0);
      if (still || seen(box.top, box.bottom, visible, viewport)) play(phrase);
      else waiting.push(phrase);
    }
    root.setAttribute("data-life", "");

    const phrases = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const box = entry.boundingClientRect;
          if (!seen(box.top, box.bottom, entry.intersectionRect.height, entry.rootBounds?.height ?? window.innerHeight)) continue;
          play(entry.target);
          phrases.unobserve(entry.target);
        }
      },
      { threshold: THRESHOLDS },
    );
    for (const phrase of waiting) phrases.observe(phrase);

    // Stages: live while near the screen and the tab is visible.
    const near = new Set<Element>();
    const stages = Array.from(document.querySelectorAll("[data-stage]"));
    const relight = () => {
      const visible = document.visibilityState === "visible";
      for (const stage of stages) stage.toggleAttribute("data-live", visible && near.has(stage));
    };
    const stageObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) near.add(entry.target);
          else near.delete(entry.target);
        }
        relight();
      },
      { rootMargin: "25% 0px 25% 0px" },
    );
    for (const stage of stages) stageObserver.observe(stage);

    // Choosing Still (or the device asking for reduced motion) settles every phrase at rest.
    const reduced = matchMedia(REDUCED_MOTION_QUERY);
    const onMotion = () => {
      if (motionAllowed()) return;
      for (const phrase of unplayed()) play(phrase);
      phrases.disconnect();
    };

    const hasIdle = typeof window.requestIdleCallback === "function";
    const idle = hasIdle ? window.requestIdleCallback(preloadAltPictures, { timeout: 6000 }) : window.setTimeout(preloadAltPictures, 2000);

    document.addEventListener("visibilitychange", relight);
    window.addEventListener(MOTION_EVENT, onMotion);
    reduced.addEventListener("change", onMotion);
    return () => {
      phrases.disconnect();
      stageObserver.disconnect();
      document.removeEventListener("visibilitychange", relight);
      window.removeEventListener(MOTION_EVENT, onMotion);
      reduced.removeEventListener("change", onMotion);
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [pathname]);

  return null;
}
