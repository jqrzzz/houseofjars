import { hasBrandMark } from "@/components/ui/BrandMark";
import { Section } from "@/components/ui/Section";
import { type HonestReply, type Testimonial, honestReplies, reviewSites, shownTestimonials } from "@/content/reviews";
import { type QuoteCard, TestimonialsView } from "./TestimonialsView";
import styles from "./Testimonials.module.css";

/** The fewest quotes worth showing. */
export const MIN_TESTIMONIALS = 3;

/** "September 2026", from "2026-09". */
const monthOf = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

/** A quote as its card shows it: the words, who and where from, the site (linked, with its logo), the month and whether the site translated it. */
export function quoteCard(t: Testimonial): QuoteCard {
  const site = reviewSites.find((s) => s.platform === t.platform);
  const when = [t.month ? monthOf(t.month) : null, t.translated ? `translated by ${t.platform}` : null].filter(Boolean).join(", ");
  return {
    quote: t.quote,
    who: `${t.name}, ${t.from}`,
    platform: t.platform,
    url: site?.url ?? null,
    mark: site && hasBrandMark(site.mark) ? site.mark : null,
    when,
  };
}

/**
 * Guests in their own words (docs/DESIGN.md §10.9), after the ratings: a few
 * short quotes from different guests on paper cards, credited with the
 * guest's first name, where they are from, the site and the month, shown
 * once there are three (content/reviews.ts says which may be shown); then
 * what a few guests wish were different, each with the house's answer
 * (§10.10). The words come from content/reviews; TestimonialsView draws them.
 */
export function Testimonials({
  quotes = shownTestimonials(),
  replies = honestReplies.map((r) => r.value),
}: {
  quotes?: readonly Testimonial[];
  replies?: readonly HonestReply[];
}) {
  const cards = quotes.length >= MIN_TESTIMONIALS ? quotes.map(quoteCard) : [];
  if (cards.length === 0 && replies.length === 0) return null;
  return (
    <Section labelledBy="testimonials-title" className={styles.section}>
      <TestimonialsView quotes={cards} replies={replies} />
    </Section>
  );
}
