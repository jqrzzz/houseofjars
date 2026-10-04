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
  { ask: "Nang's own note for the About page, only if she would like to write one (identity.owner.note).", guestTopic: null },
  { ask: "A portrait of Nang for the home page, only if she would like one (identity.owner.portrait).", guestTopic: null },
  { ask: "A link to the Hostelz ranking page.", guestTopic: null },
  { ask: "The real story behind the name House of Jars (identity.nameStory).", guestTopic: null },
  { ask: "What the arch logo stands for, so the About page can tell its story.", guestTopic: null },
];
