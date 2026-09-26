import { fact, type Fact } from "./fact";
import { sources } from "./sources";

export const times = {
  checkIn: fact("14:00", sources.booking, { note: "Check-in from this time." }),
  checkOut: fact("11:30", sources.booking, { note: "Check-out until this time." }),
  earlyCheckIn: fact("Possible, subject to availability", sources.booking),
  /** Quiet hours are not published anywhere yet. Set them here, e.g. "22:00–07:00". */
  quietHours: null as Fact<string> | null,
} as const;

export const building = {
  floors: fact(2, sources.booking),
  cafe: fact("A café on the ground floor", sources.booking),
} as const;

export const beds = {
  style: fact(
    "Dorms of pod-style beds: each bed is its own cubicle with a privacy curtain",
    sources.booking,
  ),
  perBed: fact(
    ["Privacy curtain", "Reading light", "Personal power socket", "Locker or safe"] as const,
    sources.booking,
  ),
  /** Written to follow "The dorms include …". */
  dorms: fact(["a mixed dorm", "a 14-bed dorm"] as const, sources.booking, {
    note: "A mixed dorm is listed and a 14-bed dorm is mentioned (they may be the same dorm). Other dorm types and sizes are not published.",
  }),
} as const;

export const bathrooms = {
  shared: fact(true, sources.booking),
  hotShowers: fact(true, sources.booking),
  cleaning: fact("Cleaned several times a day", sources.reviews),
} as const;

export const breakfast = {
  included: fact(true, sources.booking),
  items: fact(["Eggs", "Bread", "Sausage", "Fruit", "Tea or coffee"] as const, sources.reviews),
} as const;

export const staff = {
  hours: fact("On site 24 hours", sources.booking),
  languages: fact(["English", "Lao", "Thai"] as const, sources.booking),
  transport: fact("Staff can arrange transport, including from the airport", sources.reviews),
  replies: fact("Quick replies to messages", sources.reviews),
} as const;

/**
 * Amenities as listed publicly. `schemaName` feeds schema.org amenityFeature.
 */
export const amenities = [
  fact({ name: "Strong air-conditioning", schemaName: "Air conditioning" }, sources.reviews),
  fact({ name: "Free Wi-Fi", schemaName: "Free Wi-Fi" }, sources.booking),
  fact({ name: "Breakfast included", schemaName: "Free breakfast" }, sources.booking),
  fact({ name: "Café on the ground floor", schemaName: "Café" }, sources.booking),
  fact({ name: "Luggage storage", schemaName: "Luggage storage" }, sources.booking),
  fact({ name: "24-hour reception", schemaName: "24-hour front desk" }, sources.booking),
  fact({ name: "A locker or safe for every bed", schemaName: "Lockers" }, sources.booking),
  fact({ name: "Hot showers", schemaName: "Hot water" }, sources.booking),
  fact({ name: "Non-smoking throughout", schemaName: "Non-smoking" }, sources.booking),
] as const;

export const atmosphere = {
  summary: fact(
    "Calm, quiet and respectful. Guests describe it as a place to rest, not a party hostel.",
    sources.reviews,
  ),
} as const;

export interface HouseRule {
  readonly rule: string;
  readonly why: string;
}

export const rules = {
  house: [
    fact<HouseRule>(
      { rule: "No smoking anywhere in the house.", why: "Clean air in every dorm, and beds that smell fresh." },
      sources.booking,
    ),
    fact<HouseRule>(
      { rule: "Keep nights calm and quiet.", why: "Most guests come here to sleep well." },
      sources.reviews,
      { note: "Reviews describe a calm house. No quiet hours are published yet." },
    ),
    fact<HouseRule>(
      { rule: "No hen or stag parties.", why: "The house is built for rest, not for parties." },
      sources.booking,
    ),
    fact<HouseRule>(
      { rule: "Shoes off indoors.", why: "Clean floors, as in most Lao homes." },
      sources.oneReview,
      { note: "Seen in one source only. Please confirm." },
    ),
  ],
  stay: [
    fact<HouseRule>(
      { rule: "Check-in from 14:00.", why: "Time to clean every bed and make it up fresh." },
      sources.booking,
    ),
    fact<HouseRule>(
      { rule: "Check-out until 11:30.", why: "So beds are ready for the guests arriving that afternoon." },
      sources.booking,
    ),
    fact<HouseRule>(
      {
        rule: "Early check-in is possible when a bed is free.",
        why: "It depends on who checked out and whether the bed is ready.",
      },
      sources.booking,
    ),
    fact<HouseRule>(
      { rule: "Bring your passport to check-in.", why: "Guesthouses in Laos register foreign guests with the local authorities." },
      sources.laoLaw,
      { note: "Please confirm this matches how the house registers guests." },
    ),
  ],
} as const;
