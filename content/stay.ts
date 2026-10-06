import { fact, type Fact } from "./fact";
import { sources } from "./sources";

export const times = {
  checkIn: fact("14:00", sources.booking, { note: 'Check-in from this time. House rules board: "Check-in: From 2 PM until 9 PM."' }),
  checkInUntil: fact("21:00", sources.signs, { note: 'House rules board: "Check-in: From 2 PM until 9 PM."' }),
  checkOut: fact("11:30", sources.booking, {
    note: 'Check-out until this time. The room rate sign and the house rules board: "Check-out: From 8 AM until 11.30 AM."',
  }),
  earlyCheckIn: fact("Possible, subject to availability", sources.booking),
  quietHours: fact("21:00–07:00", sources.signs, {
    note: 'Dormitory rules board: "Keep your voice down at all times. From 9 PM until 7 AM, do not make a noise."',
  }) as Fact<string> | null,
  frontDoorLocked: fact({ from: "23:30", until: "07:00" }, sources.signs, {
    note: 'House rules board: "Front door is locked from 11.30 PM until 7 AM. If you return late, please knock on the glass door, to wake up the night staff and they will open the door."',
  }),
} as const;

/** What a stay costs beyond the bed, and what happens to a payment (the house rules board). */
export const policies = {
  deposit: fact({ amount: "100,000 kip", covers: "your padlock and towel" }, sources.signs, {
    note: 'House rules board: "Deposit: 100,000 KIP for Padlock and Towel. To be returned at reception at check-out to get refunded."',
  }),
  secondTowel: fact("15,000 kip", sources.signs, { note: 'House rules board: "Pay additional 15,000 KIP for a 2nd towel (not refunded)."' }),
  refunds: fact("No refund once a stay is paid", sources.signs, {
    note: 'House rules board, under Check-in: "If you decide to cancel your stay after payment, you do not get a refund."',
  }),
  /** Why to book direct. No figures until the house publishes its prices. */
  directPrice: fact("Booking direct costs less than on the booking sites, because there are no platform fees.", sources.team, {
    confirmed: true,
    note: "The house's answer on 4 October 2026: book direct for a lower price; prices to be published later.",
  }),
  /** The same, short, for the hero. */
  directPriceShort: fact("Book direct and pay less: no booking-site fees.", sources.team, { confirmed: true }),
} as const;

/** What the team does for guests beyond the bed, and what the house leaves to the neighbours. */
export const services = {
  laundry: fact(
    {
      summary:
        "The house doesn’t do laundry, but several laundries within a 5-minute walk wash, dry and fold the same day, with detergent and softener included",
      price: "from about 100,000 kip a load",
    },
    sources.team,
    {
      confirmed: true,
      note: 'The team, 4 October 2026: "We don\'t do laundry but within a 5 min walk there are several same day wash and dry options starting at about 100k kip per load. With detergent and softener included plus folding. Prices vary."',
    },
  ),
  bookingHelp: fact("The team books train tickets, buses and tours for guests, usually for less than the prices online", sources.team, {
    confirmed: true,
    note: 'The team, 4 October 2026, asked whether they help book train tickets, buses or tours: "Yes we help book direct and it\'s cheaper with us than internet pricing."',
  }),
} as const;

export const building = {
  /** The floors of pod dorms, above the café: written as "Two floors of pod dorms above …". */
  floors: fact(2, sources.booking, {
    note: 'Counts the dorm floors above the café on the ground floor, so three storeys in all. The house rules board puts the dorms on the "2nd & 3rd floor", counting the ground floor as the 1st.',
  }),
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
  /** How many pods each dorm has: written as "Each dorm has 14 pods". */
  podsPerDorm: fact(14, sources.team, {
    confirmed: true,
    note: "The owner's bed register, 2026-10-05: each dorm has 14 pods.",
  }),
  /**
   * The room types guests can book, by name. Search engines read them from
   * the structured data, so list only rooms that certainly exist.
   */
  roomTypes: fact(["Mixed dorm"] as const, sources.booking, {
    note: "The listing shows a mixed dorm. Add a female-only dorm or private rooms only once the house confirms them.",
  }),
  /** The bed numbers the house skips, and why: written to follow "There is no pod 4, 13 or 14: …". */
  numbering: fact({ skipped: [4, 13, 14] as const, why: "so no guest is given an unlucky bed" }, sources.team, {
    confirmed: true,
    note: "Told by the owner on 2026-10-05, with the bed register: each dorm has 14 pods, numbered 01 to 17 without 4, 13 or 14, because many guests find those numbers unlucky.",
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
  hours: fact("08:00–10:30", sources.signs, {
    note: 'Room rate sign and menus: "Breakfast is served from 8 AM to 10:30 AM." House rules board: "Breakfast: From 8 AM until 10.30 AM."',
  }),
} as const;

export const staff = {
  /** `opens` and `closes` (HH:MM) give search engines the opening hours; 00:00 to 23:59 means around the clock. */
  hours: fact({ summary: "On site 24 hours", opens: "00:00", closes: "23:59" }, sources.booking),
  languages: fact(["English", "Lao", "Thai"] as const, sources.booking),
  transport: fact("Staff can arrange transport, including from the airport", sources.reviews),
  replies: fact("Quick replies to messages", sources.reviews),
  /** Written to follow "The team looks over and cleans the house …". */
  housekeepingRound: fact("about every hour", sources.team, {
    confirmed: true,
    note: "Told by the owner on 2026-10-05: housekeeping takes a look and cleans about every hour, and takes a photo after each clean.",
  }),
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

const door = times.frontDoorLocked.value;

export const rules = {
  house: [
    fact<HouseRule>(
      { rule: "No smoking anywhere in the house.", why: "Clean air in every dorm, and beds that smell fresh." },
      sources.booking,
      { note: "The house rules board lists smoking as not allowed too." },
    ),
    fact<HouseRule>(
      {
        rule: "Smoke out past the terrace, by the small jar for cigarette butts, not on the terrace itself.",
        why: "Smoke from the terrace drifts straight into the café.",
      },
      sources.team,
      { confirmed: true, note: "Told by the owner on 2026-10-05." },
    ),
    fact<HouseRule>(
      {
        rule: "No outside guests upstairs: the dorm floors are for registered guests, one to a pod.",
        why: "Everyone sleeps among people the house knows.",
      },
      sources.signs,
      { note: 'House rules board: "Un-registered guests on 2nd & 3rd floor" are not allowed (the dorm floors, counted from the ground floor as the 1st).' },
    ),
    fact<HouseRule>(
      { rule: "No outside food or drink in the house.", why: "So the house stays clean and fresh." },
      sources.signs,
      { note: 'House rules board: "Consuming outside food and drinks inside the hostel" is not allowed.' },
    ),
    fact<HouseRule>(
      { rule: "Eat and drink in the café on the ground floor, not in the dorms.", why: "Clean dorms, with no crumbs or smells." },
      sources.signs,
    ),
    fact<HouseRule>(
      { rule: "No strong-smelling food, such as durian or kimchi.", why: "A smell carries through a whole shared house." },
      sources.signs,
    ),
    fact<HouseRule>(
      { rule: "No shoes upstairs, on the dorm floors.", why: "Clean floors, as in most Lao homes." },
      sources.signs,
      { note: 'House rules board: "Shoes on 2nd & 3rd floor" are not allowed. The signs on the stairs and the dorm doors ask for it too.' },
    ),
    fact<HouseRule>({ rule: "No pets.", why: "The house is shared, and the dorms are for sleeping." }, sources.signs),
    fact<HouseRule>(
      { rule: "No drugs, weapons, flammable items or chemicals.", why: "For everyone’s safety." },
      sources.signs,
      { note: 'House rules board: "Prohibited drugs, weapons, flammable items & chemicals" are not allowed.' },
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
    fact<HouseRule>(
      {
        rule: `The front door is locked from ${door.from} until ${door.until}. Back late? Knock on the glass door and the night staff will let you in.`,
        why: "The house stays locked while guests sleep, and someone is always there to open it.",
      },
      sources.signs,
    ),
  ],
  stay: [
    fact<HouseRule>(
      { rule: `Check-in from ${times.checkIn.value} until ${times.checkInUntil.value}.`, why: "Time to clean every bed and make it up fresh." },
      sources.signs,
    ),
    fact<HouseRule>(
      { rule: `Arriving after ${times.checkInUntil.value}? Message the team before you travel.`, why: "So the team knows when to expect you." },
      sources.signs,
      { note: "The board's check-in hours end at 21:00; it says nothing about later arrivals, so the site asks guests to message ahead." },
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
      {
        rule: `A deposit of ${policies.deposit.value.amount} for ${policies.deposit.value.covers}, refunded at reception when you return them at check-out.`,
        why: `Both are lent to you for your stay. A second towel is ${policies.secondTowel.value}, not refunded.`,
      },
      sources.signs,
    ),
    fact<HouseRule>(
      { rule: "Check-out from 08:00 until 11:30.", why: "So beds are ready for the guests arriving that afternoon." },
      sources.signs,
    ),
    fact<HouseRule>(
      { rule: "Leaving before 08:00? Tell the team beforehand, so they can return your deposit.", why: "Check-out at the desk starts at 08:00." },
      sources.signs,
    ),
    fact<HouseRule>(
      { rule: "If you cancel your stay after paying, there is no refund.", why: "Your bed is kept for you from the moment you pay." },
      sources.signs,
      { note: policies.refunds.note },
    ),
    fact<HouseRule>(
      { rule: "Coming by motorbike or bicycle? Tell reception.", why: "Overnight parking outside is not allowed." },
      sources.signs,
    ),
  ],
} as const;
