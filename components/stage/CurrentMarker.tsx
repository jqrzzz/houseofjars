"use client";

import { useEffect } from "react";

/**
 * Marks with data-current the one element matching `selector` nearest the
 * middle of the screen, among those in its middle fifth (a rule beside
 * RulePlan lights its areas then); none when that band is empty. Renders
 * nothing; no scroll listener, one IntersectionObserver.
 */
export function CurrentMarker({ selector }: { selector: string }) {
  useEffect(() => {
    const near = new Set<Element>();
    let current: Element | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) near.add(entry.target);
          else near.delete(entry.target);
        }
        const middle = innerHeight / 2;
        const distance = (el: Element) => {
          const box = el.getBoundingClientRect();
          return Math.abs((box.top + box.bottom) / 2 - middle);
        };
        const next = [...near].sort((a, b) => distance(a) - distance(b))[0];
        if (next === current) return;
        current?.removeAttribute("data-current");
        next?.setAttribute("data-current", "");
        current = next;
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    for (const element of document.querySelectorAll(selector)) observer.observe(element);
    return () => {
      observer.disconnect();
      current?.removeAttribute("data-current");
    };
  }, [selector]);
  return null;
}
