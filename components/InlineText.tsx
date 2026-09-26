import Link from "next/link";
import { Fragment } from "react";
import type { Inline } from "@/content/inline";

/** Renders content-layer text with links: site links stay in the tab, others open a new one. */
export function InlineText({ parts }: { parts: readonly Inline[] }) {
  return (
    <>
      {parts.map((part, index) => {
        if (typeof part === "string") return <Fragment key={index}>{part}</Fragment>;
        if (part.href.startsWith("/")) {
          return (
            <Link key={index} href={part.href}>
              {part.text}
            </Link>
          );
        }
        return (
          <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">
            {part.text}
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        );
      })}
    </>
  );
}
