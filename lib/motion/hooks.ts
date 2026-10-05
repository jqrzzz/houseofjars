"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { applyMotion, MOTION_EVENT, MOTION_KEY, motionAllowed, parseMotion, readMotion, REDUCED_MOTION_QUERY, type MotionChoice } from "./prefs";

/*
 * The motion toolkit (docs/DESIGN.md, the motion system). Nothing here listens
 * to scroll: CSS timelines and these IntersectionObservers do that work.
 */

/** Wakes on the device's reduced-motion setting, a choice made on this page, or one made in another tab. */
export function subscribeMotion(onChange: () => void): () => void {
  const query = matchMedia(REDUCED_MOTION_QUERY);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== MOTION_KEY) return;
    const choice = parseMotion(event.newValue);
    if (choice !== readMotion()) applyMotion(choice);
  };
  query.addEventListener("change", onChange);
  window.addEventListener(MOTION_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener(MOTION_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Whether things may move here: false on the server and until hydration, so the rest frame is what renders first. */
export function useMotionAllowed(): boolean {
  return useSyncExternalStore(subscribeMotion, motionAllowed, () => false);
}

/** The guest's Full or Still choice (Full on the server). */
export function useMotionChoice(): MotionChoice {
  return useSyncExternalStore<MotionChoice>(subscribeMotion, readMotion, () => "full");
}

/** True while the element is in view (with `once`, true from the first time it is). */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  { rootMargin = "0px", threshold = 0, once = false }: { rootMargin?: string; threshold?: number; once?: boolean } = {},
): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { rootMargin, threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold, once]);
  return inView;
}

/**
 * The index of the last step (elements matching `selector` inside `container`)
 * that has reached the band `rootMargin` cuts out of the viewport, such as
 * "-45% 0px -55% 0px" for a line 45% down. -1 before the first; it follows the
 * reader back up too.
 */
export function useActiveStep(container: RefObject<HTMLElement | null>, selector: string, rootMargin: string): number {
  const [active, setActive] = useState(-1);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const steps = Array.from(root.querySelectorAll(selector));
    if (steps.length === 0) return;
    const reached = steps.map(() => false);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = steps.indexOf(entry.target);
          if (index < 0) continue;
          // In the band, or already above it.
          reached[index] = entry.isIntersecting || entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
        }
        setActive(reached.lastIndexOf(true));
      },
      { rootMargin, threshold: 0 },
    );
    for (const step of steps) observer.observe(step);
    return () => observer.disconnect();
  }, [container, selector, rootMargin]);
  return active;
}
