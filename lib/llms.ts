import { airportTransport, immigration, location } from "@/content/area";
import { faq } from "@/content/faq";
import { formatAddress, identity } from "@/content/identity";
import { inlineToTextWithUrls } from "@/content/inline";
import { ratings } from "@/content/reviews";
import { joinList } from "@/content/text";
import { amenities, beds, breakfast, staff, times } from "@/content/stay";
import { CONTENT_UPDATED } from "@/content";
import { pages } from "./site";

/**
 * /llms.txt: an optional, emerging convention for giving AI assistants a
 * plain-text summary of a site. Every fact is also in the HTML pages;
 * this file is a convenience, built from the same content layer.
 */
export function buildLlmsTxt(siteUrl: string): string {
  const url = (path: string) => new URL(path, `${siteUrl}/`).toString();
  const { phone, email } = identity.contact;

  const lines = [
    `# ${identity.fullName.value}`,
    "",
    `> A calm, very clean dorm hostel in ${location.neighbourhood.value}, Laos. Pod beds with privacy curtains, strong air-conditioning, breakfast included in the café, and staff on site 24 hours. Owned and run by ${identity.owner.name.value}.`,
    "",
    `Facts last reviewed ${CONTENT_UPDATED}. Prices and availability are not published here: see Booking.com or Agoda, or ask the team.`,
    "",
    "## Key facts",
    `- Address: ${formatAddress()}`,
    `- WhatsApp / phone: ${phone.value.display}`,
    `- Email: ${email.value}`,
    `- Check-in from ${times.checkIn.value}; check-out until ${times.checkOut.value}; early check-in ${times.earlyCheckIn.value.toLowerCase()}`,
    `- Beds: ${beds.style.value.toLowerCase()}; each has ${joinList(beds.perBed.value.map((i) => i.toLowerCase()))}`,
    `- Dorms: ${beds.dorms.value.toLowerCase()}`,
    `- Breakfast included: ${joinList(breakfast.items.value.map((i) => i.toLowerCase()))}`,
    `- Amenities: ${amenities.map((a) => a.value.name).join("; ")}`,
    `- Staff: ${staff.hours.value.toLowerCase()}; languages: ${joinList(staff.languages.value)}`,
    `- Nearby: ${Object.values(location.nearby).map((d) => `${d.value.place} (${d.value.distance.toLowerCase()})`).join("; ")}`,
    `- Airport: ${airportTransport.value}`,
    `- Arriving in Laos: ${immigration.ldif.value.summary} ${immigration.ldif.value.url}`,
    `- Ratings: ${ratings.map((r) => `${r.value.platform} ${r.value.score}${r.value.outOf ? `/${r.value.outOf}` : ""} ${r.value.context} (as of ${r.value.asOf})`).join("; ")}`,
    "",
    "## Pages",
    ...Object.values(pages).map((page) => `- [${page.title}](${url(page.path)}): ${page.description}`),
    "",
    "## Book",
    `- [Booking.com](${identity.links.booking.value})`,
    `- [Agoda](${identity.links.agoda.value})`,
    `- [Message the team](${url(pages.book.path)})`,
    "",
    "## Questions and answers",
    ...faq.flatMap((group) =>
      group.entries.map((entry) => `- ${entry.question} ${inlineToTextWithUrls(entry.answer, siteUrl)}`),
    ),
    "",
  ];
  return lines.join("\n");
}
