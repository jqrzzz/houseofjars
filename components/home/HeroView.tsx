"use client";

import Link from "next/link";
import { PhotoFrame, type Photo } from "@/components/PhotoFrame";
import { AskShadowButton } from "@/components/concierge/AskShadowButton";
import buttons from "@/components/ui/button.module.css";
import { ArrowIcon } from "@/components/ui/icons";
import { HeroLamps } from "./HeroLamps";
import styles from "./Hero.module.css";
import now from "./HouseNow.module.css";

/**
 * The view of the hero (Hero.tsx): the server reads the facts from content/
 * and passes the words; this side draws them. It sits on the client side of
 * the boundary only so the page carries its markup once (the HTML is still
 * rendered on the server, with every word in it, and the photograph is
 * preloaded as before).
 */
export function HeroView({
  direct,
  book,
  photo,
  caption,
  score,
  lines,
}: {
  direct: string;
  book: string;
  photo: Photo;
  caption: string;
  /** The guests' score: the figure, what it is out of, and where it is from. */
  score: readonly [value: string, outOf: string | null, text: string];
  /** The house now: one line per part of the day, and a general one. */
  lines: Readonly<Record<string, string>>;
}) {
  return (
    <div className={`container ${styles.grid}`}>
      <div className={styles.copy}>
        <p className={styles.greeting}>
          <span lang="lo" className={styles.lao}>
            ສະບາຍດີ
          </span>
          <span aria-hidden="true" className={styles.dot}>
            ·
          </span>
          <span>Sabaidee</span>
        </p>
        <h1 id="hero-title" className={styles.title}>
          A calm house in the heart of Vientiane.
        </h1>
        {/* A non-breaking hyphen (&#8209;) keeps "air-conditioning" on one line. */}
        <p className={styles.lede}>
          Curtained pod beds, air&#8209;conditioning, breakfast in our café downstairs, and a team that looks after every
          detail, day and night.
        </p>
        <p className={styles.direct}>{direct}</p>
        <div className={styles.actions}>
          <Link href="/book" className={`${buttons.button} ${buttons.primary}`} transitionTypes={["nav-forward"]}>
            {book}
            <ArrowIcon />
          </Link>
          <AskShadowButton className={`${buttons.button} ${buttons.secondary}`}>Ask Shadow</AskShadowButton>
        </div>
        <p className={`${now.now} ${styles.now}`}>
          {Object.entries(lines).map(([phase, line]) => (
            <span key={phase} data-phase={phase}>
              {line}
            </span>
          ))}
        </p>
      </div>

      <div className={styles.photoWrap}>
        {/*
          Three of the house's lamps hang above the arch, behind its mat, so their light never falls on the
          photograph. They drop into place and light up once (HouseLamp), and rise a little as the hero leaves.
        */}
        <HeroLamps />
        <PhotoFrame
          caption={caption}
          photo={photo}
          drawing="pod"
          shape="arch"
          aspect="2 / 3"
          sizes="(min-width: 60rem) 26rem, 80vw"
          preload
          className={styles.photo}
          plate={
            // The guests' score, on a paper plate tucked into the foot of the mat, beside the caption.
            <p className={styles.score}>
              <span className={styles.scoreValue}>
                {score[0]}
                {score[1] ? <span className={styles.outOf}>/{score[1]}</span> : null}
              </span>
              <span className={styles.scoreText}>{score[2]}</span>
            </p>
          }
        />
      </div>
    </div>
  );
}
