import { fact } from "./fact";
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
