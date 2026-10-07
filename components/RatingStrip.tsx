import { type ReviewSite, reviewSites } from "@/content/reviews";
import { SEEN_ON } from "@/content/sources";
import { formatDate } from "@/content/text";
import { BrandMark, hasBrandMark } from "./ui/BrandMark";
import { ExternalIcon } from "./ui/icons";
import styles from "./RatingStrip.module.css";

/** What a site's badge offers: to book or read reviews, or only to read them. */
export const siteAction = (site: Pick<ReviewSite, "bookable">): string => (site.bookable ? "Book or read reviews" : "Read reviews");

/** The badge's name for screen readers: the site, its score and what clicking does. */
export function siteLabel(site: ReviewSite): string {
  const { rating } = site;
  const score = rating?.score ? `, ${rating.score}${rating.outOf ? ` out of ${rating.outOf}` : ""} ${rating.context}` : "";
  return `${site.platform}${score}. ${siteAction(site)} (opens in a new tab)`;
}

/**
 * The rating strip (docs/DESIGN.md §5.1): each booking and review site as a
 * paper badge with its own logo and the house's score there, and the whole
 * badge a link to the house's page on that site, to book or read the
 * reviews. Under the home page's hero, and on the booking page with only the
 * sites that take bookings (`bookable`).
 */
export function RatingStrip({ bookable = false, className }: { bookable?: boolean; className?: string }) {
  const sites = bookable ? reviewSites.filter((site) => site.bookable) : reviewSites;
  return (
    <div className={[styles.strip, className].filter(Boolean).join(" ")}>
      <ul role="list" className={styles.badges}>
        {sites.map((site) => (
          <li key={site.platform}>
            <a href={site.url} target="_blank" rel="noopener noreferrer" className={styles.badge} aria-label={siteLabel(site)}>
              {hasBrandMark(site.mark) ? <BrandMark mark={site.mark} className={styles.mark} /> : null}
              <span className={styles.words}>
                <span className={hasBrandMark(site.mark) ? styles.platform : `${styles.platform} ${styles.named}`}>{site.platform}</span>
                {site.rating?.score ? (
                  <span className={styles.score}>
                    <b>{site.rating.score}</b>
                    {site.rating.outOf ? <span>/{site.rating.outOf}</span> : null}
                  </span>
                ) : null}
                <span className={styles.context}>{site.rating?.context ?? "Prices, free beds and guest reviews"}</span>
              </span>
              <span className={styles.action}>
                {siteAction(site)}
                <ExternalIcon />
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className={styles.asOf}>Scores as each site showed them on {formatDate(SEEN_ON)}.</p>
    </div>
  );
}
