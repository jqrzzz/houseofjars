"use client";

import type { CSSProperties } from "react";
import { Petal } from "@/components/art/Petal";
import { Eyebrow } from "@/components/ui/Section";
import { ExternalIcon } from "@/components/ui/icons";
import styles from "./RatingTags.module.css";

export interface RatingTag {
  readonly platform: string;
  readonly score: string;
  readonly outOf: string | null;
  readonly context: string;
  /** "As of 25 September 2026". */
  readonly asOf: string;
  readonly url: string | null;
}

/**
 * The view of ③ (RatingTags.tsx): the server reads the ratings from content/
 * and passes the words; this side draws them. It sits on the client side of
 * the boundary only so the page carries its markup once (the HTML is still
 * rendered on the server, with every word in it).
 */
export function RatingTagsView({ ratings, praise, notes }: { ratings: readonly RatingTag[]; praise: readonly string[]; notes: readonly string[] }) {
  return (
    <div className="container">
      <div className={styles.intro}>
        <Eyebrow number={3}>Guest ratings</Eyebrow>
        <h2 id="ratings-title" className={styles.heading}>
          What guests say
        </h2>
      </div>
      <div className={styles.line} data-phrase="">
        <Petal className={styles.petal} />
        <svg className={styles.thread} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M-2 4Q50 44 102 4" />
        </svg>
        <ul role="list" className={styles.tags}>
          {ratings.map((rating, k) => (
            <li key={rating.platform} style={{ "--k": k } as CSSProperties}>
              <p>{rating.platform}</p>
              <p>
                <b>{rating.score}</b>
                {rating.outOf ? <span> out of {rating.outOf}</span> : null}
              </p>
              <p>{rating.context}</p>
              <p>{rating.asOf}</p>
              {rating.url ? (
                <a href={rating.url} target="_blank" rel="noopener noreferrer">
                  See it on {rating.platform}
                  <ExternalIcon />
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              ) : (
                // No public page recorded yet (content/reviews.ts): say so where the link would be.
                <p className={styles.soon}>Link to come</p>
              )}
            </li>
          ))}
        </ul>
      </div>
      {notes.map((note) => (
        <p key={note} className={styles.also}>
          {note}
        </p>
      ))}
      <p className={styles.note}>Scores are as each site showed them on that date. They change, so follow the links for today’s figures.</p>
      <div className={styles.praise}>
        <h3>What guests mention most</h3>
        <ul role="list">
          {praise.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
