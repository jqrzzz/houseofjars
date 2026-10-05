import Link from "next/link";
import { Mark } from "./Mark";
import styles from "./Wordmark.module.css";

/**
 * The mark and the name, linking home. Going home is going back up the site,
 * so the link is typed "nav-back" and the page lifts away (app/layout.tsx).
 * On hover or focus the mark lifts like a lamp on its cord and warms.
 */
export function Wordmark({ tone = "default" }: { tone?: "default" | "deep" }) {
  return (
    <Link href="/" transitionTypes={["nav-back"]} className={`${styles.wordmark} ${tone === "deep" ? styles.deep : ""}`}>
      <Mark className={styles.mark} />
      <span className={styles.name}>House of Jars</span>
    </Link>
  );
}
