import { airportTransport, immigration, location, plainOfJars } from "./area";
import type { Fact } from "./fact";
import { identity, whatsappUrl } from "./identity";
import type { Inline } from "./inline";
import { honestNotes, praise, ratings } from "./reviews";
import { SEEN_ON, TRAVEL_CHECKED } from "./sources";
import { amenities, atmosphere, bathrooms, beds, rules, services, staff, times } from "./stay";
import { gettingAround, railway, sights, toThailand } from "./travel";
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

const { airport, mekong, nightMarket } = location.nearby;
const { ldif, registration } = immigration;
const { phone } = identity.contact;
const luggage = amenity("Luggage storage");
const airConditioning = amenity("Air conditioning");
/** A house rule by its opening words (never by its place in the list, which grows as the signs are read). */
function rule(list: readonly Fact<{ rule: string }>[], start: string) {
  const found = list.find((item) => item.value.rule.startsWith(start));
  if (!found) throw new Error(`No rule starting "${start}" in content/stay.ts`);
  return found;
}

const noSmoking = rule(rules.house, "No smoking");
const calmNights = rule(rules.house, "Keep your voice down");
const noParties = rule(rules.house, "No hen or stag parties");
const earlyCheckIn = rule(rules.stay, "Early check-in");
const passport = rule(rules.stay, "Bring your passport");
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
        value: `${times.checkIn.value} to ${times.checkInUntil.value}`,
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
            `The team is ${lowerFirst(staff.hours.value.summary)}, so someone is at the desk whenever you arrive. Check-in is from ${times.checkIn.value} until ${times.checkInUntil.value}; arriving later, message the team before you travel. ${earlyCheckIn.value.rule} Until then there is ${lowerFirst(luggage.value.name)} for your bags. ${registration.value}`,
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
    times.checkInUntil,
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
      { term: "The form", value: /\(([^)]+)\)$/.exec(ldif.value.name)?.[1] ?? ldif.value.name, note: `${ldif.value.name}.` },
      { term: "Where", value: "Online", note: "Before arrival." },
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
  teaser: `Walking times from ${identity.address.village.value} to the ${mekong.value.place}, where the National Museum is now, and what lies further afield.`,
  title: `What’s nearby in ${identity.address.village.value}`,
  description: `${identity.name.value} is in ${identity.address.village.value}, central Vientiane, ${lowerFirst(mekong.value.distance)} from the ${mekong.value.place}: what is close by, and what lies further afield.`,
  question: `What is near ${identity.name.value}?`,
  answer: [
    `The house is in ${location.neighbourhood.value}, ${lowerFirst(mekong.value.distance)} from the ${mekong.value.place}. Guests say the ${lowerFirst(nightMarket.value.place)} is ${lowerFirst(nightMarket.value.distance)}.`,
  ],
  glance: {
    variant: "places",
    rows: [
      { term: mekong.value.place, value: mekong.value.distance },
      { term: nightMarket.value.place, value: nightMarket.value.distance, note: "From guest reviews." },
      { term: "Laundries", value: "Within a 5-minute walk", note: "Same-day wash, dry and fold." },
      { term: airport.value.place, value: airport.value.distance },
    ],
  },
  sections: [
    {
      kind: "text",
      id: "laundry",
      title: "Laundry",
      paragraphs: [[`${services.laundry.value.summary}, ${services.laundry.value.price} (prices vary).`]],
    },
    {
      kind: "text",
      id: "museum",
      title: "The National Museum has moved",
      paragraphs: [
        [
          `${sights.museumMoved.value}, the Laotian Times reported. Some listings still show it a short walk from the house, so check before you go.`,
        ],
      ],
    },
    {
      kind: "text",
      id: "a-day-out",
      title: "A day out",
      paragraphs: [
        [
          "Temples, the COPE Visitor Centre, Patuxai and That Luang, then sunset by the river: ",
          { text: "a day in Vientiane, step by step", href: "/guides/one-day-in-vientiane" },
          ".",
        ],
      ],
    },
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
  related: ["/guides/one-day-in-vientiane", "/guides/getting-around-vientiane", "/guides/quiet-hostel-vientiane"],
  facts: [
    identity.name,
    identity.address.village,
    location.neighbourhood,
    mekong,
    nightMarket,
    airport,
    services.laundry,
    sights.museumMoved,
    plainOfJars.summary,
  ],
  reviewed: TRAVEL_CHECKED,
};

const quietStay: Guide = {
  slug: "quiet-hostel-vientiane",
  name: "A quiet stay",
  teaser: "Curtained pods, no hen or stag parties and a team on site day and night: why guests call the house calm.",
  title: "A quiet, clean hostel in Vientiane",
  fullTitle: `A quiet, clean hostel in Vientiane · ${identity.name.value}`,
  description: `Guests describe ${identity.name.value} as calm, quiet and very clean: curtained pod beds, no hen or stag parties, no smoking and a team on site 24 hours.`,
  question: `Is ${identity.name.value} a quiet hostel?`,
  answer: [`${atmosphere.summary.value} ${noParties.value.rule} ${noSmoking.value.rule}`],
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
    noSmoking,
    calmNights,
    noParties,
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


/** Where a travel guide's facts were last checked, and what to check again before going. */
function lastChecked(what: string): GuideSection {
  return {
    kind: "text",
    id: "checked",
    title: "When we last checked",
    paragraphs: [
      [
        `We last checked these sources on ${formatDate(TRAVEL_CHECKED)}. ${what} If something has changed, `,
        { text: "tell the team", href: "/book#contact" },
        ", and we will put it right.",
      ],
    ],
  };
}

const { app } = railway;

const trainTickets: Guide = {
  slug: "laos-china-railway-tickets",
  name: "Train tickets",
  teaser: `Buying Laos–China Railway tickets yourself: the official ${app.value.name} app, when sales open, passports and the way to the station.`,
  title: "Laos–China Railway tickets",
  description: `How to buy Laos–China Railway tickets yourself in Vientiane: the official ${app.value.name} app, station ticket offices, passports and getting to the station.`,
  question: "How do I buy Laos–China Railway tickets in Vientiane?",
  answer: [
    `Buy them yourself in ${app.value.name}, the railway’s own app, with ${lowerFirst(railway.passports.value.short)}, or ask the team to book them. Travel sites report that ${lowerFirst(railway.onSale.value.rule)} and that ${lowerFirst(railway.sellOut.value)}, so book on the first day you can.`,
  ],
  glance: {
    variant: "standards",
    rows: [
      { term: "Official app", value: app.value.name, note: "The railway’s own, for iPhone and Android." },
      { term: "On sale", value: railway.onSale.value.short, note: "For trains within Laos, travel sites report." },
      { term: "You need", value: railway.passports.value.short, note: "Tickets carry each traveller’s name, travel guides say." },
      { term: "The station", value: railway.station.value, note: "Vientiane railway station, travel guides say." },
      { term: "To Vang Vieng", value: railway.journeys.value.vangVieng, note: "By fast train, travel guides say." },
      { term: "To Luang Prabang", value: railway.journeys.value.luangPrabang, note: "By fast train, travel guides say." },
      { term: "Or", value: "The team books them", note: "Usually for less than the prices online." },
    ],
  },
  sections: [
    {
      kind: "steps",
      id: "step-by-step",
      title: "Step by step",
      aside: "From your phone to your seat.",
      steps: [
        {
          title: "Get the app",
          body: [
            `Download ${app.value.name}, the railway’s own app, from the `,
            { text: "App Store", href: app.value.appStore },
            " or ",
            { text: "Google Play", href: app.value.googlePlay },
            ". Sign up a few days before you need a ticket, so there is time to sort out any trouble with the sign-up or your card.",
          ],
        },
        {
          title: "Have every passport ready",
          body: [`${railway.passports.value.rule}, travel guides say. Type each one exactly as it is in the passport.`],
        },
        {
          title: "Book the day sales open",
          body: [
            `Travel sites report that ${lowerFirst(railway.onSale.value.rule)}, and that ${lowerFirst(railway.sellOut.value)}. Book on the first day you can, above all around holidays.`,
          ],
        },
        {
          title: "Or buy at a station",
          body: [`${railway.stationTickets.value}, the Lao news agency KPL reported when the app launched in 2023.`],
        },
        {
          title: "Or let the team book",
          body: [
            `${services.bookingHelp.value}. `,
            { text: "Send them your trip", href: "/trips?kind=train" },
            ", or ask at the desk.",
          ],
        },
        {
          title: "Get to the station early",
          body: [
            `Vientiane railway station is ${lowerFirst(railway.station.value)}, travel guides say, and one suggests arriving ${railway.arriveEarly.value}. Book a ride in a taxi app (see `,
            { text: "Getting around Vientiane", href: "/guides/getting-around-vientiane" },
            ") and leave plenty of time.",
          ],
        },
      ],
    },
    {
      kind: "text",
      id: "the-right-station",
      title: "The right station",
      paragraphs: [
        [
          `${railway.khamsavath.value} from the Laos–China Railway’s, travel guides say (see `,
          { text: "Crossing to Thailand", href: "/guides/vientiane-to-thailand" },
          "). For Vang Vieng, Luang Prabang and China, go to Vientiane railway station.",
        ],
      ],
    },
    {
      kind: "text",
      id: "to-china",
      title: "Trains to China",
      paragraphs: [
        [
          `${railway.toChina.value}, the Chinese government reported in July 2025. ${railway.chinaTickets.value}, travel guides say. Before you book, check China’s entry rules for your passport with `,
          { text: "China’s National Immigration Administration", href: "https://en.nia.gov.cn/" },
          " or a Chinese embassy.",
        ],
      ],
    },
    lastChecked(`Timetables, the booking window and the app change, so check in ${app.value.name} before you travel.`),
  ],
  related: ["/guides/getting-around-vientiane", "/guides/vientiane-to-thailand", "/vientiane"],
  facts: [
    app,
    railway.passports,
    railway.onSale,
    railway.sellOut,
    railway.stationTickets,
    railway.station,
    railway.arriveEarly,
    railway.journeys,
    railway.khamsavath,
    railway.toChina,
    railway.chinaTickets,
    services.bookingHelp,
  ],
  reviewed: TRAVEL_CHECKED,
};

const { loca } = gettingAround;

const gettingAroundTown: Guide = {
  slug: "getting-around-vientiane",
  name: "Getting around",
  teaser: "Taxi apps that work in Laos, tuk-tuks, the new BRT buses and which bus station serves where: getting around on your own.",
  title: "Getting around Vientiane",
  description: `How to get around Vientiane on your own, from ${identity.name.value}: taxi apps that work in Laos, tuk-tuks, the BRT buses and the city’s three bus stations.`,
  question: "How do I get around Vientiane?",
  answer: [
    `Walk around the centre: the ${mekong.value.place} is ${lowerFirst(mekong.value.distance)} from the house. For longer rides, book a taxi or tuk-tuk in ${loca.value.name}, the Lao taxi app, or ${lowerFirst(gettingAround.tukTuks.value)}, as is usual in Laos.`,
  ],
  glance: {
    variant: "standards",
    rows: [
      { term: "On foot", value: `The ${mekong.value.place}, ${lowerFirst(mekong.value.distance)}` },
      { term: "Taxi app", value: loca.value.name, note: "Taxis, tuk-tuks and motorbike taxis, day and night.", href: loca.value.url },
      { term: "Electric taxis", value: "Green SM", note: "Called Xanh SM until April 2026, news reports say." },
      { term: "Tuk-tuks", value: "Agree the fare first", note: "As is usual in Laos." },
      { term: "BRT buses", value: gettingAround.brt.value.short, note: "From Talat Sao, news reports say." },
      { term: "Long-distance buses", value: "Three bus stations", note: "Northern, Southern and Central, travel guides say." },
    ],
  },
  sections: [
    {
      kind: "list",
      id: "taxi-apps",
      title: "Taxi apps that work",
      aside: "As the apps, travel guides and news reports describe them.",
      items: [
        [`${loca.value.name}: ${loca.value.summary}. `, { text: "loca.la", href: loca.value.url }],
        [`Green SM: ${lowerFirst(gettingAround.greenSm.value)}, news reports say.`],
        [
          `${gettingAround.notInLaos.value}, travel guides say, and ${gettingAround.inDrive.value}, news reports say, so don’t count on them.`,
        ],
      ],
    },
    {
      kind: "text",
      id: "tuk-tuks",
      title: "Tuk-tuks",
      paragraphs: [
        [`In Laos, ${lowerFirst(gettingAround.tukTuks.value)}: ask the price, agree it, then ride. Or book a tuk-tuk in ${loca.value.name}.`],
      ],
    },
    {
      kind: "text",
      id: "brt",
      title: "The BRT buses",
      aside: "Vientiane’s new bus rapid transit.",
      paragraphs: [
        [
          `${gettingAround.brt.value.route}, news reports say. ${gettingAround.brtSecondRoute.value}. Fares and routes are still changing, so `,
          { text: "ask the team", href: "/book#contact" },
          " for the nearest stop.",
        ],
      ],
    },
    {
      kind: "list",
      id: "bus-stations",
      title: "Long-distance buses",
      aside: "Which station serves where, from travel guides and news reports.",
      items: [
        [`${gettingAround.northernStation.value}.`],
        [`${gettingAround.southernStation.value}.`],
        [`${gettingAround.centralStation.value} (see `, { text: "Crossing to Thailand", href: "/guides/vientiane-to-thailand" }, ")."],
        [
          "For Vang Vieng and Luang Prabang there is also the train: ",
          { text: "how to buy tickets", href: "/guides/laos-china-railway-tickets" },
          ".",
        ],
        [`${services.bookingHelp.value}: `, { text: "send them your trip", href: "/trips?kind=bus" }, "."],
      ],
    },
    lastChecked("Bus routes, fares and the apps change, so check before you set out."),
  ],
  related: ["/guides/laos-china-railway-tickets", "/guides/one-day-in-vientiane", "/vientiane"],
  facts: [
    mekong,
    loca,
    gettingAround.greenSm,
    gettingAround.notInLaos,
    gettingAround.inDrive,
    gettingAround.tukTuks,
    gettingAround.brt,
    gettingAround.brtSecondRoute,
    gettingAround.northernStation,
    gettingAround.southernStation,
    gettingAround.centralStation,
    services.bookingHelp,
  ],
  reviewed: TRAVEL_CHECKED,
};

const { cope } = sights;

const oneDay: Guide = {
  slug: "one-day-in-vientiane",
  name: "A day in Vientiane",
  teaser: "A day you can plan yourself: temples in the cool of the morning, COPE at midday, Patuxai and That Luang, then the Mekong at sunset.",
  title: "One day in Vientiane",
  description: `A plan for one day in Vientiane from ${identity.name.value}: Wat Si Saket and Haw Phra Kaew, the COPE Visitor Centre, Patuxai, That Luang and the Mekong.`,
  question: "What can I do with one day in Vientiane?",
  answer: [
    `Start early at Wat Si Saket and Haw Phra Kaew, spend the hot middle of the day at the ${cope.value.name} (${lowerFirst(cope.value.entry)}), see Patuxai and Pha That Luang in the afternoon, and end by the ${mekong.value.place}, ${lowerFirst(mekong.value.distance)} from the house.`,
  ],
  glance: {
    variant: "places",
    rows: [
      { term: "Morning", value: "Wat Si Saket and Haw Phra Kaew", note: "Opposite each other, travel guides say." },
      { term: "Midday", value: cope.value.name, note: `${cope.value.entry}.`, href: cope.value.url },
      { term: "Afternoon", value: "Patuxai and Pha That Luang", note: "About 2 km apart, travel guides say." },
      { term: "Sunset", value: mekong.value.place, note: `${mekong.value.distance} from the house.` },
      { term: "Evening", value: nightMarket.value.place, note: `${nightMarket.value.distance}, guests say.` },
    ],
  },
  sections: [
    {
      kind: "steps",
      id: "the-day",
      title: "The day, step by step",
      aside: "On foot and by tuk-tuk. The times are a guide, not a timetable.",
      steps: [
        {
          title: "Morning: the old temples",
          body: [
            `Start early, before the heat. ${sights.oldTemples.value}. ${sights.siSaket.value}, and ${sights.hawPhraKaew.value}, travel guides say. ${sights.lunch.value}, so see these first.`,
          ],
        },
        {
          title: "Midday: COPE",
          body: [
            "When the sun is highest, go indoors to the ",
            { text: cope.value.name, href: cope.value.url },
            `, about ${cope.value.about}. ${cope.value.entry}. ${sights.copePlace.value}, travel guides say.`,
          ],
        },
        {
          title: "Afternoon: Patuxai and That Luang",
          body: [
            `${sights.patuxai.value}. ${sights.thatLuang.value}: take a tuk-tuk. ${sights.thatLuangGrounds.value}, travel guides say.`,
          ],
        },
        {
          title: "Evening: the Mekong",
          body: [
            `Watch the sun go down from the ${mekong.value.place}, ${lowerFirst(mekong.value.distance)} from the house, then eat at the ${lowerFirst(nightMarket.value.place)}: guests say it is ${lowerFirst(nightMarket.value.distance)}.`,
          ],
        },
      ],
    },
    {
      kind: "list",
      id: "temples",
      title: "Visiting temples",
      aside: "What to wear, and what to expect.",
      items: [
        [`In Laos, ${lowerFirst(sights.templeManners.value)}.`],
        [`${sights.fees.value}, news reports say.`],
        [`${sights.noPhotos.value}, travel guides say.`],
      ],
    },
    {
      kind: "text",
      id: "more-time",
      title: "With more time",
      paragraphs: [
        [`${sights.buddhaPark.value}, travel guides say.`],
        [`${sights.museumMoved.value}, the Laotian Times reported.`],
        [`Rather go with a guide? ${services.bookingHelp.value}: `, { text: "ask them", href: "/trips?kind=tour" }, "."],
      ],
    },
    lastChecked("Opening hours and entry fees differ between sources and change, so they are not on this page: check at the gate, or ask the team."),
  ],
  related: ["/guides/getting-around-vientiane", "/guides/whats-nearby", "/vientiane"],
  facts: [
    cope,
    mekong,
    nightMarket,
    sights.oldTemples,
    sights.siSaket,
    sights.hawPhraKaew,
    sights.lunch,
    sights.copePlace,
    sights.patuxai,
    sights.thatLuang,
    sights.thatLuangGrounds,
    sights.templeManners,
    sights.fees,
    sights.noPhotos,
    sights.buddhaPark,
    sights.museumMoved,
    services.bookingHelp,
  ],
  reviewed: TRAVEL_CHECKED,
};

const { bridge, thaiRules } = toThailand;

const toThailandGuide: Guide = {
  slug: "vientiane-to-thailand",
  name: "To Thailand",
  teaser: `The ${bridge.value.name} to Nong Khai, the train, and Thailand’s entry rules since ${thaiRules.value.changed}.`,
  title: "Crossing to Thailand from Vientiane",
  description: `How to cross from Vientiane to Thailand: the ${bridge.value.name} to Nong Khai, the train, and Thailand’s entry rules from September 2026.`,
  question: "How do I cross from Vientiane to Thailand?",
  answer: [
    `Cross the ${bridge.value.name} to Nong Khai: the Lao checkpoint is open daily from ${bridge.value.hours}. Before you go, fill in the Lao Digital Immigration Form for leaving, and check Thailand’s entry rules, which changed on ${thaiRules.value.changed}.`,
  ],
  glance: {
    variant: "standards",
    rows: [
      { term: "The bridge", value: bridge.value.name, note: "To Nong Khai, in Thailand.", href: bridge.value.url },
      { term: "Lao checkpoint", value: `Daily, ${bridge.value.hours}`, note: "Lao Department of Immigration." },
      {
        term: "Leaving Laos",
        value: "Lao Digital Immigration Form",
        note: "Online, within 3 days before you cross.",
        href: toThailand.ldifLeaving.value.url,
      },
      { term: "On the bridge", value: "A shuttle bus", note: "You can’t walk across, travel guides say." },
      {
        term: "Thailand",
        value: "Up to 30 days without a visa",
        note: `For 60 countries and territories, from ${thaiRules.value.changed}: check yours.`,
        href: thaiRules.value.url,
      },
      { term: "By train", value: "From Khamsavath station", note: "Not the Laos–China Railway’s, travel guides say." },
    ],
  },
  sections: [
    {
      kind: "steps",
      id: "by-the-bridge",
      title: "By the Friendship Bridge",
      aside: "The usual way across.",
      steps: [
        {
          title: "Before you go",
          body: [
            `${toThailand.ldifLeaving.value.rule}. `,
            { text: "Fill it in on the official website", href: toThailand.ldifLeaving.value.url },
            ", and check Thailand’s entry rules for your passport (below).",
          ],
        },
        {
          title: "Get to the bridge",
          body: [
            `${toThailand.distance.value}, travel guides say. Take a ride in a taxi app (see `,
            { text: "Getting around Vientiane", href: "/guides/getting-around-vientiane" },
            `), or take the bus: ${lowerFirst(gettingAround.centralStation.value)}.`,
          ],
        },
        {
          title: "Leave Laos",
          body: [`At the Lao checkpoint, open daily from ${bridge.value.hours}, show your passport and the form’s QR code.`],
        },
        { title: "Cross the river", body: [`${toThailand.shuttle.value}, travel guides say.`] },
        { title: "Enter Thailand", body: ["Thai immigration checks your passport at the checkpoint in Nong Khai, on the far side of the river."] },
      ],
    },
    {
      kind: "text",
      id: "by-train",
      title: "By train",
      paragraphs: [
        [
          `${railway.khamsavath.value} from the Laos–China Railway’s, travel guides say. ${toThailand.train.value}, the Lao news agency KPL reported, and ${lowerFirst(toThailand.shortTrain.value)}. Check the times on `,
          { text: "Seat61", href: "https://www.seat61.com/laos.htm" },
          " or at the station before you go.",
        ],
      ],
    },
    {
      kind: "text",
      id: "thai-rules",
      title: "Thailand’s entry rules",
      aside: `Changed on ${thaiRules.value.changed}.`,
      paragraphs: [
        [
          `${thaiRules.value.exemption}. ${thaiRules.value.landLimit}: worth knowing if you cross back and forth. Rules differ by nationality, so check yours with the `,
          { text: "Tourism Authority of Thailand", href: thaiRules.value.url },
          " before you go.",
        ],
        [`${toThailand.arrivalCard.value.rule}, travel guides say: `, { text: "tdac.immigration.go.th", href: toThailand.arrivalCard.value.url }, "."],
      ],
    },
    lastChecked("Border rules change: check the Lao Department of Immigration and the Tourism Authority of Thailand before you cross."),
  ],
  related: ["/guides/lao-digital-immigration-form", "/guides/getting-around-vientiane", "/guides/laos-china-railway-tickets"],
  facts: [
    bridge,
    toThailand.ldifLeaving,
    toThailand.distance,
    gettingAround.centralStation,
    toThailand.shuttle,
    railway.khamsavath,
    toThailand.train,
    toThailand.shortTrain,
    thaiRules,
    toThailand.arrivalCard,
  ],
  reviewed: TRAVEL_CHECKED,
};

export const guides = {
  fromTheAirport,
  immigrationForm,
  trainTickets,
  gettingAround: gettingAroundTown,
  oneDay,
  toThailand: toThailandGuide,
  nearby,
  quietStay,
} as const;

export type GuideId = keyof typeof guides;

/** In the order the guides index lists them: arriving, then travelling on, then the house. */
export const guideList: readonly Guide[] = Object.values(guides);
