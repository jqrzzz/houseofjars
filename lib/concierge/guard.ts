import { identity } from "@/content/identity";

/*
 * Shadow can't see prices, and the house knowledge contains none, so a money
 * amount in a reply was made up or talked into him. The reply is replaced by
 * this line as soon as one appears, before the guest can screenshot a price.
 */

const MONEY = new RegExp(
  [
    String.raw`(?:US\$|\$|₭|฿|€|£)\s?\d`,
    String.raw`\d\s?(?:US\$|\$|₭|฿|€|£)`,
    String.raw`\b(?:USD|LAK|THB|EUR|GBP|kip|baht)\s?\d`,
    String.raw`\d\s?(?:USD|LAK|THB|EUR|GBP|kip|baht|dollars?|euros?)\b`,
  ].join("|"),
  "i",
);

export function mentionsMoney(text: string): boolean {
  return MONEY.test(text);
}

export const priceLine =
  `I can’t see prices or live availability, so I can’t quote a price or promise a bed. ` +
  `Booking.com (${identity.links.booking.value}) and Agoda (${identity.links.agoda.value}) show live prices, ` +
  `or I can pass your question to the team.`;

/** The same line when the site takes booking requests: the booking page first. */
export function bookingPriceLine(bookingPage: string): string {
  return (
    `I can’t see prices or live availability, so I can’t quote a price or promise a bed. ` +
    `The booking page (${bookingPage}) shows the free beds for your dates, with prices where the house has set them. ` +
    `Booking.com (${identity.links.booking.value}) and Agoda (${identity.links.agoda.value}) show live prices too, ` +
    `or I can pass your question to the team.`
  );
}
