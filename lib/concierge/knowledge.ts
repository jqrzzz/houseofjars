import { airportTransport, immigration, location, plainOfJars } from "@/content/area";
import { creditFor } from "@/content/certainty";
import type { Fact } from "@/content/fact";
import { faqFor } from "@/content/faq";
import { guideList, guidePath } from "@/content/guides";
import { formatAddress, identity } from "@/content/identity";
import { inlineToTextWithUrls } from "@/content/inline";
import { openQuestions } from "@/content/open-questions";
import { honestNotes, praise, ratings } from "@/content/reviews";
import { countWord, joinList, lowerFirst, orList } from "@/content/text";
import { amenities, atmosphere, bathrooms, beds, breakfast, building, rules, services, staff, times } from "@/content/stay";
import { pages } from "../site";

/**
 * A line about a fact, with who says so in brackets when the fact isn't firm
 * (content/certainty.ts), so Shadow passes the credit on: "Night food market:
 * Next door (from guest reviews)".
 */
function said(fact: Fact<unknown>, line: string): string {
  const credit = creditFor(fact);
  if (!credit) return line;
  const stop = /[.!?]$/.test(line) ? line.slice(-1) : "";
  return `${line.slice(0, line.length - stop.length)} (${credit})${stop}`;
}

export interface KnowledgeOptions {
  /** The site takes booking requests on /book (lib/booking/config.ts), and Shadow has check_availability. */
  readonly onlineBooking?: boolean;
}

/** The booking page, bare and with a stay filled in (the placeholders are for Shadow to replace). */
export function bookingPageLinks(siteUrl: string): { page: string; withDates: string } {
  const page = new URL(pages.book.path, `${siteUrl}/`).toString();
  return { page, withDates: `${page}?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=N` };
}

/**
 * Everything Shadow knows about the house, as plain text built from the
 * content layer. Deterministic (no dates, no randomness) so the system
 * prompt stays byte-identical and cacheable.
 */
export function buildHouseKnowledge(siteUrl: string, options: KnowledgeOptions = {}): string {
  const url = (path: string) => new URL(path, `${siteUrl}/`).toString();
  const bullet = (items: readonly string[]) => items.map((item) => `- ${item}`).join("\n");
  const { phone, email } = identity.contact;
  const nearby = Object.values(location.nearby).map((f) => said(f, `${f.value.place}: ${f.value.distance}`));
  const book = bookingPageLinks(siteUrl);

  const sections: [string, string][] = [
    [
      "The house",
      bullet([
        `Name: ${identity.name.value} (full name: ${identity.fullName.value}).`,
        `Run by its own team, on site day and night. The house speaks as a brand: if asked who owns it, say the team runs it and offer to pass the question on; never name or describe an owner.`,
        `Address: ${formatAddress()}.`,
        `Neighbourhood: ${location.neighbourhood.value}.`,
        `${countWord(building.floors.value)} floors of pod dorms, above ${lowerFirst(building.cafe.value)}.`,
        `Atmosphere: ${atmosphere.summary.value}`,
      ]),
    ],
    [
      "Contact the team",
      bullet([
        `WhatsApp or phone: ${phone.value.display}`,
        `Email: ${email.value}`,
        options.onlineBooking
          ? `Booking page, with the free beds, booking requests and a message form: ${book.page}`
          : `Booking page, with links to Booking.com and Agoda and the team's contact details: ${url(pages.book.path)}`,
        `Staff: ${staff.hours.value.summary}. Reception speaks ${joinList(staff.languages.value)}. ${said(staff.replies, `${staff.replies.value}.`)}`,
        `Trains, buses and tours: ${lowerFirst(services.bookingHelp.value)}. Guests send their trip from ${url(pages.trips.path)} (it opens WhatsApp or email with the request written out), or ask at the desk.`,
      ]),
    ],
    [
      "Beds and dorms",
      bullet([
        beds.style.value + ".",
        `Every bed has: ${joinList(beds.perBed.value.map((i) => i.toLowerCase()))}.`,
        `Each dorm has ${beds.podsPerDorm.value} pods.`,
        `There is no pod ${orList(beds.numbering.value.skipped)}, ${beds.numbering.value.why}.`,
        `Room types listed for booking: ${joinList(beds.roomTypes.value)}.`,
      ]),
    ],
    [
      "Bathrooms, breakfast and amenities",
      bullet([
        `Shared bathrooms with hot showers, ${said(bathrooms.cleaning, `${lowerFirst(bathrooms.cleaning.value)}.`)}`,
        said(staff.housekeepingRound, `The team looks over and cleans the house ${staff.housekeepingRound.value}.`),
        `Breakfast is included, served ${breakfast.hours.value} in the café on the ground floor: ${joinList(breakfast.items.value.map((i) => i.toLowerCase()))}. Other drinks with breakfast cost extra.`,
        `Coffee and tea are served in the café ${building.cafeDrinks.value}; after breakfast, guests are welcome to relax or work there.`,
        `Amenities: ${amenities.map((a) => said(a, a.value.name)).join("; ")}.`,
      ]),
    ],
    [
      "Times",
      bullet([
        `Check-in from ${times.checkIn.value} until ${times.checkInUntil.value}; arriving later, message the team before travelling.`,
        `Check-out until ${times.checkOut.value}.`,
        `Early check-in: ${times.earlyCheckIn.value.toLowerCase()}.`,
        ...(times.quietHours ? [`Quiet hours: ${times.quietHours.value}.`] : []),
        `The front door is locked ${times.frontDoorLocked.value.from}–${times.frontDoorLocked.value.until}: knock on the glass door and the night staff open it.`,
      ]),
    ],
    [
      "House rules (rule, then why)",
      bullet([...rules.house, ...rules.stay].map((r) => `${r.value.rule} Why: ${r.value.why}`)),
    ],
    [
      "Getting here and nearby",
      bullet([...nearby, said(airportTransport, airportTransport.value)]),
    ],
    [
      "Before arriving in Laos",
      bullet([
        `${immigration.ldif.value.name}: ${immigration.ldif.value.summary} Official page: ${immigration.ldif.value.url}`,
        immigration.registration.value,
      ]),
    ],
    ["The name", bullet([identity.nameStory.value, plainOfJars.summary.value])],
    [
      "Ratings on other sites (quote with the platform and date; never invent reviews or quotes)",
      bullet(
        ratings.map(
          (r) =>
            `${r.value.platform}: ${r.value.score}${r.value.outOf ? ` out of ${r.value.outOf}` : ""}, ${r.value.context} (as of ${r.value.asOf})`,
        ),
      ),
    ],
    [
      "What guests mention most",
      bullet([joinList(praise.value) + ".", ...honestNotes.map((n) => `Worth knowing: ${n.value}`)]),
    ],
    [
      "Booking and prices",
      bullet(
        options.onlineBooking
          ? [
              "You can look up free beds with check_availability, but you cannot see prices, and you never promise a bed: free now is not held for the guest, and nothing is held until they send a booking request on the booking page.",
              `Book on this website: ${book.page} shows the free beds for any dates and, where the house has set them, the price. The guest books there directly with the house: the page says whether the booking is confirmed straight away or once the team has checked it (they reply by email or WhatsApp), and the guest pays at the house. With the guest's dates and party filled in: ${book.withDates}`,
              `Live prices are also on Booking.com (${identity.links.booking.value}) and Agoda (${identity.links.agoda.value}).`,
              "There is no online payment on this website.",
            ]
          : [
              "You cannot see prices or availability. Live prices and availability are on Booking.com and Agoda.",
              `Booking.com: ${identity.links.booking.value}`,
              `Agoda: ${identity.links.agoda.value}`,
              `Or the team answers directly via ${url(pages.book.path)}.`,
              "There is no online payment on this website.",
            ],
      ),
    ],
    [
      "Questions and answers",
      faqFor(Boolean(options.onlineBooking))
        .flatMap((group) => group.entries)
        .map((entry) => `Q: ${entry.question}\nA: ${inlineToTextWithUrls(entry.answer, siteUrl)}`)
        .join("\n\n"),
    ],
    [
      "Guides on this website (link one when it answers the question; say who says so the way the guide does)",
      guideList
        .map((guide) =>
          [
            `### ${guide.question} ${url(guidePath(guide))} (last reviewed ${guide.reviewed})`,
            inlineToTextWithUrls(guide.answer, siteUrl),
            bullet(guide.glance.rows.map((row) => `${row.term}: ${row.value}${row.note ? `. ${row.note}` : ""}`)),
          ].join("\n"),
        )
        .join("\n\n"),
    ],
    [
      "Not published yet (say you don't know and offer to ask the team)",
      bullet(openQuestions.flatMap((q) => (q.guestTopic ? [q.guestTopic] : []))),
    ],
    [
      "Privacy",
      bullet([
        `Privacy notice: ${url(pages.privacy.path)}`,
        "Messages to you are processed by Anthropic to generate replies. Inquiries you send go to the team through Shadow Check-in, the house's operations system.",
      ]),
    ],
  ];

  return sections.map(([title, body]) => `## ${title}\n${body}`).join("\n\n");
}
