import { CONTENT_UPDATED, content } from "@/content";
import { airportTransport, immigration, location, plainOfJars } from "@/content/area";
import { creditFor, isFirm } from "@/content/certainty";
import { faqFor } from "@/content/faq";
import { guideList, guidePath, type Guide } from "@/content/guides";
import { formatAddress, identity, whatsappUrl } from "@/content/identity";
import { inlineToTextWithUrls } from "@/content/inline";
import { openQuestions } from "@/content/open-questions";
import { honestNotes, praise, ratings } from "@/content/reviews";
import { amenities, atmosphere, bathrooms, beds, breakfast, building, rules, staff, times } from "@/content/stay";
import { joinList, lowerFirst } from "@/content/text";
import { collectFacts, factsMentionedIn } from "./content-audit";
import { metaTitle, sitePages } from "./pages";
import { pages } from "./site";

/*
 * /llms.txt and /llms-full.txt: plain-text versions of the site for AI
 * assistants, following the llms.txt convention (llmstxt.org). The
 * convention is young and no major assistant has said it reads these files;
 * the HTML pages carry every fact too. Both files are built from the content
 * layer, and any line using a fact that isn't firm says who says so.
 */

const softFacts = collectFacts(content, "content").filter((found) => !isFirm(found.fact));

/**
 * A line with, in brackets, who says so for any fact on it that isn't firm
 * (content/certainty.ts), unless the line already says it in those words.
 */
export function credited(line: string): string {
  const credits = [
    ...new Set(factsMentionedIn(line, softFacts).flatMap(({ fact }) => creditFor(fact) ?? [])),
  ].filter((credit) => !line.toLowerCase().includes(credit.toLowerCase()));
  return credits.length > 0 ? `${line} (${credits.join("; ")})` : line;
}

const bullets = (lines: readonly string[]) => lines.map((line) => `- ${credited(line)}`);

/** The link that opens the booking page's message form with dates and guests filled in. */
export function bookingLinkTemplate(siteUrl: string): string {
  return `${new URL(pages.book.path, `${siteUrl}/`)}?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=N#message`;
}

/** The link that opens online booking at the free beds for those dates and guests. */
export function onlineBookingLinkTemplate(siteUrl: string): string {
  return `${new URL(pages.book.path, `${siteUrl}/`)}?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=N`;
}

export interface LlmsOptions {
  /** The site takes booking requests on /book (lib/booking/config.ts). */
  readonly onlineBooking?: boolean;
}

/** Where free beds and prices can be seen, for the files' opening lines. */
function availabilityText(url: (path: string) => string, onlineBooking: boolean | undefined): string {
  return onlineBooking
    ? `Free beds for any dates, with prices where the house has set them, are on the booking page (${url(pages.book.path)}), not in this file; Booking.com and Agoda show live prices too.`
    : "Prices and availability are not published here: see Booking.com or Agoda, or ask the team.";
}

function summary(): string {
  return `> A dorm hostel of curtained pod beds in ${location.neighbourhood.value}, ${identity.address.country.value}. Breakfast is included, there is ${lowerFirst(building.cafe.value)}, and staff are ${lowerFirst(staff.hours.value.summary)}. Owned and run by ${identity.owner.name.value}.`;
}

function keyFacts(): string[] {
  const { phone, email } = identity.contact;
  return bullets([
    `Address: ${formatAddress()}`,
    `WhatsApp or phone: ${phone.value.display}`,
    `Email: ${email.value}`,
    `Check-in from ${times.checkIn.value}; check-out until ${times.checkOut.value}; early check-in ${lowerFirst(times.earlyCheckIn.value)}`,
    `Beds: ${beds.style.value}`,
    `Every bed has ${joinList(beds.perBed.value.map((item) => `a ${item.toLowerCase()}`))}`,
    `Breakfast included, in the café on the ground floor`,
    `Staff ${lowerFirst(staff.hours.value.summary)}, speaking ${joinList(staff.languages.value)}`,
    `Atmosphere: ${atmosphere.summary.value}`,
  ]);
}

function bookingLines(siteUrl: string, url: (path: string) => string, onlineBooking: boolean | undefined): string[] {
  return [
    ...(onlineBooking
      ? [
          `- [Book online](${url(pages.book.path)}): the free beds for the guest's dates, booked directly with the house; the page says whether a booking is confirmed straight away or once the team has checked it (they reply by email or WhatsApp), and the guest pays at the house. ${onlineBookingLinkTemplate(siteUrl)} opens it at the free beds for those dates. Prices show there only where the house has set them, and nothing is booked until the guest sends the booking.`,
        ]
      : []),
    `- [Booking.com](${identity.links.booking.value}): live prices and free beds`,
    `- [Agoda](${identity.links.agoda.value}): live prices and free beds`,
    `- [Message the team](${url(`${pages.book.path}#message`)}): the team replies by email or WhatsApp. ${bookingLinkTemplate(siteUrl)} opens the form with the dates and number of guests filled in; the guest still writes and sends the message, and sending it does not book a bed. There is no payment on this website.`,
  ];
}

/** /llms.txt: what the house is, the key facts, and every page. */
export function buildLlmsTxt(siteUrl: string, options: LlmsOptions = {}): string {
  const url = (path: string) => new URL(path, `${siteUrl}/`).toString();
  const mainPages = sitePages(Boolean(options.onlineBooking)).filter((page) => !page.guide && page.path !== pages.privacy.path);
  return [
    `# ${identity.fullName.value}`,
    "",
    summary(),
    "",
    `Facts were last checked against the house's public listings on ${CONTENT_UPDATED}, and the house is confirming them. ${availabilityText(url, options.onlineBooking)} Everything on the site in one file, with where each fact comes from: ${url("/llms-full.txt")}`,
    "",
    ...keyFacts(),
    "",
    "## Pages",
    ...mainPages.map((page) => `- [${metaTitle(page)}](${url(page.path)}): ${page.description}`),
    "",
    "## Guides",
    ...guideList.map((guide) => `- [${guide.question}](${url(guidePath(guide))}): ${guide.teaser}`),
    "",
    "## Book",
    ...bookingLines(siteUrl, url, options.onlineBooking),
    "",
    "## Optional",
    `- [Everything in one file](${url("/llms-full.txt")}): facts with their sources, house rules, questions and answers, guides and how to book`,
    `- [${metaTitle(pages.privacy)}](${url(pages.privacy.path)}): ${pages.privacy.description}`,
    "",
  ].join("\n");
}

function guideText(guide: Guide, siteUrl: string): string[] {
  const text = (parts: Parameters<typeof inlineToTextWithUrls>[0]) => inlineToTextWithUrls(parts, siteUrl);
  const sections = guide.sections.flatMap((section) => {
    const heading = `#### ${section.title}`;
    switch (section.kind) {
      case "steps":
        return [heading, ...section.steps.map((step, index) => `${index + 1}. ${credited(`${step.title}: ${text(step.body)}`)}`)];
      case "text":
        return [heading, ...section.paragraphs.map((paragraph) => credited(text(paragraph)))];
      case "list":
        return [heading, ...(section.aside ? [section.aside] : []), ...bullets(section.items.map(text))];
      case "address":
        return [heading, `- ${formatAddress()}`];
    }
  });
  return [
    `### ${guide.question}`,
    `${new URL(guidePath(guide), `${siteUrl}/`)} (last reviewed ${guide.reviewed})`,
    "",
    credited(text(guide.answer)),
    "",
    "#### At a glance",
    ...bullets(
      guide.glance.rows.map(
        (row) =>
          `${row.term}: ${row.value}${row.href ? ` (${new URL(row.href, `${siteUrl}/`)})` : ""}${row.note ? `. ${row.note}` : ""}`,
      ),
    ),
    ...sections,
    "",
  ];
}

/** /llms-full.txt: everything the site says, with the source of anything that isn't firm. */
export function buildLlmsFullTxt(siteUrl: string, options: LlmsOptions = {}): string {
  const url = (path: string) => new URL(path, `${siteUrl}/`).toString();
  const { phone, email } = identity.contact;
  const lastReviewed = [CONTENT_UPDATED, ...guideList.map((guide) => guide.reviewed)].sort().at(-1);
  const rule = (item: (typeof rules.house)[number]) => `${item.value.rule} Why: ${item.value.why}`;
  const notPublished = openQuestions.flatMap((question) => (question.guestTopic ? [question.guestTopic] : []));

  return [
    `# ${identity.fullName.value}`,
    "",
    summary(),
    "",
    `Everything the website ${url("/")} says, as plain text. Facts were last checked on ${CONTENT_UPDATED} against the house's own public listings (Booking.com, Agoda, Google, Tripadvisor, Facebook) and official sources, and the house is confirming them. A line that rests on guest reviews, a single source, general practice or an assumption says so in brackets. ${options.onlineBooking ? availabilityText(url, true) : "Prices and availability are not published here."} Last reviewed ${lastReviewed}.`,
    "",
    "## The house",
    ...bullets([
      `Name: ${identity.name.value} (full name: ${identity.fullName.value})`,
      `Owned and run by ${identity.owner.name.value}, with a team on site day and night`,
      `Address: ${formatAddress()}`,
      `Neighbourhood: ${location.neighbourhood.value}`,
      `${building.floors.value} floors; ${lowerFirst(building.cafe.value)}`,
      `Atmosphere: ${atmosphere.summary.value}`,
    ]),
    "",
    "## Contact",
    ...bullets([
      `WhatsApp or phone: ${phone.value.display} (${whatsappUrl()})`,
      `Email: ${email.value}`,
      `Staff: ${lowerFirst(staff.hours.value.summary)}; reception speaks ${joinList(staff.languages.value)}`,
      `${staff.replies.value}`,
    ]),
    "",
    "## Beds and rooms",
    ...bullets([
      beds.style.value,
      `Every bed has ${joinList(beds.perBed.value.map((item) => `a ${item.toLowerCase()}`))}`,
      `Room types listed for booking: ${joinList(beds.roomTypes.value)}`,
      `The dorms include ${joinList(beds.dorms.value)}`,
    ]),
    "",
    "## Bathrooms, breakfast and amenities",
    ...bullets([
      `Bathrooms: shared, with hot showers`,
      `Bathroom cleaning: ${bathrooms.cleaning.value}`,
      `Breakfast: included, in the café on the ground floor`,
      `Breakfast has: ${joinList(breakfast.items.value.map((item) => item.toLowerCase()))}`,
      `Breakfast is served: ${breakfast.hours.value}`,
      `Coffee and tea in the café: ${building.cafeDrinks.value}`,
      ...amenities.map((amenity) => `Amenity: ${amenity.value.name}`),
    ]),
    "",
    "## Times",
    ...bullets([
      `Check-in from ${times.checkIn.value}`,
      `Check-out until ${times.checkOut.value}`,
      `Early check-in: ${lowerFirst(times.earlyCheckIn.value)}`,
      ...(times.quietHours ? [`Quiet hours: ${times.quietHours.value}`] : []),
    ]),
    "",
    "## House rules",
    ...bullets([...rules.house, ...rules.stay].map(rule)),
    "",
    "## Location and getting here",
    ...bullets([
      ...Object.values(location.nearby).map((nearby) => `${nearby.value.place}: ${lowerFirst(nearby.value.distance)}`),
      `Airport transport: ${airportTransport.value}`,
      `Arriving in Laos: ${immigration.ldif.value.summary} Official page: ${immigration.ldif.value.url}`,
      `At check-in: ${immigration.registration.value}`,
    ]),
    "",
    "## Guides",
    "",
    ...guideList.flatMap((guide) => guideText(guide, siteUrl)),
    "## Questions and answers",
    ...faqFor(Boolean(options.onlineBooking)).flatMap((group) => [
      "",
      `### ${group.title}`,
      ...group.entries.flatMap((entry) => ["", `**${entry.question}**`, credited(inlineToTextWithUrls(entry.answer, siteUrl))]),
    ]),
    "",
    "## Ratings on other sites",
    "As each site showed them on the date given; they change, so follow the links for today's figures.",
    ...bullets(
      ratings.map(
        ({ value: rating }) =>
          `${rating.platform}: ${rating.score}${rating.outOf ? ` out of ${rating.outOf}` : ""}, ${rating.context} (as of ${rating.asOf})${rating.url ? `: ${rating.url}` : ""}`,
      ),
    ),
    "",
    "## What guests say",
    ...bullets([
      `Mentioned most: ${praise.value.map((item) => item.toLowerCase()).join("; ")}`,
      ...honestNotes.map((note) => `Worth knowing: ${note.value}`),
    ]),
    "",
    "## How to book",
    ...bookingLines(siteUrl, url, options.onlineBooking),
    "",
    "## Not published yet",
    "The website does not say; ask the team:",
    ...notPublished.map((topic) => `- ${topic}`),
    "",
    "## The name",
    ...bullets([identity.nameStory.value, plainOfJars.summary.value]),
    "",
    "## About this website",
    ...bullets([
      `Shadow, the AI concierge on the website, answers from these same facts and can pass a message to the team. He is an AI, not a member of staff, and can be wrong.`,
      `Privacy notice: ${url(pages.privacy.path)}`,
    ]),
    "",
  ].join("\n");
}
