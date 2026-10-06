"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { Eyebrow } from "@/components/ui/Section";
import buttons from "@/components/ui/button.module.css";
import { ArrowIcon } from "@/components/ui/icons";
import styles from "./HouseTheatre.module.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * The skip link jumps at once rather than gliding (the page scrolls smoothly
 * otherwise), so the story does not play past at speed; the browser still
 * follows the link itself, so the next Tab starts after the story.
 */
const jump = () => {
  const root = document.documentElement;
  root.style.scrollBehavior = "auto";
  // The browser scrolls to the link's target a little after the click, so the page keeps it until then.
  window.setTimeout(() => root.style.removeProperty("scroll-behavior"), 400);
};

/**
 * The words of the house story (HouseTheatre.tsx), beside the stage: the
 * intro (Act A), the three phrases (Act B), the five stops of the arrival walk
 * (Act C) and the closing lines (Act D), which StageDirector marks with the
 * current act and stop; then StageDirector's cues. The server
 * reads every word from content/ and the house model and passes them; this
 * side draws them. It sits on the client side of the boundary only so the
 * page carries its markup once (the HTML is still rendered on the server,
 * with every word in it).
 */
export function TheatreWords({
  lede,
  phrases,
  stops,
  closing,
  links,
}: {
  lede: string;
  phrases: readonly string[];
  /** Each stop's label, what you do there, and its share of the walk. */
  stops: readonly (readonly [label: string, does: string, at: number])[];
  closing: readonly string[];
  links: readonly (readonly [href: string, label: string])[];
}) {
  return (
    <>
      <a href="#after-house-story" className={styles.skip} onClick={jump}>
        Skip the house story
      </a>
      <div id="theatre-words" className={styles.steps}>
        <div className={styles.act} data-act="a">
          <div className={styles.body}>
            <Eyebrow number={1} morph="the-house">
              The house
            </Eyebrow>
            <h2 id="house-title" className={styles.heading}>
              Made for a good night’s sleep.
            </h2>
            <p className={styles.lede}>{lede}</p>
          </div>
        </div>
        <div className={`${styles.act} ${styles.actB}`} data-act="b">
          <ul role="list" className={`${styles.body} ${styles.phrases}`}>
            {phrases.map((phrase) => (
              <li key={phrase}>{phrase}</li>
            ))}
          </ul>
        </div>
        <div className={styles.walk}>
          <ol role="list" className={styles.stops} style={{ "--first": stops[0]?.[2] ?? 0 } as Vars}>
            {stops.map(([label, does, at], k) => (
              <li key={label} data-stop={k} style={{ "--at": at, "--next": stops[k + 1]?.[2] ?? 1 } as Vars}>
                <div className={styles.body}>
                  <h3>{label}</h3>
                  <p>{does}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className={styles.act} data-act="d">
          <div className={styles.body}>
            {closing.map((line) => (
              <p key={line} className={styles.closing}>
                {line}
              </p>
            ))}
            <div className={styles.links}>
              {links.map(([href, label]) => (
                <Link key={href} href={href} className={buttons.textLink} transitionTypes={["nav-forward"]}>
                  <span>{label}</span>
                  <ArrowIcon />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Where each act and stop begins on the section's timeline, for StageDirector's line halfway down the screen. */}
      <div id="theatre-cues" className={styles.cues} aria-hidden="true">
        <span data-act="a" />
        <span data-act="b" />
        {stops.slice(0, -1).map(([label, , at], k) => (
          <span key={label} data-act="c" data-stop={k} style={{ "--at": at } as Vars} />
        ))}
        <span data-act="d" />
      </div>
    </>
  );
}
