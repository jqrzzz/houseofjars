"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import styles from "./ConciergeLauncher.module.css";
import { shadowBust } from "./mascot";
import type { ConciergePanelProps } from "./ConciergePanel";

// The chat window's code loads on first interaction, never on page load.
let panelModule: Promise<ComponentType<ConciergePanelProps>> | null = null;
function loadPanel() {
  panelModule ??= import("./ConciergePanel").then((module) => module.ConciergePanel);
  return panelModule;
}

/**
 * The floating butler button, on every page. Any element with a
 * `data-ask-shadow` attribute also opens the concierge, pre-filled with the
 * attribute's text. While an element marked `data-hides-launcher` (the home
 * hero, which has its own Ask Shadow button) is on screen, the button steps
 * aside; CSS hides it until the first check, so it never flashes.
 */
export function ConciergeLauncher() {
  const [Panel, setPanel] = useState<ComponentType<ConciergePanelProps> | null>(null);
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ text: string; id: number } | null>(null);
  const [heroInView, setHeroInView] = useState<boolean | undefined>(undefined);
  const pathname = usePathname();

  useEffect(() => {
    const hero = document.querySelector("[data-hides-launcher]");
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setHeroInView(entry?.isIntersecting ?? false), {
      threshold: 0.3,
    });
    observer.observe(hero);
    return () => {
      observer.disconnect();
      setHeroInView(undefined);
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
      <button
        type="button"
        className={styles.launcher}
        data-hidden={heroInView === undefined ? undefined : String(heroInView)}
        aria-label="Ask Shadow, our AI concierge"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => void openPanel()}
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
      >
        <span className={styles.avatar}>
          <Image src={shadowBust.src} width={shadowBust.width} height={shadowBust.height} sizes="56px" alt="" />
        </span>
        <span className={styles.label} aria-hidden="true">
          Ask Shadow
        </span>
      </button>
      {Panel ? <Panel open={open} prefill={prefill} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
