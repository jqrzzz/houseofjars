import type { Metadata } from "next";
import Link from "next/link";
import { JarMark } from "@/components/brand/JarMark";
import { TextileBand } from "@/components/brand/TextileBand";
import buttons from "@/components/ui/button.module.css";
import { ArrowIcon } from "@/components/ui/icons";
import { pages } from "@/lib/site";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

const suggestions = [pages.house, pages.faq, pages.vientiane, pages.book];

export default function NotFound() {
  return (
    <section className={styles.section} aria-labelledby="not-found-title">
      <div className={`container ${styles.inner}`}>
        <JarMark className={styles.jar} />
        <p className={styles.code}>404</p>
        <h1 id="not-found-title" className={styles.title}>
          This jar is empty.
        </h1>
        <p className={styles.text}>
          The page you were looking for isn’t here. It may have moved, or the link may have a typo.
        </p>
        <Link href="/" className={`${buttons.button} ${buttons.primary}`}>
          Back to the house
          <ArrowIcon />
        </Link>
        <ul role="list" className={styles.links}>
          {suggestions.map((page) => (
            <li key={page.path}>
              <Link href={page.path}>{page.nav}</Link>
            </li>
          ))}
        </ul>
      </div>
      <TextileBand tone="stone" size="s" />
    </section>
  );
}
