/** Small text helpers for writing facts into sentences. */

/** "a, b and c" */
export function joinList(items: readonly string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
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
