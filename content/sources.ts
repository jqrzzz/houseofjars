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
  immigration: `Lao Department of Immigration website, seen ${SEEN_ON}`,
  unesco: "UNESCO World Heritage List (inscribed 2019)",
  laoLaw: "General practice for guesthouses in Laos",
  assumption: "Assumption made while writing the site",
} as const;
