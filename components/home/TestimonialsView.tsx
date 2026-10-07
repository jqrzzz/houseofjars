"use client";

import { BrandMark } from "@/components/ui/BrandMark";
import type { SiteMark } from "@/content/reviews";
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
  /** "August 2026". */
  readonly month: string;
}

/**
 * The view of the guests' own words (Testimonials.tsx): the server reads the
 * quotes from content/ and passes their words; this side draws them, so the
 * page carries the cards' markup once.
 */
export function TestimonialsView({ quotes }: { quotes: readonly QuoteCard[] }) {
  return (
    <div className="container">
      <h2 id="testimonials-title" className={styles.heading}>
        In guests’ own words
      </h2>
      <ul role="list" className={styles.quotes}>
        {quotes.map((q) => (
          <li key={`${q.who}-${q.month}`}>
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
                    , {q.month}
                  </span>
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
