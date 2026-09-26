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
