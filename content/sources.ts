/** Where the published facts came from (public listings seen on 2026-09-25). */
export const SEEN_ON = "2026-09-25";

export const sources = {
  booking: `Booking.com listing, seen ${SEEN_ON}`,
  agoda: `Agoda listing, seen ${SEEN_ON}`,
  google: `Google Maps / Wanderlog listing, seen ${SEEN_ON}`,
  tripadvisor: `Tripadvisor listing, seen ${SEEN_ON}`,
  hostelz: `Hostelz ranking, seen ${SEEN_ON}`,
  facebook: `Facebook page, seen ${SEEN_ON}`,
  reviews: `Guest reviews on Booking.com and Tripadvisor, seen ${SEEN_ON}`,
  oneReview: `A single listing or review, seen ${SEEN_ON}`,
  signs: "The house's own signs and menus, photographed by the team on 2026-10-04 (photos/signs, photos/menus)",
  team: "Told by the house's team, 2026-10-04",
  immigration: `Lao Department of Immigration website, seen ${SEEN_ON}`,
  unesco: "UNESCO World Heritage List (inscribed 2019)",
  laoLaw: "General practice for guesthouses in Laos",
  assumption: "Assumption made while writing the site",
} as const;

/**
 * What a source can carry before the house confirms a fact from it (see
 * content/certainty.ts for how each kind may be presented):
 * - listing: the house's own public listings, signs and menus, and what its team tells us;
 * - official: an official body;
 * - guests: what many guest reviews say;
 * - one-source: seen in one place only;
 * - practice: general practice in Laos, not a fact about this house;
 * - assumption: our own guess.
 */
export type SourceKind = "listing" | "official" | "guests" | "one-source" | "practice" | "assumption";

export const sourceKinds: Readonly<Record<string, SourceKind>> = {
  [sources.booking]: "listing",
  [sources.agoda]: "listing",
  [sources.google]: "listing",
  [sources.tripadvisor]: "listing",
  [sources.hostelz]: "listing",
  [sources.facebook]: "listing",
  [sources.signs]: "listing",
  [sources.team]: "listing",
  [sources.reviews]: "guests",
  [sources.oneReview]: "one-source",
  [sources.immigration]: "official",
  [sources.unesco]: "official",
  [sources.laoLaw]: "practice",
  [sources.assumption]: "assumption",
};
