import Link from "next/link";
import { TextileBand } from "@/components/brand/TextileBand";
import { AskShadowButton } from "@/components/concierge/AskShadowButton";
import buttons from "@/components/ui/button.module.css";
import { ArrowIcon } from "@/components/ui/icons";
import { identity } from "@/content/identity";
import { MekongDawn } from "./MekongDawn";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title" data-hides-launcher="">
      <div className={styles.inner}>
        <div className={`container ${styles.grid}`}>
          <div className={styles.copy}>
            <p className={styles.greeting}>
              <span aria-hidden="true" className={styles.ornament}>
                ສະບາຍດີ
              </span>
              <span lang="lo" className={styles.lao}>
                ສະບາຍດີ
              </span>
              <span aria-hidden="true" className={styles.dot}>
                ·
              </span>
              <span>Sabaidee</span>
            </p>
            <h1 id="hero-title" className={styles.title}>
              A calm house in the heart of Vientiane.
            </h1>
            <p className={styles.lede}>
              Curtained pod beds, strong air-conditioning, breakfast in our café downstairs, and a team that looks
              after every detail, day and night.
            </p>
            <p className={styles.owner}>Owned and run by {identity.owner.name.value}.</p>
            <div className={styles.actions}>
              <Link href="/book" className={`${buttons.button} ${buttons.primary}`}>
                Prices and booking
                <ArrowIcon />
              </Link>
              <AskShadowButton className={`${buttons.button} ${buttons.secondary}`}>Ask Shadow</AskShadowButton>
            </div>
          </div>
        </div>

        <div className={styles.sceneFrame} aria-hidden="true">
          <MekongDawn />
        </div>
      </div>
      <TextileBand pattern="diamond" weave="load" className={styles.band} />
    </section>
  );
}
