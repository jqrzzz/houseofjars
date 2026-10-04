import Link from "next/link";
import type { Crumb } from "@/lib/pages";
import { Mark } from "../brand/Mark";
import eyebrow from "../ui/Section.module.css";
import styles from "./Breadcrumbs.module.css";

/**
 * Where the page sits, set like the eyebrow it replaces: the jar, then each
 * level as a link, then the page itself. Home is the site's name in the
 * header, so the trail starts one level down.
 */
export function Breadcrumbs({ trail }: { trail: readonly Crumb[] }) {
  const shown = trail.filter((crumb) => crumb.path !== "/");
  return (
    <nav aria-label="Breadcrumb" className={`${eyebrow.eyebrow} ${styles.trail}`}>
      <Mark className={eyebrow.eyebrowMark} />
      <ol role="list" className={styles.list}>
        {shown.map((crumb, index) => (
          <li key={crumb.path} className={styles.crumb}>
            {index < shown.length - 1 ? (
              <Link href={crumb.path}>{crumb.name}</Link>
            ) : (
              <span aria-current="page">{crumb.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
