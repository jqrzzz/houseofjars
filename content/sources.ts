/** Where the published facts came from (public listings seen on 2026-09-25). */
export const SEEN_ON = "2026-09-25";

/**
 * When the travel guides' sources were checked (content/travel.ts). They were
 * read through search results: the build environment can't open those sites,
 * so each fact's note says what to re-check on the page itself.
 */
export const TRAVEL_CHECKED = "2026-10-04";

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

  // The travel guides (content/travel.ts)
  lcrApp: `LCR Ticket on the App Store and Google Play (Laos-China Railway Company Limited), seen ${TRAVEL_CHECKED}`,
  lcrLaunch: "KPL (Lao News Agency) and the Laotian Times, March 2023: the LCR Ticket app goes live",
  lcrGuides: `Travel guides and booking sites on the Laos–China Railway (GeckoRoutes, Baolau, Wikipedia, Wikivoyage), seen ${TRAVEL_CHECKED}`,
  chinaTrains: "Chinese government (english.www.gov.cn), 2025-07-18: a second daily train between Kunming and Vientiane",
  bridgeCheckpoint: `Lao Department of Immigration: First Friendship Bridge checkpoint page, seen ${TRAVEL_CHECKED}`,
  ldifNews: "Lao Department of Immigration, September 2025: the digital arrival and departure card",
  thaiRules: "Tourism Authority of Thailand (tatnews.org), September 2026: new 30-day and 15-day visa exemption rules",
  borderGuides: `Travel guides on crossing to Thailand (Seat61, Theo-Courant, Wikivoyage) and on Thailand’s arrival card, seen ${TRAVEL_CHECKED}`,
  thaiTrainNews: "KPL (Lao News Agency), July 2024: the Bangkok–Vientiane train starts",
  loca: `LOCA’s website (loca.la), seen ${TRAVEL_CHECKED}`,
  cityNews: "The Laotian Times, KPL (Lao News Agency) and The Star, 2023–2026: Green SM, inDrive and Vientiane’s BRT",
  cityGuides: `Travel guides to Vientiane (Wikivoyage, Lonely Planet, Theo-Courant, thingstodoinlaos.com), seen ${TRAVEL_CHECKED}`,
  busNews: "KPL (Lao News Agency), 2016, and the Laotian Times, 2026-04-13: Vientiane’s Southern Bus Station",
  templeNews: "KPL (Lao News Agency), April 2026: entry fees waived at That Luang, Wat Si Saket and Haw Phra Kaew for Lao New Year",
  museumNews: "The Laotian Times, 2020-10-08: the new Lao National Museum opens",
  cope: `COPE Visitor Centre’s website (copelaos.org), seen ${TRAVEL_CHECKED}`,
  visitorPractice: "General practice for visitors in Laos",
} as const;

/**
 * What a source can carry before the house confirms a fact from it (see
 * content/certainty.ts for how each kind may be presented):
 * - listing: the house's own public listings, signs and menus, and what its team tells us;
 * - official: an official body, or a company or place about itself (its website, its app);
 * - press: news reports;
 * - travel-guide: travel guides, booking sites and reference works such as Wikipedia;
 * - guests: what many guest reviews say;
 * - one-source: seen in one place only;
 * - practice: general practice in Laos, not a fact about this house;
 * - assumption: our own guess.
 */
export type SourceKind =
  | "listing"
  | "official"
  | "press"
  | "travel-guide"
  | "guests"
  | "one-source"
  | "practice"
  | "assumption";

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
  [sources.lcrApp]: "official",
  [sources.lcrLaunch]: "press",
  [sources.lcrGuides]: "travel-guide",
  [sources.chinaTrains]: "official",
  [sources.bridgeCheckpoint]: "official",
  [sources.ldifNews]: "official",
  [sources.thaiRules]: "official",
  [sources.borderGuides]: "travel-guide",
  [sources.thaiTrainNews]: "press",
  [sources.loca]: "official",
  [sources.cityNews]: "press",
  [sources.cityGuides]: "travel-guide",
  [sources.busNews]: "press",
  [sources.templeNews]: "press",
  [sources.museumNews]: "press",
  [sources.cope]: "official",
  [sources.visitorPractice]: "practice",
};
