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
      platform: "Agoda",
      score: "9.5",
      outOf: "10",
      context: "from 1,447 guest reviews",
      url: identity.links.agoda.value,
      asOf: "2026-10-07",
    },
    sources.agodaOwner,
    { confirmed: true, note: 'The owner\'s screenshot of the Agoda listing, 7 October 2026: "9.5 Exceptional, 1,447 reviews".' },
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

/** Agoda's scores by category, from the same screenshot as Agoda's rating. */
export const agodaScores = fact(
  [
    ["Cleanliness", "9.7"],
    ["Service", "9.6"],
    ["Value for money", "9.6"],
    ["Facilities", "9.4"],
    ["Location", "9.4"],
  ] as const,
  sources.agodaOwner,
  { confirmed: true },
);

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

export interface HonestReply {
  /** What a few guests wish were different, in our words (not a quote). */
  readonly said: string;
  /** The house's answer, in the owner's words. */
  readonly reply: string;
}

/**
 * The few things some guests wish were different, and the house's kind
 * answer to each (the owner, 7 October 2026): said with confidence, because
 * each is the house being what it means to be, and each has a remedy.
 */
export const honestReplies = [
  fact<HonestReply>(
    {
      said: "It’s too quiet, and not very social.",
      reply:
        "We’re sorry if you were hoping for a party! House of Jars is a quiet house on purpose: clean, warm and welcoming, a place to be at peace, rest well and enjoy a good breakfast.",
    },
    sources.owner,
    {
      confirmed: true,
      note: "The owner, 7 October 2026: we apologise, but this is primarily a clean, hospitable, warm place to be at peace, rest and enjoy a nice breakfast.",
    },
  ),
  fact<HonestReply>(
    {
      said: "The air-conditioning is too cold.",
      reply:
        "We keep the dorms cool on purpose, at a good temperature for sleep, and we’re generous with the air-conditioning because Vientiane is hot. If you sleep cold, tell the team: we can move you to a bed further from the air-conditioning, or bring you an extra blanket.",
    },
    sources.owner,
    {
      confirmed: true,
      note: "The owner, 7 October 2026: it's an ideal sleeping temperature, and we always keep the room cold and are generous with the AC because the region is hot; we can move a guest to a bed further from the AC or give an extra blanket.",
    },
  ),
] as const;

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
 * reviews, and shows the site's score from `ratings` when one is recorded.
 */
export const reviewSites: readonly ReviewSite[] = [
  { platform: "Booking.com", mark: "booking", url: identity.links.booking.value, bookable: true, rating: ratingOn("Booking.com") },
  { platform: "Agoda", mark: "agoda", url: identity.links.agoda.value, bookable: true, rating: ratingOn("Agoda") },
  { platform: "Tripadvisor", mark: "tripadvisor", url: identity.links.tripadvisor.value, bookable: false, rating: ratingOn("Tripadvisor") },
];

export interface Testimonial {
  /** The guest's words, exactly as the review shows them; shortened only with "…". */
  readonly quote: string;
  /** First name only, as the guest signed the review. */
  readonly name: string;
  /** Where the guest is from, as the review says. */
  readonly from: string;
  /** Where the review was written ("Booking.com", "Agoda", "Tripadvisor", "Google", or "To the team"). */
  readonly platform: string;
  /** The month of the stay or the review, as YYYY-MM; null when the review doesn't show it. */
  readonly month: string | null;
  /** The site translated the review into English (Agoda's own translation). */
  readonly translated?: boolean;
  /** What the quote is about, so the home page shows a spread (sleep, cleanliness, the team, breakfast…). */
  readonly topic: string;
  /**
   * Why the quote may be shown:
   * - "guest": the guest agreed to be quoted on this website;
   * - "owner": a short, word-for-word excerpt of a public review, credited
   *   and linked to the site it is on, picked by the owner (to confirm with
   *   the guest, or replace, before launch: content/open-questions.ts);
   * - "pending": not shown.
   */
  readonly consent: "guest" | "owner" | "pending";
}

/**
 * Guests' own words for the home page (components/home/Testimonials.tsx),
 * shown once at least three may be. The first three are Agoda reviews the
 * owner sent on 7 October 2026, about the house's cleanliness and its team.
 */
export const testimonials: readonly Testimonial[] = [
  {
    quote:
      "This is the cleanest hostel I have stayed at in Southeast Asia. Several people clean every day, and the bathrooms are generally cleaned immediately after each guest’s use.",
    name: "Jie",
    from: "China",
    platform: "Agoda",
    month: "2024-05",
    translated: true,
    topic: "cleanliness",
    consent: "owner",
  },
  {
    quote: "The staff’s cleaning is thorough, and cleanliness is consistently maintained. … I appreciate the kind and hardworking staff.",
    name: "Satoshi",
    from: "Japan",
    platform: "Agoda",
    month: "2026-07",
    translated: true,
    topic: "the team",
    consent: "owner",
  },
  {
    quote: "This is probably the best hostel I have ever stayed in.",
    name: "Joyce",
    from: "Singapore",
    platform: "Agoda",
    month: null,
    topic: "the stay",
    consent: "owner",
  },
];

/** The quotes the home page may show (not pending), one per guest. */
export function shownTestimonials(list: readonly Testimonial[] = testimonials): readonly Testimonial[] {
  const seen = new Set<string>();
  return list.filter((t) => {
    const who = `${t.name}|${t.from}|${t.platform}`;
    if (t.consent === "pending" || seen.has(who)) return false;
    seen.add(who);
    return true;
  });
}
