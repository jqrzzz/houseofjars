import { airportTransport, immigration, location, plainOfJars } from "@/content/area";
import { faq } from "@/content/faq";
import { guideList, guidePath } from "@/content/guides";
import { formatAddress, identity } from "@/content/identity";
import { inlineToTextWithUrls } from "@/content/inline";
import { openQuestions } from "@/content/open-questions";
import { honestNotes, praise, ratings } from "@/content/reviews";
import { joinList } from "@/content/text";
import { amenities, atmosphere, bathrooms, beds, breakfast, building, rules, staff, times } from "@/content/stay";
import { pages } from "../site";

/**
 * Everything Shadow knows about the house, as plain text built from the
 * content layer. Deterministic (no dates, no randomness) so the system
 * prompt stays byte-identical and cacheable.
 */
export function buildHouseKnowledge(siteUrl: string): string {
  const url = (path: string) => new URL(path, `${siteUrl}/`).toString();
  const bullet = (items: readonly string[]) => items.map((item) => `- ${item}`).join("\n");
  const { phone, email } = identity.contact;
  const nearby = Object.values(location.nearby).map((f) => `${f.value.place}: ${f.value.distance}`);

  const sections: [string, string][] = [
    [
      "The house",
      bullet([
        `Name: ${identity.name.value} (full name: ${identity.fullName.value}).`,
        `Owned and run by ${identity.owner.name.value}, with a team on site day and night. Don't describe Nang beyond this.`,
        `Address: ${formatAddress()}.`,
        `Neighbourhood: ${location.neighbourhood.value}.`,
        `${building.floors.value} floors. ${building.cafe.value}.`,
        `Atmosphere: ${atmosphere.summary.value}`,
      ]),
    ],
    [
      "Contact the team",
      bullet([
        `WhatsApp or phone: ${phone.value.display}`,
        `Email: ${email.value}`,
        `Booking page with a message form: ${url(pages.book.path)}`,
        `Staff: ${staff.hours.value.summary}. Reception speaks ${joinList(staff.languages.value)}. ${staff.replies.value}.`,
      ]),
    ],
    [
      "Beds and dorms",
      bullet([beds.style.value + ".", `Every bed has: ${joinList(beds.perBed.value.map((i) => i.toLowerCase()))}.`, `The dorms include ${joinList(beds.dorms.value)}.`]),
    ],
    [
      "Bathrooms, breakfast and amenities",
      bullet([
        `Shared bathrooms with hot showers, ${bathrooms.cleaning.value.toLowerCase()}.`,
        `Breakfast is included, in the café on the ground floor: ${joinList(breakfast.items.value.map((i) => i.toLowerCase()))}.`,
        `Amenities: ${amenities.map((a) => a.value.name).join("; ")}.`,
      ]),
    ],
    [
      "Times",
      bullet([
        `Check-in from ${times.checkIn.value}.`,
        `Check-out until ${times.checkOut.value}.`,
        `Early check-in: ${times.earlyCheckIn.value.toLowerCase()}.`,
        ...(times.quietHours ? [`Quiet hours: ${times.quietHours.value}.`] : []),
      ]),
    ],
    [
      "House rules (rule, then why)",
      bullet([...rules.house, ...rules.stay].map((r) => `${r.value.rule} Why: ${r.value.why}`)),
    ],
    [
      "Getting here and nearby",
      bullet([...nearby, airportTransport.value]),
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
      bullet([
        "You cannot see prices or availability. Live prices and availability are on Booking.com and Agoda.",
        `Booking.com: ${identity.links.booking.value}`,
        `Agoda: ${identity.links.agoda.value}`,
        `Or the team answers directly via ${url(pages.book.path)}.`,
        "There is no online payment on this website.",
      ]),
    ],
    [
      "Questions and answers",
      faq
        .flatMap((group) => group.entries)
        .map((entry) => `Q: ${entry.question}\nA: ${inlineToTextWithUrls(entry.answer, siteUrl)}`)
        .join("\n\n"),
    ],
    [
      "Guides on this website (link one when it answers the question)",
      bullet(guideList.map((guide) => `${guide.question} ${url(guidePath(guide))}`)),
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
