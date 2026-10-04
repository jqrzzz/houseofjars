export interface OpenQuestion {
  /** What the house should tell us. */
  readonly ask: string;
  /** How a guest might ask about it; Shadow says it doesn't know. Null if guests wouldn't ask. */
  readonly guestTopic: string | null;
}

/**
 * Things the site deliberately leaves out until the house tells us.
 * `npm run content:check` prints these alongside unconfirmed facts.
 */
export const openQuestions: readonly OpenQuestion[] = [
  {
    ask: "Map coordinates of the front door, and the house's Google Maps link (they add a map pin and a map link to the structured data search engines read).",
    guestTopic: "the exact map pin",
  },
  {
    ask: "Airport transport: how the team arranges it (taxi, tuk-tuk or car), what it costs and how long the ride takes (for the airport guide).",
    guestTopic: "what airport transport costs and how long the ride takes",
  },
  {
    ask: "Other places guests often walk to from the house, with walking times (for the guide to what is nearby).",
    guestTopic: "walking times to places the website doesn't list",
  },
  {
    ask: "Whether there is a female-only dorm, and which other dorm sizes exist.",
    guestTopic: "whether there is a female-only dorm, and dorm sizes other than the 14-bed dorm",
  },
  { ask: "Whether there are private rooms.", guestTopic: "private rooms" },
  { ask: "Late check-out: possible or not, and on what terms.", guestTopic: "late check-out" },
  {
    ask: "Photos of the bathrooms and showers, the café and breakfast, and the outside in daylight (the dorms, pods, stairs and front of the house have photos; drawings stand in for the rest).",
    guestTopic: null,
  },
  {
    ask: "The layout of the house: which floor the dorms, the bathrooms and the front desk are on, and the building's shape. The drawing on /the-house (components/house/HouseCutaway.tsx) guesses and says it is an illustration, not a floor plan; with the real layout it can be made accurate.",
    guestTopic: "which floor the dorms, bathrooms and front desk are on",
  },
  {
    ask: "Where the team likes to eat nearby: a few local places, what to order there, roughly what it costs and when they are open (for Shadow and a food guide).",
    guestTopic: "local places to eat that the team recommends",
  },
  {
    ask: "The night market: which days and hours, and whether guests mean the riverside night market or a food market next door.",
    guestTopic: "the night market's days and hours",
  },
  {
    ask: "The nearest BRT bus stop to the house, the fare, and whether the airport shuttle bus still runs (the guides leave them out until checked).",
    guestTopic: "the nearest BRT stop, bus fares and the airport shuttle bus",
  },
  {
    ask: "How to get from the house to the Laos–China Railway station and to the Friendship Bridge, and roughly what each ride costs.",
    guestTopic: "what a ride to the railway station or the Friendship Bridge costs",
  },
  {
    ask: "Today's entry fees and opening hours at Wat Si Saket, Haw Phra Kaew, Patuxai, Pha That Luang, COPE and the Lao National Museum (sources online disagree, so the guides leave them out).",
    guestTopic: "entry fees and opening hours of the temples and museums",
  },
  {
    ask: "Where guests can buy a SIM card, change money and find a cash machine near the house.",
    guestTopic: "SIM cards, changing money and cash machines nearby",
  },
  {
    ask: "Bicycle or scooter rental near the house: where, and on what terms.",
    guestTopic: "renting a bicycle or scooter",
  },
  { ask: "A link to the Hostelz ranking page.", guestTopic: null },
  { ask: "The real story behind the name House of Jars (identity.nameStory).", guestTopic: null },
];
