"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import buttons from "../ui/button.module.css";
import type { FindYourPodProps } from "./FindYourPod";
import styles from "./FindYourPodLauncher.module.css";

// The game's code loads when a visitor reaches for the button (hover, focus or a tap), never with the page,
// and its board only when it is played.
let gameModule: Promise<typeof import("./FindYourPod")> | null = null;
function loadGame() {
  gameModule ??= import("./FindYourPod").catch((error: unknown) => {
    gameModule = null;
    throw error;
  });
  return gameModule;
}

export interface FindYourPodLauncherProps {
  /** The button's words. */
  label?: string;
  /** Secondary by default: the page's one orange button is for booking. */
  tone?: "primary" | "secondary";
  className?: string;
  /** Shown above the button, such as the game's poster. */
  children?: ReactNode;
}

/** The button that opens "Find your pod". */
export function FindYourPodLauncher({ label = "Play Find your pod", tone = "secondary", className, children }: FindYourPodLauncherProps) {
  const [Game, setGame] = useState<ComponentType<FindYourPodProps> | null>(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function play() {
    setBusy(true);
    try {
      const game = await loadGame();
      // The board too, so the game opens ready to play (if it can't load, the game says so).
      await game.loadBoard();
      setGame(() => game.FindYourPod);
      setFailed(false);
      setOpen(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const prefetch = () => void loadGame().catch(() => undefined);
  return (
    <>
      {children}
      <button
        type="button"
        className={[buttons.button, tone === "primary" ? buttons.primary : buttons.secondary, styles.launcher, className].filter(Boolean).join(" ")}
        aria-haspopup="dialog"
        aria-busy={busy || undefined}
        onClick={() => void play()}
        onPointerEnter={prefetch}
        onFocus={prefetch}
      >
        <svg className={styles.lamp} viewBox="0 0 16 24" aria-hidden="true" focusable="false">
          <path className={styles.cord} d="M8 0V7" />
          <path className={styles.shade} d="M2 18.5C2 12.5 4.5 8.5 8 8.5S14 12.5 14 18.5Z" />
          <circle className={styles.bulb} cx="8" cy="19.5" r="2" />
        </svg>
        {label}
      </button>
      {failed ? (
        <p className={styles.failed} role="status">
          The game didn’t load. Please check your connection and try again.
        </p>
      ) : null}
      {Game ? <Game open={open} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
