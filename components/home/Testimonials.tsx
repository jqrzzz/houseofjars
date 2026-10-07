import { Section } from "@/components/ui/Section";
import { hasBrandMark } from "@/components/ui/BrandMark";
import { type Testimonial, reviewSites, shownTestimonials } from "@/content/reviews";
import { type QuoteCard, TestimonialsView } from "./TestimonialsView";
import styles from "./Testimonials.module.css";

/** The fewest quotes worth a section of their own. */
export const MIN_TESTIMONIALS = 3;

/** "September 2026", from "2026-09". */
const monthOf = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

/** A quote as its card shows it: the words, who and where from, the site (linked, with its logo) and the month. */
export function quoteCard(t: Testimonial): QuoteCard {
  const site = reviewSites.find((s) => s.platform === t.platform);
  return {
    quote: t.quote,
    who: `${t.name}, ${t.from}`,
    platform: t.platform,
    url: site?.url ?? null,
    mark: site && hasBrandMark(site.mark) ? site.mark : null,
    month: monthOf(t.month),
  };
}

/**
 * Guests in their own words (docs/DESIGN.md §10.9), after the ratings: a few
 * short quotes from different guests, each about something different, on
 * paper cards with the guest's first name, where they are from, the site and
 * the month. Only quotes the guests agreed to share are shown
 * (content/reviews.ts), and the section stays away until there are three.
 * The words come from content/reviews; TestimonialsView draws them.
 */
export function Testimonials({ quotes = shownTestimonials() }: { quotes?: readonly Testimonial[] }) {
  if (quotes.length < MIN_TESTIMONIALS) return null;
  return (
    <Section labelledBy="testimonials-title" className={styles.section}>
      <TestimonialsView quotes={quotes.map(quoteCard)} />
    </Section>
  );
}
