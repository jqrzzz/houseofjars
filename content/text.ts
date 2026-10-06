/** Small text helpers for writing facts into sentences. */

/** "a, b and c" */
export function joinList(items: readonly string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** "4, 13 or 14": for "there is no pod …". */
export function orList(items: readonly (string | number)[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items.at(-1)}`;
}

/** Lower-cases the first letter, for a fact used mid-sentence. */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** 2 -> "Two", for counts that start a sentence. */
export function countWord(count: number): string {
  return WORDS[count] ?? String(count);
}

/** 3 -> "໓": Lao digits, for decorative section numbers. */
export function laoNumeral(value: number): string {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`Not a whole number: ${value}`);
  return String(value).replace(/\d/g, (digit) => String.fromCodePoint(0x0ed0 + Number(digit)));
}

/** "2026-09-25" -> "25 September 2026". Dates are calendar days, so UTC avoids off-by-one shifts. */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}
