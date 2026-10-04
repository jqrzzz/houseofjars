import { identity } from "@/content/identity";
import { policies } from "@/content/stay";

/*
 * Shadow can't see prices: the house knowledge contains none, and neither
 * does what check_availability tells him, so a money amount in a reply was
 * made up or talked into him. The reply is replaced by this line as soon as
 * one appears, before the guest can screenshot a price. The one exception is
 * the fees on the house's own rules board (the deposit for the padlock and
 * towel, a second towel), and only in a sentence about them: anywhere else
 * the same amount is still a price he can't see.
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

/** The house's own fees, with the words that must share a sentence with them. */
const HOUSE_FEES = [
  { amount: policies.deposit.value.amount, about: /deposit|padlock|towel/i },
  { amount: policies.secondTowel.value, about: /towel/i },
] as const;

/** "100,000 kip" as it may be written: 100,000 / 100.000 / 100 000 / 100000, kip or LAK after, LAK or ₭ before. */
function feePattern(amount: string): RegExp {
  const number = amount.replace(/\D/g, "").replace(/(\d)(?=(\d{3})+$)/g, String.raw`$1[,.\s]?`);
  return new RegExp(String.raw`(?:₭|\bLAK)\s?${number}(?![\d,.]*\d)|(?<![\d,.])${number}\s?(?:lao\s+)?(?:kip|lak)\b`, "gi");
}

/** The text with the house's own fees taken out where a sentence is about them. */
export function withoutHouseFees(text: string): string {
  return text
    .split(/(?<=[.!?])\s+|\n/)
    .map((sentence) => HOUSE_FEES.reduce((rest, fee) => (fee.about.test(sentence) ? rest.replace(feePattern(fee.amount), " ") : rest), sentence))
    .join("\n");
}

export function mentionsMoney(text: string): boolean {
  return MONEY.test(withoutHouseFees(text));
}

export const priceLine =
  `I can’t see prices or live availability, so I can’t quote a price or promise a bed. ` +
  `Booking.com (${identity.links.booking.value}) and Agoda (${identity.links.agoda.value}) show live prices, ` +
  `or I can pass your question to the team.`;

/**
 * The same line when the site takes booking requests: the booking page
 * first. Shadow can look up free beds then (check_availability), so the line
 * only says he can't see prices.
 */
export function bookingPriceLine(bookingPage: string): string {
  return (
    `I can’t see prices, so I can’t quote one. ` +
    `The booking page (${bookingPage}) shows the free beds for your dates, with prices where the house has set them. ` +
    `Booking.com (${identity.links.booking.value}) and Agoda (${identity.links.agoda.value}) show live prices too, ` +
    `or I can pass your question to the team.`
  );
}
