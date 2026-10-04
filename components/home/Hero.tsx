import Link from "next/link";
import { PhotoFrame } from "@/components/PhotoFrame";
import { AskShadowButton } from "@/components/concierge/AskShadowButton";
import buttons from "@/components/ui/button.module.css";
import { ArrowIcon } from "@/components/ui/icons";
import { identity } from "@/content/identity";
import { photos } from "@/content/photos";
import { bookingLabel } from "@/lib/booking/config";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title" data-hides-launcher="">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <p className={styles.greeting}>
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
            Curtained pod beds, strong air-conditioning, breakfast in our café downstairs, and a team that looks after
            every detail, day and night.
          </p>
          <p className={styles.owner}>Owned and run by {identity.owner.name.value}.</p>
          <div className={styles.actions}>
            <Link href="/book" className={`${buttons.button} ${buttons.primary}`}>
              {bookingLabel()}
              <ArrowIcon />
            </Link>
            <AskShadowButton className={`${buttons.button} ${buttons.secondary}`}>Ask Shadow</AskShadowButton>
          </div>
        </div>

        <PhotoFrame
          className={styles.photo}
          caption={photos.dormCorridor.caption}
          photo={photos.dormCorridor}
          drawing="pod"
          shape="arch"
          aspect="2 / 3"
          sizes="(min-width: 60rem) 26rem, 80vw"
          priority
        />
      </div>
    </section>
  );
}
