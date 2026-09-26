import { isFact, type Fact } from "@/content/fact";

export interface FoundFact {
  readonly path: string;
  readonly fact: Fact<unknown>;
}

/** Finds every Fact in a content tree, with a dotted path to it. */
export function collectFacts(node: unknown, path: string): FoundFact[] {
  if (isFact(node)) return [{ path, fact: node }];
  if (Array.isArray(node)) return node.flatMap((child, index) => collectFacts(child, `${path}[${index}]`));
  if (typeof node === "object" && node !== null) {
    return Object.entries(node).flatMap(([key, child]) => collectFacts(child, `${path}.${key}`));
  }
  return [];
}

export function unconfirmedFacts(node: unknown, path: string): FoundFact[] {
  return collectFacts(node, path).filter((found) => !found.fact.confirmed);
}

/** Short, single-line rendering of a fact's value for review lists. */
export function describeValue(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 110 ? `${text.slice(0, 107)}...` : text;
}

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, " ").replace(/[.!?]+$/, "").trim();

/**
 * The words a fact puts into a sentence: every string in its value of four
 * characters or more, without closing punctuation (a fact may sit mid-sentence).
 */
export function factStrings(fact: Fact<unknown>): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === "string") {
      const text = normalise(node);
      if (text.length >= 4) found.push(text);
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (typeof node === "object" && node !== null) {
      Object.values(node).forEach(walk);
    }
  };
  walk(fact.value);
  return found;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The facts whose words appear in a text as whole words ("bread", not "breadcrumb"), ignoring case. */
export function factsMentionedIn(text: string, facts: readonly FoundFact[]): FoundFact[] {
  const haystack = normalise(text);
  return facts.filter(({ fact }) =>
    factStrings(fact).some((words) =>
      new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(words)}(?![\\p{L}\\p{N}])`, "u").test(haystack),
    ),
  );
}
