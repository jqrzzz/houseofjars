/*
 * The house's numbers in Shadow Check-in (Insights › Website): with each page
 * view, a few of the day's counts, never anything about the visitor. Shadow
 * checks the same rules (SHADOW-CHECKIN lib/site-counts/contract.ts and
 * migrations/086 sc_receive_site_counts); docs/INQUIRY_API.md, "Website
 * counts", describes them.
 */

/** Counted with a value: the page, and a visit's source, country and device. */
export type ValueMeasure = "page" | "source" | "country" | "device";
/** Counted without one: a page seen, a visit begun, and talks with Shadow on the website. */
export type PlainMeasure = "view" | "visit" | "chat" | "question" | "check" | "handoff";
/** What Shadow the concierge counts: a talk begun, a question, free beds looked up, a talk sent to the team. */
export type ChatMeasure = "chat" | "question" | "check" | "handoff";

export type CountLine =
  | { readonly measure: PlainMeasure; readonly n?: number }
  | { readonly measure: ValueMeasure; readonly value: string; readonly n?: number };

export type Device = "phone" | "tablet" | "computer";

/** The first page of a visit: where it came from, its country (when the host says) and the device. */
export interface Landing {
  readonly source: string;
  readonly country: string | null;
  readonly device: Device;
}

/** One request's talk with Shadow, counted (lib/stats/tally.ts sends it once the response is finished). */
export interface Tally {
  add(...measures: ChatMeasure[]): void;
}

/** A page seen; the first page of a visit adds the visit, its source, country and device. */
export function pageViewLines(page: string, landing: Landing | null): CountLine[] {
  const lines: CountLine[] = [{ measure: "view" }, { measure: "page", value: page }];
  if (!landing) return lines;
  lines.push({ measure: "visit" }, { measure: "source", value: landing.source });
  if (landing.country) lines.push({ measure: "country", value: landing.country });
  lines.push({ measure: "device", value: landing.device });
  return lines;
}

/** Talks with Shadow, each measure once with how many (a talk that looked up free beds twice: check, n 2). */
export function chatLines(measures: readonly ChatMeasure[]): CountLine[] {
  const counts = new Map<ChatMeasure, number>();
  for (const measure of measures) counts.set(measure, (counts.get(measure) ?? 0) + 1);
  return [...counts].map(([measure, n]) => (n === 1 ? { measure } : { measure, n: Math.min(n, 100) }));
}
