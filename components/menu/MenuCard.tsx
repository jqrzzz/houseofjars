"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { motionAllowed } from "@/lib/motion/prefs";
import type { Side } from "./MenuFaces";
import styles from "./MenuCard.module.css";
import { turnCard, type Turn } from "./turn";

/** Each side's id on the page (MenuFaces.tsx): its plate, the other side's "on the other side" and the hash all lead to it. */
const FACE_IDS: Readonly<Record<Side, string>> = { front: "breakfast", back: "cafe" };

const SIDES = ["front", "back"] as const satisfies readonly Side[];

/** From here up the two sides sit side by side, as the card lies on a table; below it, a phone turns the card over. */
const WIDE = "(min-width: 60rem)";

/** A side's plate above the card: the side's name, and a few words on what is on it. */
export interface SidePlate {
  readonly name: string;
  readonly note: string;
}

/**
 * The café's menu card on the page, around its two sides as the server drew
 * them (`front` and `back`, MenuFaces.tsx). Without JavaScript, and from 60rem
 * up, the sides simply stack or sit side by side, and the plates and the
 * card's "on the other side" are jump links. On a phone the island turns the
 * card instead: one side shows and the other waits behind it with
 * hidden="until-found", so find-in-page still finds a latte on the hidden side.
 * A plate turns the card over (turn.ts; at once under Still or reduced
 * motion), the card's own "on the other side" swaps it at once and scrolls to
 * the title, and the hash follows with replaceState, so turning adds nothing
 * to the back button. It never fetches or sends anything.
 *
 * Its state is attributes on [data-menu-card], set from here, never from
 * React's render: data-turn and data-side at rest on a phone, data-turning
 * during a turn (MenuCard.module.css).
 */
export function MenuCard({ front, back, plates }: { front: ReactNode; back: ReactNode; plates: Readonly<Record<Side, SidePlate>> }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    const wrap = (side: Side) => card.querySelector<HTMLElement>(`[data-face-wrap="${side}"]`)!;
    const wraps: Record<Side, HTMLElement> = { front: wrap("front"), back: wrap("back") };
    const nav = card.querySelector("nav")!;
    const wide = matchMedia(WIDE);
    // The card's state lives on the card itself, so a remount (Fast Refresh, Strict Mode's second run) finds the side it showed.
    let side = (card.getAttribute("data-side") ?? undefined) as Side | undefined;
    let turning: Turn | undefined;
    let live = true;

    /** Shows `next` and hides the other side until something looks for it: never a JSX prop, which React writes as plain hidden. */
    const swap = (next: Side) => {
      wraps[next].removeAttribute("hidden");
      wraps[next === "front" ? "back" : "front"].setAttribute("hidden", "until-found");
      card.setAttribute("data-side", next);
    };
    /** The plate of the side shown is the current one. */
    const mark = (next: Side) => {
      for (const plate of nav.querySelectorAll<HTMLElement>("[data-side-link]")) {
        if (plate.dataset.sideLink === next) plate.setAttribute("aria-current", "true");
        else plate.removeAttribute("aria-current");
      }
    };
    const show = (next: Side) => {
      side = next;
      swap(next);
      mark(next);
    };

    const enter = () => {
      if (!live || wide.matches || card.hasAttribute("data-turn")) return;
      // First the side the link led to (#cafe, or anything on it), else the café if the guest is already reading it;
      // after that, whichever side they saw last.
      const target = document.getElementById(location.hash.slice(1));
      const linked = side ? undefined : SIDES.find((s) => target && wraps[s].contains(target));
      side ??= linked ?? (wraps.back.getBoundingClientRect().top < innerHeight / 2 ? "back" : "front");
      const top = wraps[side].getBoundingClientRect().top;
      card.setAttribute("data-turn", "");
      show(side);
      if (linked) {
        // The page may still be gliding to the link's target (the site scrolls smoothly): land on it in the card's new
        // place, and again in the next frame, after the glide's last step.
        const land = () => target!.scrollIntoView({ block: "start", behavior: "instant" });
        land();
        requestAnimationFrame(land);
        return;
      }
      // Hiding breakfast lifts the café side into the card's place: scroll with it, so the words being read stay put.
      const moved = wraps[side].getBoundingClientRect().top - top;
      if (moved) scrollBy({ top: moved, behavior: "instant" });
    };

    const leave = () => {
      turning?.finish();
      card.removeAttribute("data-turn");
      card.removeAttribute("data-side");
      for (const s of SIDES) wraps[s].removeAttribute("hidden");
      for (const plate of nav.querySelectorAll("[aria-current]")) plate.removeAttribute("aria-current");
    };

    /** To `next` from a plate (turned over) or from the card's own link (at once, then to its title); to the title if it is already shown. */
    const go = (next: Side, fromPlate: boolean) => {
      turning?.finish();
      const title = wraps[next].querySelector<HTMLElement>("h2");
      if (next !== side) {
        const from = side;
        side = next;
        history.replaceState(null, "", `#${FACE_IDS[next]}`);
        mark(next);
        if (fromPlate && from && motionAllowed()) {
          turning = turnCard(card, wraps[from], wraps[next], next === "back", () => swap(next), () => {
            turning = undefined;
            title?.focus({ preventScroll: true });
          });
          return;
        }
        swap(next);
        if (!fromPlate) title?.scrollIntoView({ block: "start" });
      }
      title?.focus({ preventScroll: true });
    };

    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest<HTMLElement>("[data-side-link]");
      if (!link || !card.hasAttribute("data-turn") || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      go(link.dataset.sideLink as Side, nav.contains(link));
    };
    // Find-in-page, or a link into the hidden side: the browser reveals it itself, so the card swaps at once, with no turn and no new hash.
    const onMatch = (event: Event) => {
      const next = (event.target as HTMLElement).dataset.faceWrap as Side | undefined;
      if (!next) return;
      turning?.finish();
      if (next !== side) show(next);
    };
    // A side's hash typed or followed: the card swaps at once and brings that side into view.
    const onHash = () => {
      const next = SIDES.find((s) => location.hash === `#${FACE_IDS[s]}`);
      if (!next || !card.hasAttribute("data-turn")) return;
      turning?.finish();
      if (next !== side) show(next);
      wraps[next].scrollIntoView({ block: "start" });
    };
    // Turning a tablet or resizing a window across 60rem keeps the side.
    const onWide = () => (wide.matches ? leave() : enter());

    card.addEventListener("click", onClick);
    card.addEventListener("beforematch", onMatch);
    addEventListener("hashchange", onHash);
    wide.addEventListener("change", onWide);
    // Once this commit's other layout effects have run: StageLife first looks for phrases in view while the café side is
    // still where the server drew it (geometry inside hidden="until-found" is real, so it would see the steam as seen).
    queueMicrotask(enter);
    return () => {
      live = false;
      turning?.finish();
      card.removeEventListener("click", onClick);
      card.removeEventListener("beforematch", onMatch);
      removeEventListener("hashchange", onHash);
      wide.removeEventListener("change", onWide);
    };
  }, []);

  const faces = { front, back };
  return (
    <div ref={ref} className={styles.card} data-menu-card="">
      <nav className={styles.plates} aria-label="Sides of the menu card">
        {SIDES.map((side) => (
          <a key={side} href={`#${FACE_IDS[side]}`} className={styles.plate} data-side-link={side}>
            <span className={`${styles.swatch} ${styles[side]}`} aria-hidden="true" />
            <span className={styles.words}>
              <span className={styles.name}>{plates[side].name}</span> <span className={styles.note}>{plates[side].note}</span>
            </span>
          </a>
        ))}
      </nav>
      {SIDES.map((side) => (
        <div key={side} className={styles.wrap} data-face-wrap={side}>
          {faces[side]}
          <span className={styles.shade} data-shade="" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
