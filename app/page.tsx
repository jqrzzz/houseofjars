import { BookingCard } from "@/components/BookingCard";
import { WovenBand } from "@/components/brand/WovenBand";
import { Hero } from "@/components/home/Hero";
import { HouseTheatre } from "@/components/home/HouseTheatre";
import { Neighbourhood } from "@/components/home/Neighbourhood";
import { RatingTags } from "@/components/home/RatingTags";
import { RoomNiches } from "@/components/home/RoomNiches";
import { ShadowScrim } from "@/components/home/ShadowScrim";
import { Standards } from "@/components/home/Standards";
import { Team } from "@/components/home/Team";
import { Testimonials } from "@/components/home/Testimonials";
import { PageJsonLd } from "@/components/PageJsonLd";
import { RatingStrip } from "@/components/RatingStrip";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./home.module.css";

export const metadata = pageMetadata(pages.home);

/*
 * The home page (docs/DESIGN.md §5.1): the hero under its lamps; the woven
 * band; the rating strip (the booking and review sites); ① the house as a
 * paper theatre, then its rooms; ② the standards; ③ the ratings on their
 * thread, then guests in their own words; the team; ④ Ask Shadow at his scrim; ⑤ the
 * neighbourhood; the booking card.
 *
 * The quieter sections hand their words, read from content/ on the server,
 * to small views drawn on the client side of the boundary (components/home/
 * *View.tsx): the page is still rendered on the server, every word in its
 * HTML, but carries each section's markup once rather than twice (the HTML
 * and the React payload), which keeps the page within its 150 kB.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      {/* The house's curtains, woven in under the hero. */}
      <WovenBand pattern="diamond" weave />
      {/* The booking and review sites, each badge a link to book or read the reviews there. */}
      <section aria-label="House of Jars on booking and review sites" className={`container ${styles.sites}`}>
        <RatingStrip />
      </section>
      <div className={styles.house}>
        <HouseTheatre />
        <RoomNiches />
      </div>
      <Standards />
      <RatingTags />
      <Testimonials />
      <Team />
      <ShadowScrim />
      <Neighbourhood />
      <BookingCard />
      <PageJsonLd path={pages.home.path} />
    </>
  );
}
