/** Rich-ish text without HTML: plain strings and links. */
export type Inline = string | { readonly text: string; readonly href: string };

export function inlineToText(parts: readonly Inline[]): string {
  return parts.map((part) => (typeof part === "string" ? part : part.text)).join("");
}

/** Plain text with links written out, for llms.txt and the concierge. */
export function inlineToTextWithUrls(parts: readonly Inline[], siteUrl: string): string {
  return parts
    .map((part) => {
      if (typeof part === "string") return part;
      const url = part.href.startsWith("/") ? new URL(part.href, siteUrl).toString() : part.href;
      return `${part.text} (${url})`;
    })
    .join("");
}
