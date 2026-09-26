import { airportTransport, immigration, location, plainOfJars } from "./area";
import type { Fact } from "./fact";
import { identity, whatsappUrl } from "./identity";
import type { Inline } from "./inline";
import { honestNotes, praise, ratings } from "./reviews";
import { SEEN_ON } from "./sources";
import { amenities, atmosphere, bathrooms, beds, rules, staff, times } from "./stay";
import { formatDate, joinList, lowerFirst } from "./text";

/*
 * Answer-first guides (/guides/…): each opens with the question and its
 * answer, then the facts at a glance and the detail. Like the FAQ, every
 * fact is read from the content layer. What guests say is said as guests say
 * it; `facts` lists everything a guide uses, for its sources line and tests.
 */

export interface GlanceRow {
  readonly term: string;
  readonly value: string;
  /** A short line under the row, e.g. who says so. */
  readonly note?: string;
  /** Makes the value a link. */
  readonly href?: string;
}

export interface GuideStep {
  readonly title: string;
  readonly body: readonly Inline[];
}

interface SectionBase {
  readonly id: string;
  readonly title: string;
  /** A short line under the heading. */
  readonly aside?: string;
}

export type GuideSection =
  | (SectionBase & { readonly kind: "steps"; readonly steps: readonly GuideStep[] })
  | (SectionBase & { readonly kind: "text"; readonly paragraphs: readonly (readonly Inline[])[] })
  | (SectionBase & { readonly kind: "list"; readonly items: readonly (readonly Inline[])[] })
  /** The house's address, set large to show a driver, with a copy button. */
  | (SectionBase & { readonly kind: "address" });

export interface Guide {
  /** The page is /guides/{slug}. */
  readonly slug: string;
  /** Short name, for breadcrumbs and links. */
  readonly name: string;
  /** One line for links to the guide. */
  readonly teaser: string;
  /** The page's name in search results; " · House of Jars Hostel, Vientiane" follows it. */
  readonly title: string;
  /** The whole title in search results, when the site name reads better inside it. */
  readonly fullTitle?: string;
  readonly description: string;
  /** The question the guide answers: its heading. */
  readonly question: string;
  /** The answer, first. */
  readonly answer: readonly Inline[];
  readonly glance: { readonly variant: "standards" | "places"; readonly rows: readonly GlanceRow[] };
  readonly sections: readonly GuideSection[];
  /** Pages to read next, by path. */
  readonly related: readonly string[];
  /** Every fact the guide uses. */
  readonly facts: readonly Fact<unknown>[];
  /** When the guide was last checked against the content and its sources (YYYY-MM-DD). */
  readonly reviewed: string;
}

export const GUIDES_PATH = "/guides";

export function guidePath(guide: Pick<Guide, "slug">): string {
  return `${GUIDES_PATH}/${guide.slug}`;
}

function amenity(schemaName: string) {
  const found = amenities.find((item) => item.value.schemaName === schemaName);
  if (!found) throw new Error(`No amenity "${schemaName}" in content/stay.ts`);
  return found;
}

const { airport, mekong, museum, nightMarket } = location.nearby;
const { ldif, registration } = immigration;
const { phone } = identity.contact;
const luggage = amenity("Luggage storage");
const airConditioning = amenity("Air conditioning");
const [noSmoking, calmNights, noParties] = rules.house;
const earlyCheckIn = rules.stay[2]!;
const passport = rules.stay[3]!;
const address = Object.values(identity.address);
const podHas = joinList(beds.perBed.value.map((item) => `a ${item.toLowerCase()}`));

const fromTheAirport: Guide = {
  slug: "from-wattay-airport",
  name: "From the airport",
  teaser: `${airport.value.distance} from ${airport.value.place}: asking the team for a ride, and the address for your driver.`,
  title: "Wattay Airport to the house",
  description: `${identity.name.value} is ${lowerFirst(airport.value.distance)} from ${airport.value.place}. How to ask the team for a ride, the address for your driver, and check-in times.`,
  question: `How do I get from Wattay Airport to ${identity.name.value}?`,
  answer: [
    `${identity.name.value} is ${lowerFirst(airport.value.distance)} from ${airport.value.place}. Guests say ${lowerFirst(airportTransport.value)} `,
    { text: "Message them on WhatsApp", href: whatsappUrl() },
    " with your flight and arrival time.",
  ],
  glance: {
    variant: "standards",
    rows: [
      { term: "Distance", value: airport.value.distance },
      { term: "A ride", value: "The team can arrange one", note: "From guest reviews: ask when you message them." },
      { term: "Its price", value: "Ask the team", note: "Not published yet." },
      { term: "Reception", value: staff.hours.value.summary },
      {
        term: "Check-in",
        value: `From ${times.checkIn.value}`,
        note: `Early check-in: ${lowerFirst(times.earlyCheckIn.value)}.`,
      },
      { term: "WhatsApp", value: phone.value.display, href: whatsappUrl() },
    ],
  },
  sections: [
    {
      kind: "steps",
      id: "step-by-step",
      title: "Step by step",
      aside: "From the plane to your pod.",
      steps: [
        {
          title: "Before you fly",
          body: [
            { text: "Message the team on WhatsApp", href: whatsappUrl() },
            ` (${phone.value.display}) with your flight and arrival time, and ask about a ride from the airport. Then check whether you can fill in the `,
            { text: "Lao Digital Immigration Form", href: "/guides/lao-digital-immigration-form" },
            " online before you travel.",
          ],
        },
        {
          title: "When you land",
          body: [
            `The house is ${lowerFirst(airport.value.distance)} away. Show your driver the address below: copy it to your phone, or print this page.`,
          ],
        },
        {
          title: "At the house",
          body: [
            `The team is ${lowerFirst(staff.hours.value.summary)}, so someone is at the desk whenever you arrive. Check-in is from ${times.checkIn.value}. ${earlyCheckIn.value.rule} Until then there is ${lowerFirst(luggage.value.name)} for your bags. ${registration.value}`,
          ],
        },
      ],
    },
    {
      kind: "address",
      id: "address",
      title: "The address, for your driver",
      aside: "Copy it, or print this page: the address prints large.",
    },
  ],
  related: ["/vientiane", "/guides/lao-digital-immigration-form", "/house-rules"],
  facts: [
    identity.name,
    airport,
    airportTransport,
    phone,
    staff.hours,
    times.checkIn,
    times.earlyCheckIn,
    earlyCheckIn,
    luggage,
    registration,
    passport,
    ...address,
  ],
  reviewed: "2026-09-26",
};

const immigrationForm: Guide = {
  slug: "lao-digital-immigration-form",
  name: "The immigration form",
  teaser: "The Lao Digital Immigration Form (LDIF): filling it in online before you arrive, and where the official page is.",
  title: "Lao Digital Immigration Form",
  description:
    "Travellers can complete the Lao Digital Immigration Form (LDIF) online before arrival. What it is, the official page, and what to bring to check-in.",
  question: "Can I fill in the Lao immigration form before I arrive?",
  answer: [
    `${ldif.value.summary} `,
    { text: "Official information from the Lao Department of Immigration", href: ldif.value.url },
    ".",
  ],
  glance: {
    variant: "standards",
    rows: [
      { term: "The form", value: ldif.value.name },
      { term: "Where", value: "Online, before arrival" },
      {
        term: "Introduced",
        value: "September 2025",
        note: "In stages, at some entry points first, with wider rollout planned.",
      },
      { term: "Official page", value: new URL(ldif.value.url).hostname, href: ldif.value.url },
      { term: "At check-in", value: "Your passport", note: registration.value },
    ],
  },
  sections: [
    {
      kind: "steps",
      id: "before-you-travel",
      title: "Before you travel",
      steps: [
        {
          title: "Check your entry point",
          body: [
            "The form was introduced in stages from September 2025, at some entry points first, with wider rollout planned. Check the official page for your entry point.",
          ],
        },
        {
          title: "Fill it in online",
          body: [
            "If it applies to you, complete the form online before arrival, on the ",
            { text: "official website", href: ldif.value.url },
            ".",
          ],
        },
        { title: "Bring your passport", body: [registration.value] },
      ],
    },
    {
      kind: "text",
      id: "visas",
      title: "Visas and other rules",
      paragraphs: [
        [
          "This guide is only about the arrival form. For visas and anything else about entering Laos, rely on the ",
          { text: "Lao Department of Immigration’s website", href: new URL(ldif.value.url).origin },
          ", not on this page.",
        ],
      ],
    },
    {
      kind: "text",
      id: "checked",
      title: "When we last checked",
      paragraphs: [
        [
          `We last read the official page on ${formatDate(SEEN_ON)}. The rollout is still changing, so check it again before you travel.`,
        ],
      ],
    },
  ],
  related: ["/guides/from-wattay-airport", "/house-rules", "/faq"],
  facts: [ldif, registration, passport],
  reviewed: "2026-09-26",
};

const nearby: Guide = {
  slug: "whats-nearby",
  name: "What’s nearby",
  teaser: `Walking times from ${identity.address.village.value} to the ${mekong.value.place} and the ${museum.value.place}, and what lies further afield.`,
  title: `What’s nearby in ${identity.address.village.value}`,
  description: `${identity.name.value} is in ${identity.address.village.value}, central Vientiane: ${lowerFirst(mekong.value.distance)} from the ${mekong.value.place} and ${lowerFirst(museum.value.distance)} from the ${museum.value.place}.`,
  question: `What is near ${identity.name.value}?`,
  answer: [
    `The house is in ${location.neighbourhood.value}, ${lowerFirst(mekong.value.distance)} from the ${mekong.value.place} and ${lowerFirst(museum.value.distance)} from the ${museum.value.place}. Guests say the ${lowerFirst(nightMarket.value.place)} is ${lowerFirst(nightMarket.value.distance)}.`,
  ],
  glance: {
    variant: "places",
    rows: [
      { term: mekong.value.place, value: mekong.value.distance },
      { term: museum.value.place, value: museum.value.distance },
      { term: nightMarket.value.place, value: nightMarket.value.distance, note: "From guest reviews." },
      { term: airport.value.place, value: airport.value.distance },
    ],
  },
  sections: [
    {
      kind: "text",
      id: "further-afield",
      title: "Further afield",
      paragraphs: [[`${plainOfJars.summary.value} `, { text: "Why the house is called House of Jars", href: "/about#name" }, "."]],
    },
    {
      kind: "text",
      id: "anywhere-else",
      title: "Anywhere else",
      paragraphs: [
        [
          "For walking times to anywhere else, ",
          { text: "ask the team", href: "/book#contact" },
          ". They reply by email or WhatsApp.",
        ],
      ],
    },
  ],
  related: ["/guides/from-wattay-airport", "/guides/quiet-hostel-vientiane", "/the-house"],
  facts: [
    identity.name,
    identity.address.village,
    location.neighbourhood,
    mekong,
    museum,
    nightMarket,
    airport,
    plainOfJars.summary,
  ],
  reviewed: "2026-09-26",
};

const quietStay: Guide = {
  slug: "quiet-hostel-vientiane",
  name: "A quiet stay",
  teaser: "Curtained pods, no hen or stag parties and a team on site day and night: why guests call the house calm.",
  title: "A quiet, clean hostel in Vientiane",
  fullTitle: `A quiet, clean hostel in Vientiane · ${identity.name.value}`,
  description: `Guests describe ${identity.name.value} as calm, quiet and very clean: curtained pod beds, no hen or stag parties, no smoking and a team on site 24 hours.`,
  question: `Is ${identity.name.value} a quiet hostel?`,
  answer: [`${atmosphere.summary.value} ${noParties!.value.rule} ${noSmoking!.value.rule}`],
  glance: {
    variant: "standards",
    rows: [
      { term: "Beds", value: "Curtained pods", note: `Each with ${podHas}.` },
      times.quietHours
        ? { term: "Nights", value: `Quiet hours ${times.quietHours.value}` }
        : { term: "Nights", value: "Calm and quiet", note: "From guest reviews. Ask the team about set quiet hours." },
      { term: "Parties", value: "No hen or stag parties" },
      { term: "Smoking", value: "Not anywhere in the house" },
      { term: "Reception", value: staff.hours.value.summary },
      { term: "Bathrooms", value: bathrooms.cleaning.value, note: "From guest reviews. Shared, with hot showers." },
      { term: "Air-conditioning", value: "Strong", note: "From guest reviews." },
    ],
  },
  sections: [
    {
      kind: "list",
      id: "what-guests-say",
      title: "What guests mention most",
      aside: "Summarised from guest reviews, not quotes.",
      items: praise.value.map((item) => [item]),
    },
    {
      kind: "list",
      id: "ratings",
      title: "Ratings on other sites",
      aside: "As each site showed them on the date given; follow the links for today’s figures.",
      items: ratings.map(({ value: rating }) => [
        `${rating.platform}: ${rating.score}${rating.outOf ? ` out of ${rating.outOf}` : ""}, ${rating.context} (as of ${formatDate(rating.asOf)}).`,
        ...(rating.url ? [" ", { text: `See it on ${rating.platform}`, href: rating.url }] : []),
      ]),
    },
    {
      kind: "list",
      id: "good-to-know",
      title: "Good to know",
      aside: "From what guests tell us.",
      items: honestNotes.map((note) => [note.value]),
    },
  ],
  related: ["/house-rules", "/the-house", "/guides/whats-nearby"],
  facts: [
    identity.name,
    atmosphere.summary,
    noSmoking!,
    calmNights!,
    noParties!,
    beds.perBed,
    ...(times.quietHours ? [times.quietHours] : []),
    staff.hours,
    bathrooms.shared,
    bathrooms.hotShowers,
    bathrooms.cleaning,
    airConditioning,
    praise,
    ...ratings,
    ...honestNotes,
  ],
  reviewed: "2026-09-26",
};

export const guides = { fromTheAirport, immigrationForm, nearby, quietStay } as const;

export type GuideId = keyof typeof guides;

/** In the order the guides index lists them. */
export const guideList: readonly Guide[] = [fromTheAirport, immigrationForm, nearby, quietStay];
