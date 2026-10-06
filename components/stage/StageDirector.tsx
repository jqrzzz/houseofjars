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
 * gets data-current, and the figure with id `stage` gets data-act and
 * data-step (and, only where there are no scroll timelines, --walk: how far
 * the walk has come, 0 to 1). With `marks`, the id of the words beside the
 * stage, they get data-act too, and their item for the current stop (the one
 * whose data-stop is the step) data-current: the words follow the story with
 * styles of their own, not ones that look up from the figure (cheap to
 * restyle).
 *
 * Elements in the figure with data-play-at="k" get data-play when the walk
 * arrives at stop k (the wisp at the desk), and those with data-play-act="b"
 * when that act begins (the hanging sign's breath of wind as the house
 * opens); neither loses it. Only an arrival plays them: a jump past them (the
 * skip link, a reload part-way down) leaves them at rest.
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
  marks,
  line = 0.45,
}: {
  stage: string;
  steps: string;
  selector?: string;
  marks?: string;
  line?: number;
}) {
  useEffect(() => {
    const figure = document.getElementById(stage);
    const items = Array.from(document.getElementById(steps)?.querySelectorAll<HTMLElement>(selector) ?? []);
    if (!figure || items.length === 0) return;
    const rings = figure.querySelectorAll<HTMLElement>("[data-ring]");
    const words = marks ? document.getElementById(marks) : null;
    // --walk drives only the transitions for browsers without scroll timelines; elsewhere writing it would restyle the whole stage.
    const fallback = !CSS.supports("animation-timeline: view()");

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
      const was = figure.dataset.act ? { act: ACTS.indexOf(figure.dataset.act), step: Number(figure.dataset.step) } : undefined;
      figure.dataset.act = act;
      figure.dataset.step = String(step);
      if (fallback) figure.style.setProperty("--walk", String(walk));
      for (const other of items) other.toggleAttribute("data-current", other === item);
      if (words) {
        words.dataset.act = act;
        for (const stop of words.querySelectorAll<HTMLElement>("[data-stop]")) stop.toggleAttribute("data-current", stop.dataset.stop === String(step));
      }
      // A phrase plays when the story arrives at its stop or act from the one before (a step on, not a leap past it).
      for (const air of figure.querySelectorAll<HTMLElement>("[data-play-at]")) {
        const due = Number(air.dataset.playAt);
        if (step === due && was && was.step < due && was.step >= due - 1) air.setAttribute("data-play", "");
      }
      for (const air of figure.querySelectorAll<HTMLElement>("[data-play-act]")) {
        const due = ACTS.indexOf(air.dataset.playAct ?? "");
        const now = ACTS.indexOf(act);
        if (due > 0 && now === due && was && was.act === due - 1) air.setAttribute("data-play", "");
      }
    };

    // The band the observer watches is everything above the line (far up the page): a step that crosses the line, either way,
    // and however far in one go, goes in or out of it, so a fast scroll or a jump is never missed.
    const below = 100 - Math.round(line * 100);
    const observer = new IntersectionObserver(direct, { rootMargin: `100000px 0px -${below}% 0px`, threshold: 0 });
    for (const item of items) observer.observe(item);
    return () => observer.disconnect();
  }, [stage, steps, selector, marks, line]);

  return null;
}
