import { fact } from "./fact";
import { identity } from "./identity";
import { SEEN_ON, sources } from "./sources";
import { beds } from "./stay";

export interface Rating {
  readonly platform: string;
  /** How the score is shown, e.g. "9.4". */
  readonly score: string;
  /** What the score is out of, if it is a score. */
  readonly outOf: string | null;
  /** Short context, e.g. "from about 1,000 reviews". */
  readonly context: string;
  /** Where a reader can check it. Null when no public link is recorded yet. */
  readonly url: string | null;
  /** ISO date the figure was read. */
  readonly asOf: string;
}

export const ratings = [
  fact<Rating>(
    {
      platform: "Booking.com",
      score: "9.4",
      outOf: "10",
      context: "from about 1,000 guest reviews",
      url: "https://www.booking.com/hotel/la/house-of-jars.html",
      asOf: SEEN_ON,
    },
    sources.booking,
  ),
  fact<Rating>(
    {
      platform: "Hostelz",
      score: "No. 1",
      outOf: null,
      context: "top-rated hostel in Vientiane",
      url: null,
      asOf: SEEN_ON,
    },
    sources.hostelz,
    { note: "Add the Hostelz page link so readers can check it." },
  ),
  fact<Rating>(
    {
      platform: "Tripadvisor",
      score: "5.0",
      outOf: "5",
      context: "traveller rating",
      url: "https://www.tripadvisor.com/Hotel_Review-g293950-d27469992-Reviews-House_Of_Jars-Vientiane_Vientiane_Prefecture.html",
      asOf: SEEN_ON,
    },
    sources.tripadvisor,
  ),
] as const;

/** What guests mention most, summarised from reviews (not quotes). */
export const praise = fact(
  [
    "Exceptional cleanliness",
    "Comfortable curtained beds",
    "Strong air-conditioning",
    "The breakfast",
    "Friendly, helpful staff",
    "A calm, quiet atmosphere",
    "Good value",
  ] as const,
  sources.reviews,
);

/** Honest notes from reviews, phrased as advice. */
export const honestNotes = [
  fact(
    "Lockers suit a day pack better than a big backpack, so keep valuables in a small bag.",
    sources.reviews,
  ),
  fact(`The dorms have ${beds.podsPerDorm.value} pods each and can feel full.`, sources.reviews, {
    note: "Guests say the dorm can feel full. The number of pods is the owner's (beds.podsPerDorm).",
  }),
] as const;

/** The booking and review sites, each with its own logo (components/ui/BrandMark.tsx). */
export type SiteMark = "booking" | "agoda" | "tripadvisor";

export interface ReviewSite {
  readonly platform: string;
  readonly mark: SiteMark;
  /** The house's page on the site. */
  readonly url: string;
  /** Guests can book there as well as read reviews. */
  readonly bookable: boolean;
  /** The site's score, from `ratings`; null until one is recorded. */
  readonly rating: Rating | null;
}

const ratingOn = (platform: string): Rating | null => ratings.find((r) => r.value.platform === platform)?.value ?? null;

/**
 * The sites in the rating strip (components/RatingStrip.tsx), in the order a
 * guest would book: each opens the house's page there, to book or read the
 * reviews. Agoda's score is not recorded yet: its badge says "Book or read
 * reviews" until a rating for Agoda is added to `ratings`.
 */
export const reviewSites: readonly ReviewSite[] = [
  { platform: "Booking.com", mark: "booking", url: identity.links.booking.value, bookable: true, rating: ratingOn("Booking.com") },
  { platform: "Agoda", mark: "agoda", url: identity.links.agoda.value, bookable: true, rating: ratingOn("Agoda") },
  { platform: "Tripadvisor", mark: "tripadvisor", url: identity.links.tripadvisor.value, bookable: false, rating: ratingOn("Tripadvisor") },
];

export interface Testimonial {
  /** The guest's words, exactly as written; shortened only with "…". */
  readonly quote: string;
  /** First name only, as the guest signed the review. */
  readonly name: string;
  /** Where the guest is from, as the review says. */
  readonly from: string;
  /** Where the review was written ("Booking.com", "Agoda", "Tripadvisor", "Google", or "To the team"). */
  readonly platform: string;
  /** The month of the stay or the review, as YYYY-MM. */
  readonly month: string;
  /** What the quote is about, so the home page shows a spread (sleep, cleanliness, the team, breakfast…). */
  readonly topic: string;
  /**
   * The guest agreed to be quoted on this website. Only quotes with
   * `agreed: true` are shown (docs/CONTENT.md: never quote a review unless
   * the guest has agreed).
   */
  readonly agreed: boolean;
}

/**
 * Guests' own words for the home page (components/home/Testimonials.tsx).
 * Add each review the owner picks here, word for word, with `agreed: false`
 * until the guest says yes; the home page shows the section once at least
 * three are agreed.
 */
export const testimonials: readonly Testimonial[] = [];

/** The quotes the home page may show: agreed, one per guest. */
export function shownTestimonials(list: readonly Testimonial[] = testimonials): readonly Testimonial[] {
  const seen = new Set<string>();
  return list.filter((t) => {
    const who = `${t.name}|${t.from}|${t.platform}`;
    if (!t.agreed || seen.has(who)) return false;
    seen.add(who);
    return true;
  });
}
