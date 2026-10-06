import Link from "next/link";
import { noBreakHyphens } from "@/content/no-break";
import { findPage } from "@/lib/pages";
import { ArrowIcon } from "../ui/icons";
import { Section } from "../ui/Section";
import styles from "./Guide.module.css";

/** Links deeper into the site play the forward page transition. */
const FORWARD = ["nav-forward"];

/** Pages to read next, as paper cards: the links between the guides and the rest of the site. */
export function ReadNext({ paths }: { paths: readonly string[] }) {
  return (
    <Section space="m" labelledBy="read-next-title">
      <div className="container">
        <h2 id="read-next-title" className={styles.readNextTitle}>
          Read next
        </h2>
        <ul role="list" className={styles.cards}>
          {paths.map(findPage).map((page) => (
            <li key={page.path} className={styles.card} data-reveal="">
              <p className={styles.kind}>{page.guide ? "Guide" : page.nav}</p>
              <h3 className={styles.cardTitle}>
                <Link href={page.path} className={styles.cardLink} transitionTypes={FORWARD}>
                  {noBreakHyphens(page.title)}
                </Link>
              </h3>
              {page.teaser ? <p className={styles.cardText}>{page.teaser}</p> : null}
              <ArrowIcon className={styles.cardArrow} />
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
