import { identity } from "@/content/identity";

/*
 * Shadow can't see prices, and the house knowledge contains none, so a money
 * amount in a reply was made up or talked into him. The reply is replaced by
 * this line as soon as one appears, before the guest can screenshot a price.
 */

/** An amount in words or digits: "90,000", "1.5", "90k", "ten", "three hundred thousand". */
const NUMBER_WORDS =
  "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million";
const AMOUNT = String.raw`(?:\d[\d,.]*(?:\s?(?:k|m|mil)\b)?|\b(?:${NUMBER_WORDS})\b)(?:[\s-]+(?:${NUMBER_WORDS}|and)\b)*`;
/** A currency named in words, with what may stand between it and the amount ("Lao kip", "US dollars"). */
const CURRENCY_WORD = String.raw`(?:(?:lao|thai|us|u\.s\.|american)\s+)?(?:kip|lak|baht|thb|usd|dollars?|bucks?|eur|euros?|gbp|pounds?)\b`;

const MONEY = new RegExp(
  [
    String.raw`(?:US\$|\$|₭|฿|€|£)\s?\d`,
    String.raw`\d\s?(?:US\$|\$|₭|฿|€|£)`,
    String.raw`\b(?:USD|LAK|THB|EUR|GBP|kip|baht)\s?\d`,
    String.raw`${AMOUNT}\s*${CURRENCY_WORD}`,
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
