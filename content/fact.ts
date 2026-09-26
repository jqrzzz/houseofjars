/**
 * A single fact about the house, with where it came from and whether the
 * house has confirmed it. Pages, JSON-LD, llms.txt and the concierge all read
 * `value`; `npm run content:check` lists every fact that is not yet confirmed.
 */
export interface Fact<T> {
  readonly value: T;
  /** True once Nang or the team has confirmed the fact. */
  readonly confirmed: boolean;
  /** Where the fact came from, so a reviewer can check it. */
  readonly source: string;
  /** Anything a reviewer should know before confirming. */
  readonly note?: string;
}

export function fact<T>(
  value: T,
  source: string,
  options: { confirmed?: boolean; note?: string } = {},
): Fact<T> {
  return {
    value,
    confirmed: options.confirmed ?? false,
    source,
    ...(options.note ? { note: options.note } : {}),
  };
}

export function isFact(node: unknown): node is Fact<unknown> {
  return (
    typeof node === "object" &&
    node !== null &&
    "value" in node &&
    typeof (node as { confirmed?: unknown }).confirmed === "boolean" &&
    typeof (node as { source?: unknown }).source === "string"
  );
}
