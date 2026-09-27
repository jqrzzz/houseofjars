"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import { ShadowFigure } from "../shadow/ShadowFigure";
import buttons from "../ui/button.module.css";
import { ArrowIcon } from "../ui/icons";
import styles from "./ConciergeLauncher.module.css";
import type { ConciergePanelProps } from "./ConciergePanel";

// The chat window's code loads on first interaction, never on page load.
let panelModule: Promise<ComponentType<ConciergePanelProps>> | null = null;
function loadPanel() {
  panelModule ??= import("./ConciergePanel").then((module) => module.ConciergePanel);
  return panelModule;
}

/**
 * The butler's button, on every page: on phones in a dock along the bottom of
 * the screen with Book beside it (its own lane, like a toolbar, so it never
 * lies over the page), on wider screens floating in the corner, in the margin
 * beside the page. Any element with a `data-ask-shadow` attribute also opens
 * the concierge, pre-filled with the attribute's text.
 *
 * On phones the dock waits until the site header (which has its own Book
 * button) has scrolled away. While an element marked `data-hides-launcher`
 * (the home hero, the booking forms, every inline Ask Shadow button) reaches
 * into the bottom of the screen, the button steps aside. Elements that arrive
 * later (the booking form loads its own code) are picked up as they appear.
 * CSS hides the button until the first check, so it never flashes.
 */
export function ConciergeLauncher() {
  const [Panel, setPanel] = useState<ComponentType<ConciergePanelProps> | null>(null);
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ text: string; id: number } | null>(null);
  const [covered, setCovered] = useState<boolean | undefined>(undefined);
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
    const intersection = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inCorner.add(entry.target);
          else inCorner.delete(entry.target);
        }
        setCovered(inCorner.size > 0);
      },
      // The button's band of the screen: the bottom fifth.
      { rootMargin: "-80% 0px 0px 0px" },
    );
    let queued = 0;
    const scan = () => {
      queued = 0;
      const present = new Set(document.querySelectorAll("[data-hides-launcher]"));
      for (const element of present) {
        if (!watched.has(element)) {
          watched.add(element);
          intersection.observe(element);
        }
      }
      for (const element of watched) {
        if (!present.has(element)) {
          watched.delete(element);
          inCorner.delete(element);
          intersection.unobserve(element);
        }
      }
      if (present.size === 0) setCovered(false);
    };
    scan();
    const mutation = new MutationObserver(() => {
      queued ||= requestAnimationFrame(scan);
    });
    mutation.observe(document.body, { childList: true, subtree: true });
    return () => {
      mutation.disconnect();
      intersection.disconnect();
      cancelAnimationFrame(queued);
      setCovered(undefined);
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
      <div
        className={styles.dock}
        data-hidden={covered === undefined ? undefined : String(covered)}
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
          <span className={styles.avatar}>
            <ShadowFigure variant="bust" />
          </span>
          <span className={styles.label} aria-hidden="true">
            Ask Shadow
          </span>
        </button>
        {pathname === "/book" ? null : (
          <Link href="/book" className={`${buttons.button} ${buttons.primary} ${buttons.small} ${styles.book}`}>
            Book
            <ArrowIcon />
          </Link>
        )}
      </div>
      {Panel ? <Panel open={open} prefill={prefill} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
