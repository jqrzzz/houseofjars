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
 *
 * With `camera` (how close, 1.7 say), the stage leans in on the walk: at each
 * stop it eases in on that stop, and before the walk and at the curtain it
 * shows the whole house, so the story ends on the frame Still rests on. A reader can also tap a stop in `marks`
 * to look at it, on phones too. Under Still and reduced motion the stage keeps
 * its whole view.
 */
export function StageDirector({
  stage,
  steps,
  selector = "[data-act]",
  marks,
  line = 0.45,
  camera,
}: {
  stage: string;
  steps: string;
  selector?: string;
  marks?: string;
  line?: number;
  camera?: number;
}) {
  useEffect(() => {
    const figure = document.getElementById(stage);
    const items = Array.from(document.getElementById(steps)?.querySelectorAll<HTMLElement>(selector) ?? []);
    if (!figure || items.length === 0) return;
    const rings = figure.querySelectorAll<HTMLElement>("[data-ring]");
    const words = marks ? document.getElementById(marks) : null;
    // --walk drives only the transitions for browsers without scroll timelines; elsewhere writing it would restyle the whole stage.
    const fallback = !CSS.supports("animation-timeline: view()");
    const world = camera ? figure.querySelector<HTMLElement>("[data-world]") : null;
    if (world) figure.setAttribute("data-camera", "");
    let aimed = -1;

    // The camera: ease in on stop k (its ring, as the walk now on the stage draws it), or back to the whole house (k < 0).
    const aim = (k: number) => {
      aimed = k;
      if (!world || !camera) return;
      const frame = world.parentElement;
      const still = document.documentElement.dataset.motion === "still" || matchMedia("(prefers-reduced-motion: reduce)").matches;
      const rings = figure.querySelectorAll<HTMLElement>("[data-ring]");
      const ring = k >= 0 && rings.length > 0 ? rings[Math.min(k, rings.length - 1)] : undefined;
      const set = (s: number, x: number, y: number) => {
        figure.style.setProperty("--cam-s", String(s));
        figure.style.setProperty("--cam-x", `${x}px`);
        figure.style.setProperty("--cam-y", `${y}px`);
      };
      if (!frame || !ring || still || ring.getClientRects().length === 0) return set(1, 0, 0);
      // Where the ring is in the world, unzoomed: the world's box shows how far the camera is in right now, even mid-move.
      const w = world.getBoundingClientRect();
      const r = ring.getBoundingClientRect();
      const now = w.width / (world.offsetWidth || 1) || 1;
      const lx = (r.left + r.width / 2 - w.left) / now;
      const ly = (r.top + r.height / 2 - w.top) / now;
      const W = frame.clientWidth;
      const H = frame.clientHeight;
      const z = camera;
      // The stop to the middle of the frame, but never past the edge of what the whole view shows.
      const fit = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
      const ox = world.offsetLeft;
      const oy = world.offsetTop;
      set(z, fit(W / 2 - ox - z * lx, (W - ox) * (1 - z), ox * (z - 1)), fit(H / 2 - oy - z * ly, (H - oy) * (1 - z), oy * (z - 1)));
    };

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
      // The curtain leans back out: the end frame is the whole house, as Still shows it.
      aim(act === "d" ? -1 : step);
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

    // A stop tapped in the words: the camera goes to it (the next step of the story takes over again).
    const look = (event: Event) => {
      const item = (event.target as Element | null)?.closest<HTMLElement>("[data-stop]");
      if (!camera || !words || !item || !words.contains(item)) return;
      const k = Number(item.dataset.stop);
      for (const stop of words.querySelectorAll<HTMLElement>("[data-stop]")) stop.toggleAttribute("data-current", stop.dataset.stop === String(k));
      aim(aimed === k ? -1 : k);
    };
    words?.addEventListener("click", look);
    // The frame changes size with the window: the camera keeps its stop in view.
    const resized = world ? new ResizeObserver(() => aim(aimed)) : null;
    if (world?.parentElement) resized?.observe(world.parentElement);
    return () => {
      observer.disconnect();
      words?.removeEventListener("click", look);
      resized?.disconnect();
    };
  }, [stage, steps, selector, marks, line, camera]);

  return null;
}
