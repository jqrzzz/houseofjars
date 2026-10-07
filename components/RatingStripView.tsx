"use client";

import { BrandMark } from "./ui/BrandMark";
import { ExternalIcon } from "./ui/icons";
import type { SiteMark } from "@/content/reviews";
import styles from "./RatingStrip.module.css";

/** One badge's words, from content/reviews (RatingStrip.tsx). */
export interface SiteBadge {
  readonly platform: string;
  /** The site's logo, when the site has one yet. */
  readonly mark: SiteMark | null;
  /** The logo spells the site's name, so the name is only read out, not written again. */
  readonly wordmark: boolean;
  readonly url: string;
  readonly score: string | null;
  readonly outOf: string | null;
  readonly context: string;
  /** "Book or read reviews", or "Read reviews". */
  readonly action: string;
}

/**
 * The view of the rating strip (RatingStrip.tsx): the server reads the sites
 * from content/ and passes their words; this side draws them. It sits on the
 * client side of the boundary only so the page carries its markup once (the
 * HTML is still rendered on the server, with every word in it). Classes are
 * kept to the strip itself; its parts are styled by position.
 */
export function RatingStripView({ sites, asOf, className }: { sites: readonly SiteBadge[]; asOf: string; className?: string }) {
  return (
    <div className={className ? `${styles.strip} ${className}` : styles.strip}>
      <ul role="list">
        {sites.map((site) => (
          <li key={site.platform}>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              data-named={site.mark ? undefined : ""}
              data-wordmark={site.wordmark ? "" : undefined}
            >
              {site.mark ? <BrandMark mark={site.mark} /> : null}
              <span>
                <span>{site.platform}</span>
                {site.score ? (
                  <span>
                    <b>{site.score}</b>
                    {site.outOf ? <small>/{site.outOf}</small> : null}
                  </span>
                ) : null}
                <span>{site.context}</span>
              </span>
              <span>
                {site.action}
                <ExternalIcon />
              </span>
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
      <p>{asOf}</p>
    </div>
  );
}
