import Link from "next/link";
import { BookingBand } from "@/components/BookingBand";
import { PhotoFrame } from "@/components/PhotoFrame";
import { HouseCutaway } from "@/components/house/HouseCutaway";
import { PodDiagram } from "@/components/house/PodDiagram";
import { Block, Prose, TickList } from "@/components/page/Block";
import { PageHeader } from "@/components/page/PageHeader";
import { honestNotes } from "@/content/reviews";
import { amenities, atmosphere, bathrooms, beds, breakfast, building } from "@/content/stay";
import { countWord, joinList, lowerFirst } from "@/content/text";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./the-house.module.css";

export const metadata = pageMetadata(pages.house);

export default function TheHousePage() {
  return (
    <>
      <PageHeader
        eyebrow="The house"
        title="Inside the house"
        lede={`${countWord(building.floors.value)} floors of curtained pod beds, shared bathrooms with hot showers, and a café downstairs where breakfast is included. Here is what to expect.`}
      />

      <section id="section" aria-labelledby="section-title" className={styles.section}>
        <div className="container">
          <h2 id="section-title" className={styles.sectionTitle}>
            The house in section
          </h2>
          <HouseCutaway />
        </div>
      </section>

      <Block id="beds" title="Your pod">
        <Prose>
          <p>
            Every bed is a pod: its own cubicle with a privacy curtain, so you can close out the room and sleep. Each
            pod has:
          </p>
          <TickList numbered items={beds.perBed.value} />
          <p>
            The dorms include {joinList(beds.dorms.value)}. To see which beds are free on your dates, check
            Booking.com or Agoda, or <Link href={pages.book.path}>ask us</Link>.
          </p>
        </Prose>
        <PodDiagram />
      </Block>

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
              The café is on the ground floor, and breakfast is included:{" "}
              {joinList(breakfast.items.value.map((item) => item.toLowerCase()))}.
            </p>
          </Prose>
          <PhotoFrame caption="Breakfast in the café downstairs" drawing="cafe" />
        </Block>
      ) : null}

      <Block id="comfort" title="Comfort and convenience">
        <TickList columns items={amenities.map((amenity) => amenity.value.name)} />
        <PhotoFrame caption="Luggage storage" drawing="luggage" />
      </Block>

      <Block id="who" title="Who the house suits">
        <Prose>
          <p>Travellers who want a clean bed, a quiet night and breakfast before the day starts.</p>
          <p>{atmosphere.summary.value} Hen and stag parties are not accepted.</p>
        </Prose>
      </Block>

      <Block id="good-to-know" title="Good to know" tone="cream" aside="From what guests tell us.">
        <TickList items={honestNotes.map((note) => note.value)} />
      </Block>

      <BookingBand />
    </>
  );
}
