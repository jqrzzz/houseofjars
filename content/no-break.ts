/**
 * A short heading with its hyphens made non-breaking (U+2011), so "check-in"
 * or "air-conditioning" never splits across two lines. For display only: the
 * content, search data and llms files keep the plain hyphen.
 */
export function noBreakHyphens(text: string): string {
  return text.replace(/(\p{L})-(\p{L})/gu, "$1‑$2");
}
