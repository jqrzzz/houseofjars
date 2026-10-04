import Link from "next/link";
import { Mark } from "./Mark";
import styles from "./Wordmark.module.css";

export function Wordmark({ tone = "default" }: { tone?: "default" | "deep" }) {
  return (
    <Link href="/" className={`${styles.wordmark} ${tone === "deep" ? styles.deep : ""}`}>
      <Mark className={styles.mark} />
      <span className={styles.name}>House of Jars</span>
    </Link>
  );
}
