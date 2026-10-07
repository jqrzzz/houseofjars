import { type Testimonial, reviewSites, shownTestimonials } from "@/content/reviews";
import { BrandMark, hasBrandMark } from "@/components/ui/BrandMark";
import { Section } from "@/components/ui/Section";
import styles from "./Testimonials.module.css";

/** The fewest quotes worth a section of their own. */
export const MIN_TESTIMONIALS = 3;

/** "September 2026", from "2026-09". */
const monthOf = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

/**
 * Guests in their own words (docs/DESIGN.md §5.1), after the ratings: a few
 * short quotes from different guests, each about something different, on
 * paper cards with the guest's first name, where they are from, the site and
 * the month. Only quotes the guests agreed to share are shown
 * (content/reviews.ts), and the section stays away until there are three.
 */
export function Testimonials({ quotes = shownTestimonials() }: { quotes?: readonly Testimonial[] }) {
  if (quotes.length < MIN_TESTIMONIALS) return null;
  return (
    <Section labelledBy="testimonials-title" className={styles.section}>
      <div className="container">
        <h2 id="testimonials-title" className={styles.heading}>
          In guests’ own words
        </h2>
        <ul role="list" className={styles.quotes}>
          {quotes.map((t) => {
            const site = reviewSites.find((s) => s.platform === t.platform);
            return (
              <li key={`${t.name}-${t.from}-${t.month}`} className={styles.card}>
                <figure>
                  <blockquote className={styles.quote}>
                    <p>{t.quote}</p>
                  </blockquote>
                  <figcaption className={styles.who}>
                    {site && hasBrandMark(site.mark) ? <BrandMark mark={site.mark} className={styles.mark} /> : null}
                    <span>
                      <span className={styles.name}>
                        {t.name}, {t.from}
                      </span>
                      <span className={styles.where}>
                        {site ? (
                          <a href={site.url} target="_blank" rel="noopener noreferrer">
                            {t.platform}
                            <span className="visually-hidden"> (opens in a new tab)</span>
                          </a>
                        ) : (
                          t.platform
                        )}
                        , {monthOf(t.month)}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}
