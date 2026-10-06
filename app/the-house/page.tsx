import Link from "next/link";
import { BookingCard } from "@/components/BookingCard";
import { PhotoFrame } from "@/components/PhotoFrame";
import { FindYourPodPoster } from "@/components/game/FindYourPodPoster";
import { HOUSE_PHOTOS, HouseStage } from "@/components/house/HouseStage";
import { PodDiagram } from "@/components/house/PodDiagram";
import { PhotoTwin } from "@/components/stage/PhotoTwin";
import { cameraNumber, type PhotoKey } from "@/components/stage/places";
import { isFirm } from "@/content/certainty";
import { photos } from "@/content/photos";
import { Block, Prose, TickList } from "@/components/page/Block";
import { IconList } from "@/components/page/Lists";
import { PageHeader } from "@/components/page/PageHeader";
import { PageJsonLd } from "@/components/PageJsonLd";
import { ReadNext } from "@/components/guide/ReadNext";
import { honestNotes } from "@/content/reviews";
import { amenities, atmosphere, bathrooms, beds, breakfast, building } from "@/content/stay";
import { countWord, joinList, lowerFirst } from "@/content/text";
import { onlineBookingConfigured } from "@/lib/booking/config";
import { houseOfJars } from "@/lib/house/house-of-jars";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./the-house.module.css";

export const metadata = pageMetadata(pages.house);

/** The dorms, then the stairs: the house's own photographs. The camera dots on the drawing follow this order (HOUSE_PHOTOS). */
const lookInside: readonly PhotoKey[] = ["dormFan", "podCurtain", "podLadder", "wallOfJars", "stairsJar", "lamp"];

/** Links deeper into the site play the forward page transition. */
const FORWARD = ["nav-forward"];

/** Places you stand on rather than in. */
const ON = new Set(["landing", "stairs", "terrace"]);

/**
 * Where a photo was taken, in the house model's words, to follow "Taken":
 * "in Dorm H, Floor 1" for a named room, "on the landing, Floor 1" for a
 * plain place.
 */
function placeName(area: string): string | undefined {
  const found = houseOfJars.areas.find((a) => a.id === area);
  const floor = houseOfJars.floors.find((f) => f.id === found?.floor);
  if (!found || !floor) return undefined;
  // A room with a name of its own ends in its letter (Dorm H); any other place is "the" landing, café, …
  const named = / [A-Z0-9]+$/.test(found.name);
  const name = named ? found.name : found.name.toLowerCase();
  return `${!named && ON.has(name) ? "on" : "in"} ${named ? name : `the ${name}`}, ${floor.name}`;
}

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
            Each dorm has {beds.podsPerDorm.value} pods.{" "}
            {onlineBookingConfigured() ? (
              <>
                To see which beds are free on your dates, see the{" "}
                <Link href={pages.book.path} transitionTypes={FORWARD}>
                  booking page
                </Link>
                , or Booking.com and Agoda.
              </>
            ) : (
              <>
                To see which beds are free on your dates, check Booking.com or Agoda, or{" "}
                <Link href={pages.book.path} transitionTypes={FORWARD}>
                  ask us
                </Link>
                .
              </>
            )}
          </p>
        </Prose>
        <PodDiagram />
      </Block>

      <section id="section" aria-labelledby="section-title" className={styles.section}>
        <div className="container">
          <h2 id="section-title" className={styles.sectionTitle}>
            The house in section
          </h2>
          <HouseStage photos={HOUSE_PHOTOS} />
        </div>
      </section>

      <section id="look-inside" aria-labelledby="look-inside-title" className={styles.section}>
        <div className="container">
          <h2 id="look-inside-title" className={styles.sectionTitle}>
            A look inside
          </h2>
          <ul role="list" className={styles.gallery}>
            {lookInside.map((key, index) => {
              const photo = photos[key];
              const n = cameraNumber(HOUSE_PHOTOS, key);
              const area = photo.place?.area;
              const where = area ? placeName(area) : undefined;
              const placed = n !== undefined && area !== undefined && where !== undefined;
              // One paper twin per place: photos taken in the same area would show the same tile.
              const twin = placed && !lookInside.slice(0, index).some((k) => photos[k].place?.area === area);
              return (
                <li key={key} id={`photo-${key}`} className={twin ? `${styles.photo} ${styles.placed}` : styles.photo} data-reveal="">
                  <div className={styles.stack}>
                    <PhotoFrame
                      caption={photo.caption}
                      photo={photo}
                      drawing="pod"
                      aspect="4 / 5"
                      sizes="(min-width: 60rem) 22rem, (min-width: 40rem) 45vw, 90vw"
                    />
                    {placed ? (
                      <a href="#section" className={styles.where}>
                        <span className={styles.number} aria-hidden="true">
                          {n}
                        </span>
                        <span className="visually-hidden">Photo {n}: </span>
                        Taken {where}
                      </a>
                    ) : null}
                  </div>
                  {twin ? <PhotoTwin area={area} className={styles.twin} /> : null}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <Block id="bathrooms" title="Bathrooms">
        <Prose>
          <p>
            The bathrooms are shared, with hot showers. Guests say they are {lowerFirst(bathrooms.cleaning.value)},
            and often single out how clean the whole house is.
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
        {/* What only guests report keeps their credit. */}
        <IconList items={amenities.map((amenity) => (isFirm(amenity) ? amenity.value.name : `${amenity.value.name}, guests say`))} />
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
            <Link href="/guides/quiet-hostel-vientiane" transitionTypes={FORWARD}>
              Why guests call it quiet
            </Link>
            .
          </p>
        </Prose>
      </Block>

      <Block id="good-to-know" title="Good to know" tone="cream" aside="From what guests tell us.">
        <TickList items={honestNotes.map((note) => note.value)} />
      </Block>

      <Block id="play" title="Find your pod" aside="A small game: it loads only when you press Play.">
        <Prose>
          <p>
            Practise the walk before you come. Three errands on the house’s own plans: arriving, back late and leaving
            early. You play a small lamp light. Keep to the house rules on the way and earn up to nine lamps. Miss a rule
            and Shadow shows it to you. You can’t lose.
          </p>
        </Prose>
        <FindYourPodPoster />
      </Block>

      <ReadNext paths={["/guides/quiet-hostel-vientiane", pages.rules.path, pages.vientiane.path]} />
      <BookingCard />
      <PageJsonLd path={pages.house.path} />
    </>
  );
}
