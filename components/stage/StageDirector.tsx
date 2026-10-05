"use client";

import { useEffect } from "react";

/** The acts in their order on the timeline. */
const ACTS = ["none", "a", "b", "c", "d"];

/**
 * The paper stage's director (docs/DESIGN.md §5.1): it follows the reader
 * through the steps beside a stage and tells the stage where the story is.
 * Renders nothing. The steps are the elements matching `selector` inside the
 * element with id `steps`; each carries data-act ("a", "b", "c" or "d") and,
 * for the walk's stops, data-stop (the stop's index). The last step whose top
 * has reached a line `line` down the screen (45% by default) is current: it
 * gets data-current, and the figure with id `stage` gets data-act, data-step
 * and --walk (how far the walk has come, 0 to 1). Elements in the figure with
 * data-play-at="k" get data-play once stop k is reached (the wisp at the
 * desk), and those with data-play-act="b" once that act is reached (the
 * hanging sign's breath of wind as the house opens); neither loses it.
 *
 * Browsers without scroll timelines play the acts from these; with them, the
 * will-change hints, the once-only air and the current stop's marks use them.
 * An observer on the line only says when to look (any step crossing it, either
 * way); the steps' own positions decide, so a fast scroll or a jump (a link, a
 * reload part-way down) lands on the right step.
 * When none of the steps is shown (a still on phones), it leaves the stage at
 * rest.
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
  useEffect(() => {
    const figure = document.getElementById(stage);
    const items = Array.from(document.getElementById(steps)?.querySelectorAll<HTMLElement>(selector) ?? []);
    if (!figure || items.length === 0) return;
    const rings = figure.querySelectorAll<HTMLElement>("[data-ring]");

    const direct = () => {
      if (!items.some((item) => item.getClientRects().length > 0)) return;
      const y = window.innerHeight * line;
      let active = -1;
      items.forEach((item, k) => {
        if (item.getBoundingClientRect().top <= y) active = k;
      });
      const item = items[active];
      const act = item?.dataset.act ?? "none";
      const step = act === "d" ? rings.length - 1 : act === "c" ? Number(item?.dataset.stop ?? -1) : -1;
      const walk = act === "d" ? 1 : step >= 0 ? Number(rings[step]?.style.getPropertyValue("--at") || 0) : 0;
      if (figure.dataset.act === act && figure.dataset.step === String(step)) return;
      figure.dataset.act = act;
      figure.dataset.step = String(step);
      figure.style.setProperty("--walk", String(walk));
      for (const other of items) other.toggleAttribute("data-current", other === item);
      for (const air of figure.querySelectorAll<HTMLElement>("[data-play-at]")) {
        if (step >= Number(air.dataset.playAt)) air.setAttribute("data-play", "");
      }
      for (const air of figure.querySelectorAll<HTMLElement>("[data-play-act]")) {
        const due = ACTS.indexOf(air.dataset.playAct ?? "");
        if (due > 0 && ACTS.indexOf(act) >= due) air.setAttribute("data-play", "");
      }
    };

    // The band the observer watches is everything above the line (far up the page): a step that crosses the line, either way,
    // and however far in one go, goes in or out of it, so a fast scroll or a jump is never missed.
    const below = 100 - Math.round(line * 100);
    const observer = new IntersectionObserver(direct, { rootMargin: `100000px 0px -${below}% 0px`, threshold: 0 });
    for (const item of items) observer.observe(item);
    return () => observer.disconnect();
  }, [stage, steps, selector, line]);

  return null;
}
