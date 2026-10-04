import Link from "next/link";
import { BookingCard } from "@/components/BookingCard";
import { PhotoFrame } from "@/components/PhotoFrame";
import { HouseCutaway } from "@/components/house/HouseCutaway";
import { PodDiagram } from "@/components/house/PodDiagram";
import { photos } from "@/content/photos";
import { Block, Prose, TickList } from "@/components/page/Block";
import { PageHeader } from "@/components/page/PageHeader";
import { PageJsonLd } from "@/components/PageJsonLd";
import { ReadNext } from "@/components/guide/ReadNext";
import { honestNotes } from "@/content/reviews";
import { amenities, atmosphere, bathrooms, beds, breakfast, building } from "@/content/stay";
import { countWord, joinList, lowerFirst } from "@/content/text";
import { onlineBookingConfigured } from "@/lib/booking/config";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./the-house.module.css";

export const metadata = pageMetadata(pages.house);

/** The dorms, then the stairs: the house's own photographs. */
const lookInside = [
  photos.dormFan,
  photos.podCurtain,
  photos.podLadder,
  photos.wallOfJars,
  photos.stairsJar,
  photos.lamp,
];

export default function TheHousePage() {
  return (
    <>
      <PageHeader
        eyebrow="The house"
        morph="the-house"
        title="Inside the house"
        lede={`${countWord(building.floors.value)} floors of curtained pod beds, shared bathrooms with hot showers, and a café downstairs where breakfast is included. Here is what to expect.`}
      />

      <Block id="beds" title="Your pod">
        <Prose>
          <p>
            Every bed is a pod: its own cubicle with a privacy curtain, so you can close out the room and sleep. Each
            pod has:
          </p>
          <TickList numbered items={beds.perBed.value} />
          <p>
            The dorms include {joinList(beds.dorms.value)}.{" "}
            {onlineBookingConfigured() ? (
              <>
                To see which beds are free on your dates, see the <Link href={pages.book.path}>booking page</Link>, or
                Booking.com and Agoda.
              </>
            ) : (
              <>
                To see which beds are free on your dates, check Booking.com or Agoda, or{" "}
                <Link href={pages.book.path}>ask us</Link>.
              </>
            )}
          </p>
        </Prose>
        <PodDiagram />
      </Block>

      <section id="look-inside" aria-labelledby="look-inside-title">
        <div className={`container ${styles.section}`}>
          <h2 id="look-inside-title" className={styles.sectionTitle}>
            A look inside
          </h2>
          <ul role="list" className={styles.gallery}>
            {lookInside.map((photo) => (
              <li key={photo.src}>
                <PhotoFrame
                  caption={photo.caption}
                  photo={photo}
                  drawing="pod"
                  aspect="4 / 5"
                  sizes="(min-width: 60rem) 22rem, (min-width: 40rem) 45vw, 90vw"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="section" aria-labelledby="section-title">
        <div className={`container ${styles.section}`}>
          <h2 id="section-title" className={styles.sectionTitle}>
            The house in section
          </h2>
          <HouseCutaway />
        </div>
      </section>

      <Block id="bathrooms" title="Bathrooms">
        <Prose>
          <p>
            The bathrooms are shared, with hot showers, and they are {lowerFirst(bathrooms.cleaning.value)}. Guests
            often single out how clean the whole house is.
          </p>
        </Prose>
        <PhotoFrame caption="A shared bathroom" drawing="shower" />
      </Block>

      {breakfast.included.value ? (
        <Block id="breakfast" title="Café and breakfast">
          <Prose>
            <p>
              The café is on the ground floor, and breakfast is included, served {breakfast.hours.value}:{" "}
              {joinList(breakfast.items.value.map((item) => item.toLowerCase()))}.
            </p>
            <p>
              After breakfast, the café is yours to relax or work in, with coffee and tea served{" "}
              {building.cafeDrinks.value}.
            </p>
          </Prose>
          <PhotoFrame caption="Breakfast in the café downstairs" drawing="cafe" />
        </Block>
      ) : null}

      <Block id="comfort" title="Comfort and convenience">
        <TickList columns items={amenities.map((amenity) => amenity.value.name)} />
        <PhotoFrame
          caption={photos.locker.caption}
          photo={photos.locker}
          drawing="luggage"
          aspect="4 / 5"
          sizes="(min-width: 60rem) 24rem, 90vw"
          className={styles.locker}
        />
      </Block>

      <Block id="who" title="Who the house suits">
        <Prose>
          <p>Travellers who want a clean bed, a quiet night and breakfast before the day starts.</p>
          <p>
            {atmosphere.summary.value} Hen and stag parties are not accepted.{" "}
            <Link href="/guides/quiet-hostel-vientiane">Why guests call it quiet</Link>.
          </p>
        </Prose>
      </Block>

      <Block id="good-to-know" title="Good to know" tone="cream" aside="From what guests tell us.">
        <TickList items={honestNotes.map((note) => note.value)} />
      </Block>

      <ReadNext paths={["/guides/quiet-hostel-vientiane", pages.rules.path, pages.vientiane.path]} />
      <BookingCard />
      <PageJsonLd path={pages.house.path} />
    </>
  );
}
