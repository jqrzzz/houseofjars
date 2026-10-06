import Link from "next/link";
import { guideList, guidePath } from "@/content/guides";
import { Drawing } from "../art/Drawing";
import glow from "../art/glow.module.css";
import { guideArt } from "./art";
import styles from "./Guide.module.css";

/** Links deeper into the site play the forward page transition. */
const FORWARD = ["nav-forward"];

/**
 * Every guide as a paper niche: an arch cut into a paper wall, its drawing
 * standing on the sill, as the jars stand in the niches of the house's stair
 * wall. Each drawing pops up as its card scrolls into view, and the niche
 * lights when the card is pointed at or focused. Then the question it answers
 * and one line about it.
 */
export function GuideCards() {
  return (
    <div className="container">
      <ul role="list" className={styles.guides}>
        {guideList.map((guide) => (
          <li key={guide.slug} className={styles.guide}>
            <div className={styles.niche} aria-hidden="true">
              <div className={styles.recess}>
                <i className={`${glow.disc} ${styles.nicheGlow}`} />
                <div className={styles.popup}>
                  <Drawing name={guideArt(guide.slug).header} className={styles.nicheDrawing} sizes="(min-width: 48rem) 12rem, 7rem" />
                </div>
              </div>
            </div>
            <div className={styles.guideText}>
              <p className={styles.kind}>{guide.name}</p>
              <h2 className={styles.guideTitle}>
                <Link href={guidePath(guide)} className={styles.cardLink} transitionTypes={FORWARD}>
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
