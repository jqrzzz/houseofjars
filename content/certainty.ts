import type { Fact } from "./fact";
import { sourceKinds, type SourceKind } from "./sources";

/*
 * How firmly the site may state a fact. The house confirms facts one by one
 * (npm run content:check lists what is left); until then a fact is only as
 * firm as its source:
 *
 * - Firm: confirmed by the house, from its own public listings, or from an
 *   official body. Stated plainly on the pages, and the only facts that go
 *   into structured data (JSON-LD), which has no way to say "guests say".
 * - Not firm: news reports, travel guides, what guest reviews say, something
 *   seen in one source only, general practice in Laos, or an assumption. Said
 *   with its source ("news reports say…", "travel guides say…", "guests
 *   say…", "in Laos, guesthouses…", "the name nods to…"), labelled in
 *   llms-full.txt, and never put into structured data. Tests enforce all three.
 */

export type Standing = "confirmed" | SourceKind | "unknown";

export function standingOf(fact: Fact<unknown>): Standing {
  if (fact.confirmed) return "confirmed";
  return sourceKinds[fact.source] ?? "unknown";
}

/** Whether a fact may be stated plainly and carried in structured data. */
export function isFirm(fact: Fact<unknown>): boolean {
  const standing = standingOf(fact);
  return standing === "confirmed" || standing === "listing" || standing === "official";
}

/** A firm fact's value, or undefined: structured data reads facts only through this. */
export function firm<T>(fact: Fact<T> | null | undefined): T | undefined {
  return fact && isFirm(fact) ? fact.value : undefined;
}

/** How the site credits a fact it can't state plainly; null for firm facts. */
export function creditFor(fact: Fact<unknown>): string | null {
  switch (standingOf(fact)) {
    case "press":
      return "as reported in the news";
    case "travel-guide":
      return "from travel guides, to be checked before you go";
    case "guests":
      return "from guest reviews";
    case "one-source":
      return "seen in one source only, to be confirmed";
    case "practice":
      return "general practice in Laos, to be confirmed with the house";
    case "assumption":
      return "an assumption, to be confirmed";
    case "unknown":
      return "not yet confirmed";
    default:
      return null;
  }
}

/**
 * Words a sentence must carry when it uses a fact that isn't firm, so the
 * reader can tell who says so. Checked against the guides by their tests.
 */
export const creditCues: Readonly<Record<Exclude<Standing, "confirmed" | "listing" | "official">, RegExp>> = {
  press: /\breport(?:s|ed)?\b/i,
  "travel-guide": /\btravel (?:guides?|sites?)\b/i,
  guests: /\bguests?\b|\breviews?\b/i,
  "one-source": /\bone (?:source|listing|review)\b|\bto be confirmed\b/i,
  practice: /\bin Laos\b/i,
  assumption: /\bnods to\b|\bassum/i,
  unknown: /\bnot (?:yet )?confirmed\b|\bto be confirmed\b/i,
};
