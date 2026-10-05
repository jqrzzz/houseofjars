import type { Metadata } from "next";
import Link from "next/link";
import { OpenJar } from "@/components/art/OpenJar";
import { AskShadowButton } from "@/components/concierge/AskShadowButton";
import { FindYourPodLauncher } from "@/components/game/FindYourPodLauncher";
import { ShadowFigure } from "@/components/shadow/ShadowFigure";
import buttons from "@/components/ui/button.module.css";
import { ArrowIcon } from "@/components/ui/icons";
import { pages } from "@/lib/site";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

const suggestions = [pages.house, pages.faq, pages.vientiane, pages.book];

/** Links into the site play the forward page transition. */
const FORWARD = ["nav-forward"];

/**
 * The 404: an empty stone jar in cut paper, with Shadow peering over its rim
 * from behind. A tap, a click or Enter wobbles the jar and sends one wisp of
 * warm air up from it (OpenJar). Then the way back, and two ways to keep
 * looking: ask Shadow, or play "Find your pod".
 */
export default function NotFound() {
  return (
    <section className={styles.section} aria-labelledby="not-found-title">
      <div className={`container ${styles.inner}`}>
        <div className={styles.scene}>
          <ShadowFigure variant="bust" className={styles.peek} />
          <OpenJar className={styles.jar} />
        </div>
        <p className={styles.code}>404</p>
        <h1 id="not-found-title" className={styles.title}>
          This jar is empty.
        </h1>
        <p className={styles.text}>
          The page you were looking for isn’t here. It may have moved, or the link may have a typo.
        </p>
        <Link href="/" className={`${buttons.button} ${buttons.primary}`} transitionTypes={["nav-back"]}>
          Back to the house
          <ArrowIcon />
        </Link>
        <ul role="list" className={styles.links}>
          {suggestions.map((page) => (
            <li key={page.path}>
              <Link href={page.path} transitionTypes={FORWARD}>
                {page.nav}
              </Link>
            </li>
          ))}
        </ul>
        <div className={styles.more}>
          <p className={styles.moreText}>
            Still looking? Shadow, our AI concierge, knows his way around the house. Or practise the walk from the front
            door to your pod.
          </p>
          <div className={styles.moreActions}>
            <AskShadowButton className={`${buttons.button} ${buttons.secondary}`}>Ask Shadow</AskShadowButton>
            <FindYourPodLauncher />
          </div>
        </div>
      </div>
    </section>
  );
}
