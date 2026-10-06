import { photos } from "@/content/photos";
import { ratings } from "@/content/reviews";
import { policies } from "@/content/stay";
import { bookingLabel } from "@/lib/booking/config";
import { HeroView } from "./HeroView";
import { houseNowLines } from "./house-now";
import styles from "./Hero.module.css";

/**
 * The hero (docs/DESIGN.md §5.1): ສະບາຍດີ · Sabaidee, the headline, why to
 * book direct, Book and Ask Shadow, and the house now; beside them the real
 * photograph of the dorms in the house's arch, in its paper mat (the page's
 * largest image, preloaded), under three of the house's own lamps, which drop
 * into place and light up once (Lamplighting). The guests' score sits on a
 * paper plate at the arch's foot, on the mat beside the caption.
 */
export function Hero() {
  const [booking] = ratings;
  const { src, alt, focus, size, caption } = photos.dormCorridor;
  return (
    <section className={styles.hero} aria-labelledby="hero-title" data-hides-launcher="">
      <HeroView
        direct={policies.directPriceShort.value}
        book={bookingLabel()}
        photo={{ src, alt, size, ...(focus ? { focus } : {}) }}
        caption={caption}
        score={[booking.value.score, booking.value.outOf, `${booking.value.platform}, ${booking.value.context}`]}
        lines={houseNowLines()}
      />
    </section>
  );
}
