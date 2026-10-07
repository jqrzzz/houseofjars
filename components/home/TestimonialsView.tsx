"use client";

import { BrandMark } from "@/components/ui/BrandMark";
import type { HonestReply, SiteMark } from "@/content/reviews";
import styles from "./Testimonials.module.css";

/** One quote as its card shows it (Testimonials.tsx). */
export interface QuoteCard {
  readonly quote: string;
  /** "Aiko, Japan". */
  readonly who: string;
  readonly platform: string;
  /** The site's page for the house, when the quote is from a booking or review site. */
  readonly url: string | null;
  readonly mark: SiteMark | null;
  /** "August 2026, translated by Agoda", or "" when the review shows neither. */
  readonly when: string;
}

/**
 * The view of the guests' own words (Testimonials.tsx): the server reads the
 * quotes and the house's replies from content/ and passes their words; this
 * side draws them, so the page carries the cards' markup once. Only the
 * section's lists have classes; their parts are styled by position.
 */
export function TestimonialsView({ quotes, replies }: { quotes: readonly QuoteCard[]; replies: readonly HonestReply[] }) {
  return (
    <div className="container">
      {quotes.length > 0 ? (
        <>
          <h2 id="testimonials-title" className={styles.heading}>
            In guests’ own words
          </h2>
          <ul role="list" className={styles.quotes}>
            {quotes.map((q) => (
              <li key={q.who}>
                <figure>
                  <blockquote>
                    <p>{q.quote}</p>
                  </blockquote>
                  <figcaption>
                    {q.mark ? <BrandMark mark={q.mark} /> : null}
                    <span>
                      <b>{q.who}</b>
                      <span>
                        {q.url ? (
                          <a href={q.url} target="_blank" rel="noopener noreferrer">
                            {q.platform}
                            <span className="visually-hidden"> (opens in a new tab)</span>
                          </a>
                        ) : (
                          q.platform
                        )}
                        {q.when ? `, ${q.when}` : null}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {replies.length > 0 ? (
        <>
          <h3 className={quotes.length > 0 ? styles.subheading : styles.heading} id={quotes.length > 0 ? undefined : "testimonials-title"}>
            What a few guests wish were different
          </h3>
          <ul role="list" className={styles.replies}>
            {replies.map((r) => (
              <li key={r.said}>
                <p>{r.said}</p>
                <p>
                  <b>Our answer: </b>
                  {r.reply}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
