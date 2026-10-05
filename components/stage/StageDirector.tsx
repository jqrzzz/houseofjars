"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useActiveStep } from "@/lib/motion/hooks";

/**
 * The paper stage's director (docs/DESIGN.md §5.1): it follows the reader
 * through the text beside a stage and tells the stage where the story is.
 * Renders nothing. The steps are the elements matching `selector` inside the
 * element with id `steps`; each carries data-act ("a", "b", "c" or "d") and,
 * for the walk's stops, data-stop (the stop's index). The step that has
 * reached a line `line` down the screen (45% by default) is current: it gets
 * data-current, and the figure with id `stage` gets data-act, data-step and
 * --walk (how far the walk has come, 0 to 1). Elements in the figure with
 * data-play-at="k" get data-play once stop k is reached (the wisp at the
 * desk). Browsers without scroll timelines play the acts from these; with
 * them, only the will-change hints and the once-only air use them. When none
 * of the steps is shown (a still on phones), it leaves the stage at rest.
 */
export function StageDirector({
  stage,
  steps,
  selector = "[data-act]",
  line = 0.45,
}: {
  stage: string;
  steps: string;
  selector?: string;
  line?: number;
}) {
  const container = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    container.current = document.getElementById(steps);
  }, [steps]);
  const margin = `-${Math.round(line * 100)}% 0px -${100 - Math.round(line * 100)}% 0px`;
  const active = useActiveStep(container, selector, margin);

  useEffect(() => {
    const figure = document.getElementById(stage);
    const items = Array.from(container.current?.querySelectorAll<HTMLElement>(selector) ?? []);
    if (!figure || !items.some((item) => item.getClientRects().length > 0)) return;
    // Before the first step: wait until the first step is surely below the line, as the observer will say.
    if (active < 0 && (items[0]?.getBoundingClientRect().top ?? 0) < window.innerHeight * line) return;
    const item = items[active];
    const act = item?.dataset.act ?? "none";
    const rings = figure.querySelectorAll<HTMLElement>("[data-ring]");
    const step = act === "d" ? rings.length - 1 : act === "c" ? Number(item?.dataset.stop ?? -1) : -1;
    const walk = act === "d" ? 1 : step >= 0 ? Number(rings[step]?.style.getPropertyValue("--at") || 0) : 0;
    figure.dataset.act = act;
    figure.dataset.step = String(step);
    figure.style.setProperty("--walk", String(walk));
    for (const other of items) other.toggleAttribute("data-current", other === item);
    for (const air of figure.querySelectorAll<HTMLElement>("[data-play-at]")) {
      if (step >= Number(air.dataset.playAt)) air.setAttribute("data-play", "");
    }
  }, [active, stage, selector, line]);

  return null;
}
