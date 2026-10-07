"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import buttons from "../ui/button.module.css";
import styles from "./ConciergeLauncher.module.css";
import type { ConciergePanelProps } from "./ConciergePanel";
import { dockHidden, type DockHidden } from "./dock-state";
import { shadowDock } from "./mascot";

// The chat window's code loads on first interaction, never on page load.
let panelModule: Promise<ComponentType<ConciergePanelProps>> | null = null;
function loadPanel() {
  panelModule ??= import("./ConciergePanel").then((module) => module.ConciergePanel);
  return panelModule;
}

/**
 * The butler's button, on every page: on phones in a dock along the bottom of
 * the screen with Book direct beside it (its own lane, like a toolbar, so it never
 * lies over the page), on wider screens floating in the corner, in the margin
 * beside the page. Any element with a `data-ask-shadow` attribute also opens
 * the concierge, pre-filled with the attribute's text.
 *
 * On phones the dock waits until the site header (which has its own Book
 * button) has scrolled away. While an element marked `data-hides-launcher`
 * (the home hero, the booking forms) reaches into the bottom of the screen,
 * the button steps aside, and on phones the dock with it. An inline Ask Shadow
 * button (`data-hides-launcher="ask"`) offers Shadow itself, so for one of
 * those only the button steps aside: Book direct stays in the dock. A booking
 * form counts from its fields (`data-launcher-cue`), not from its top edge:
 * until they come up into the screen, the dock and its Book button stay.
 * Elements that arrive later (the booking form loads its own code) are picked
 * up as they appear. CSS hides the button until the first check, so it never
 * flashes.
 *
 * Shadow floats in it: the 3D mascot, whole, before a soft lamplight glow,
 * drifting up and down a few pixels as slowly as a breath. The dock is a stage
 * of its own (`data-stage`), so StageLife pauses his float while the tab is
 * hidden, as it pauses every ambient (`.amb`) animation; the CSS pauses it
 * while the dock steps aside, and Still and reduced motion leave him at rest.
 */
export function ConciergeLauncher() {
  const [Panel, setPanel] = useState<ComponentType<ConciergePanelProps> | null>(null);
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ text: string; id: number } | null>(null);
  // Undefined until the first check (components/concierge/dock-state.ts).
  const [hidden, setHidden] = useState<DockHidden | undefined>(undefined);
  const [headerInView, setHeaderInView] = useState<boolean | undefined>(undefined);
  const pathname = usePathname();

  // On phones the dock comes up once the header, with its own Book button, has scrolled away.
  useEffect(() => {
    // The root layout always renders the header.
    const header = document.querySelector("[data-site-header]");
    if (!header) return;
    const observer = new IntersectionObserver(([entry]) => setHeaderInView(entry?.isIntersecting ?? false));
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const inCorner = new Set<Element>();
    const watched = new Set<Element>();
    // Each booking form's fields, which it counts from.
    const cues = new Map<Element, Element>();
    // Nothing is decided before the band has reported, so the button never shows for a moment by mistake.
    let reported = false;
    const update = () => {
      if (!reported) return;
      const kinds: (string | null)[] = [];
      for (const element of inCorner) {
        // A booking form whose fields are still below the screen doesn't count yet.
        const cue = cues.get(element);
        if (cue && cue.getBoundingClientRect().top >= window.innerHeight) continue;
        kinds.push(element.getAttribute("data-hides-launcher"));
      }
      setHidden(dockHidden(kinds));
    };
    const intersection = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inCorner.add(entry.target);
          else inCorner.delete(entry.target);
        }
        reported = true;
        update();
      },
      // The button's band of the screen: the bottom fifth.
      { rootMargin: "-80% 0px 0px 0px" },
    );
    // A form's fields coming up into the screen (or going back down out of it) check the band again.
    const arrival = new IntersectionObserver(update);
    let queued = 0;
    const scan = () => {
      queued = 0;
      let changed = false;
      const present = new Set(document.querySelectorAll("[data-hides-launcher]"));
      for (const element of present) {
        if (!watched.has(element)) {
          watched.add(element);
          intersection.observe(element);
        }
        // A form's fields can be drawn afresh inside it (the booking form reads its link once in the browser).
        const cue = element.querySelector("[data-launcher-cue]");
        const known = cues.get(element);
        if (cue === (known ?? null)) continue;
        if (known) arrival.unobserve(known);
        if (cue) {
          cues.set(element, cue);
          arrival.observe(cue);
        } else cues.delete(element);
        changed ||= inCorner.has(element);
      }
      for (const element of watched) {
        if (!present.has(element)) {
          watched.delete(element);
          if (inCorner.delete(element)) changed = true;
          intersection.unobserve(element);
          const cue = cues.get(element);
          if (cue) arrival.unobserve(cue);
          cues.delete(element);
        }
      }
      if (present.size === 0) setHidden("false");
      else if (changed) update();
    };
    scan();
    const mutation = new MutationObserver(() => {
      queued ||= requestAnimationFrame(scan);
    });
    mutation.observe(document.body, { childList: true, subtree: true });
    return () => {
      mutation.disconnect();
      intersection.disconnect();
      arrival.disconnect();
      cancelAnimationFrame(queued);
      setHidden(undefined);
    };
  }, [pathname]);

  const openPanel = useCallback(async (text?: string) => {
    const component = await loadPanel();
    setPanel(() => component);
    if (text) setPrefill({ text, id: Date.now() });
    setOpen(true);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const trigger = event.target instanceof Element ? event.target.closest("[data-ask-shadow]") : null;
      if (!trigger) return;
      event.preventDefault();
      void openPanel(trigger.getAttribute("data-ask-shadow") || undefined);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [openPanel]);

  return (
    <>
      {/* A landmark of its own: it comes after the footer, outside the page's other regions. */}
      <aside
        aria-label="Ask Shadow"
        className={styles.dock}
        data-stage=""
        data-hidden={hidden}
        data-header={headerInView === undefined ? undefined : String(headerInView)}
      >
        <button
          type="button"
          className={styles.launcher}
          aria-label="Ask Shadow, our AI concierge"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => void openPanel()}
          onPointerEnter={() => void loadPanel()}
          onFocus={() => void loadPanel()}
        >
          {/* Shadow himself, whole and free of any frame, before a lamplight glow (ConciergeLauncher.module.css). */}
          <span className={styles.avatar}>
            {/* Two tiny files picked by the screen's sharpness: next/image would add nothing but weight. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={`${styles.figure} amb`}
              src={shadowDock.src}
              srcSet={`${shadowDock.src} 1x, ${shadowDock.src2x} 2x`}
              width={shadowDock.width}
              height={shadowDock.height}
              alt=""
              decoding="async"
              draggable={false}
            />
          </span>
          <span className={styles.label} aria-hidden="true">
            Ask Shadow
          </span>
        </button>
        {pathname === "/book" ? null : (
          <Link href="/book" className={`${buttons.button} ${buttons.primary} ${buttons.small} ${styles.book}`}>
            Book direct
          </Link>
        )}
      </aside>
      {Panel ? <Panel open={open} prefill={prefill} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
