import { fact, type Fact } from "./fact";
import { sources } from "./sources";

export const times = {
  checkIn: fact("14:00", sources.booking, { note: "Check-in from this time." }),
  checkOut: fact("11:30", sources.booking, { note: "Check-out until this time. The room rate sign says check-out is from 08:00 to 11:30." }),
  earlyCheckIn: fact("Possible, subject to availability", sources.booking),
  quietHours: fact("21:00–07:00", sources.signs, {
    note: 'Dormitory rules board: "Keep your voice down at all times. From 9 PM until 7 AM, do not make a noise."',
  }) as Fact<string> | null,
} as const;

export const building = {
  floors: fact(2, sources.booking),
  cafe: fact("A café on the ground floor", sources.booking),
  cafeDrinks: fact("08:00–19:00", sources.signs, {
    note: 'Café menu: "Coffee & Tea is served from 8.00 AM till 7.00 PM." Breakfast menu: guests are welcome to relax or work in the café after breakfast hours.',
  }),
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
  /**
   * The room types guests can book, by name. Search engines read them from
   * the structured data, so list only rooms that certainly exist.
   */
  roomTypes: fact(["Mixed dorm"] as const, sources.booking, {
    note: "The listing shows a mixed dorm (the 14-bed dorm in beds.dorms may be the same room, so it is not listed separately). Add a female-only dorm or private rooms only once the house confirms them.",
  }),
} as const;

export const bathrooms = {
  shared: fact(true, sources.booking),
  hotShowers: fact(true, sources.booking),
  cleaning: fact("Cleaned several times a day", sources.reviews),
} as const;

export const breakfast = {
  included: fact(true, sources.booking),
  items: fact(["Two fried eggs", "Salad", "Baguette", "Fruit", "Coffee or tea"] as const, sources.signs, {
    note: 'Breakfast menu for staying guests: "2 Fried Eggs, Salad, Baguette, Fruit. Hot Americano or Hot Espresso or Hot Lipton Tea." Other drinks cost extra (prices on the menu, not published here).',
  }),
  hours: fact("08:00–10:30", sources.signs, { note: 'Room rate sign and menus: "Breakfast is served from 8 AM to 10:30 AM."' }),
} as const;

export const staff = {
  /** `opens` and `closes` (HH:MM) give search engines the opening hours; 00:00 to 23:59 means around the clock. */
  hours: fact({ summary: "On site 24 hours", opens: "00:00", closes: "23:59" }, sources.booking),
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
      { rule: "No outside guests: each pod is for one registered guest.", why: "Everyone sleeps among people the house knows." },
      sources.signs,
    ),
    fact<HouseRule>(
      { rule: "Eat and drink in the café on the ground floor, not in the dorms.", why: "Clean dorms, with no crumbs or smells." },
      sources.signs,
    ),
    fact<HouseRule>(
      { rule: "Please take off your shoes.", why: "Clean floors, as in most Lao homes." },
      sources.signs,
      { note: "The signs on the stairs and the dorm doors ask for it." },
    ),
    fact<HouseRule>(
      { rule: "No hen or stag parties.", why: "The house is built for rest, not for parties." },
      sources.booking,
    ),
    fact<HouseRule>(
      { rule: "Leaving very early? Pack your bag on the ground floor.", why: "So the dorm can sleep on." },
      sources.signs,
    ),
    fact<HouseRule>(
      { rule: "Keep your voice down at all times.", why: "Most guests come here to sleep well." },
      sources.signs,
    ),
  ],
  stay: [
    fact<HouseRule>(
      { rule: "Check-in from 14:00.", why: "Time to clean every bed and make it up fresh." },
      sources.booking,
    ),
    fact<HouseRule>(
      { rule: "Check-out from 08:00 until 11:30.", why: "So beds are ready for the guests arriving that afternoon." },
      sources.signs,
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
    fact<HouseRule>(
      { rule: "Leaving before 08:00? Tell the team beforehand, so they can return your deposit.", why: "Check-out at the desk starts at 08:00." },
      sources.signs,
    ),
    fact<HouseRule>(
      { rule: "Coming by motorbike or bicycle? Tell reception.", why: "Overnight parking outside is not allowed." },
      sources.signs,
    ),
  ],
} as const;
