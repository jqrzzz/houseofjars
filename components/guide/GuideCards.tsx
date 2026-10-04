import Link from "next/link";
import { guideList, guidePath } from "@/content/guides";
import { Drawing } from "../art/Drawing";
import { guideArt } from "./art";
import styles from "./Guide.module.css";

/** Every guide, each with its drawing in an arched niche, the question it answers and one line about it. */
export function GuideCards() {
  return (
    <div className="container">
      <ul role="list" className={styles.guides}>
      {guideList.map((guide) => (
        <li key={guide.slug} className={styles.guide} data-reveal="">
          <div className={styles.niche}>
            <Drawing
              name={guideArt(guide.slug).header}
              className={styles.nicheDrawing}
              sizes="(min-width: 48rem) 22rem, 7rem"
            />
          </div>
          <div className={styles.guideText}>
            <p className={styles.kind}>{guide.name}</p>
            <h2 className={styles.guideTitle}>
              <Link href={guidePath(guide)} className={styles.cardLink}>
                {guide.question}
              </Link>
            </h2>
            <p className={styles.cardText}>{guide.teaser}</p>
          </div>
        </li>
      ))}
      </ul>
    </div>
  );
}
