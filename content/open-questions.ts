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
  { ask: "Map coordinates of the front door (enables geo data for maps and search engines).", guestTopic: "the exact map pin" },
  { ask: "Quiet hours, if the house has set times (times.quietHours).", guestTopic: "set quiet hours" },
  {
    ask: "Whether there is a female-only dorm, and which other dorm sizes exist.",
    guestTopic: "whether there is a female-only dorm, and dorm sizes other than the 14-bed dorm",
  },
  { ask: "Whether there are private rooms.", guestTopic: "private rooms" },
  { ask: "Breakfast serving times.", guestTopic: "breakfast serving times" },
  { ask: "Late check-out: possible or not, and on what terms.", guestTopic: "late check-out" },
  { ask: "Photos of the house: pods, bathrooms, café, the front of the house (PhotoFrame placeholders are waiting).", guestTopic: null },
  { ask: "Nang's own note for the About page, only if she would like to write one (identity.owner.note).", guestTopic: null },
  { ask: "A link to the Hostelz ranking page.", guestTopic: null },
  { ask: "The real story behind the name House of Jars (identity.nameStory).", guestTopic: null },
];
