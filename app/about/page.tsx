import { BookingCard } from "@/components/BookingCard";
import { AskShadowButton } from "@/components/concierge/AskShadowButton";
import { Drawing } from "@/components/art/Drawing";
import { PhotoFrame } from "@/components/PhotoFrame";
import { Block, Prose } from "@/components/page/Block";
import { PageHeader } from "@/components/page/PageHeader";
import buttons from "@/components/ui/button.module.css";
import { PageJsonLd } from "@/components/PageJsonLd";
import { ReadNext } from "@/components/guide/ReadNext";
import { location, plainOfJars } from "@/content/area";
import { identity } from "@/content/identity";
import { photos } from "@/content/photos";
import { atmosphere, building, staff } from "@/content/stay";
import { countWord, joinList, lowerFirst } from "@/content/text";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./about.module.css";

export const metadata = pageMetadata(pages.about);

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        morph="about"
        title="About the house"
        lede={`${identity.name.value} is a calm dorm hostel in ${location.neighbourhood.value}: ${countWord(building.floors.value).toLowerCase()} floors of pod beds, with a café downstairs.`}
        art={<Drawing name="plain" priority />}
      />

      <Block id="house" title="Made for rest">
        <Prose>
          <p>{atmosphere.summary.value}</p>
          <p>
            Guests write about the care that goes into the house: how clean it is, the comfortable beds, the breakfast
            and the quick replies. Its own team runs the house, on site day and night.
          </p>
        </Prose>
        <PhotoFrame
          caption={photos.wallOfJars.caption}
          photo={photos.wallOfJars}
          drawing="door"
          shape="arch"
          aspect="2 / 3"
          sizes="(min-width: 60rem) 17rem, 70vw"
          className={styles.door}
        />
      </Block>

      <Block id="name" title="Why House of Jars" tone="cream">
        <Prose>
          <p>{identity.nameStory.value}</p>
          <p>{plainOfJars.summary.value}</p>
          <p>{identity.markStory.value}</p>
        </Prose>
      </Block>

      <Block id="team" title="The team">
        <Prose>
          <p>
            The team is {lowerFirst(staff.hours.value.summary)} and speaks {joinList(staff.languages.value)}.{" "}
            {staff.transport.value}. They are known for replying to messages quickly.
          </p>
        </Prose>
      </Block>

      <Block id="shadow" title="Shadow, the AI concierge">
        <Prose>
          <p>
            Shadow is the friendly ghost butler who answers questions on this website. He is an AI, not a member of
            staff: he answers from what the house has published, can pass your message to the team, and can be wrong.
            For anything important, the team is a message away.
          </p>
        </Prose>
        <AskShadowButton className={`${buttons.button} ${buttons.secondary} ${styles.ask}`}>Ask Shadow</AskShadowButton>
      </Block>

      <ReadNext paths={[pages.house.path, "/guides/quiet-hostel-vientiane", "/guides/whats-nearby"]} />
      <BookingCard />
      <PageJsonLd path={pages.about.path} />
    </>
  );
}
