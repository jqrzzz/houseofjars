import Link from "next/link";
import type { Fact } from "@/content/fact";
import { formatDate } from "@/content/text";
import { pages } from "@/lib/site";
import styles from "./Guide.module.css";

/** "Booking.com listing, seen 2026-09-25" -> "Booking.com listing, seen 25 September 2026". */
const readable = (source: string) => source.replace(/\b\d{4}-\d{2}-\d{2}\b/g, formatDate);

/** Where a page's facts come from, and whether the house has confirmed them yet. */
export function Sources({ facts }: { facts: readonly Fact<unknown>[] }) {
  const sources = [...new Set(facts.map((fact) => fact.source))];
  const allConfirmed = facts.every((fact) => fact.confirmed);
  return (
    <section aria-labelledby="sources-title" className={`container ${styles.sources}`}>
      <h2 id="sources-title" className={styles.sourcesTitle}>
        Sources
      </h2>
      <ul role="list" className={styles.sourceList}>
        {sources.map((source) => (
          <li key={source}>{readable(source)}</li>
        ))}
      </ul>
      <p className={styles.sourceStatus}>
        {allConfirmed ? (
          "The house has confirmed every detail on this page."
        ) : (
          <>
            The house has not confirmed every detail here yet. For anything important,{" "}
            <Link href={`${pages.book.path}#contact`} transitionTypes={["nav-forward"]}>
              ask the team
            </Link>.
          </>
        )}
      </p>
    </section>
  );
}
