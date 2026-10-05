import type { CSSProperties } from "react";
import { BookingCard } from "@/components/BookingCard";
import { AskShadowButton } from "@/components/concierge/AskShadowButton";
import { ArchWisp } from "@/components/art/ArchWisp";
import { Drawing } from "@/components/art/Drawing";
import paper from "@/components/art/paper.module.css";
import { PaperJar, StoneJars } from "@/components/art/StoneJars";
import { MARK_PARTS } from "@/components/brand/mark-shape";
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

/** Three jars of the plain, each hewn differently (stoneJar() seeds): a broken one, a tall one, a squat one. */
const PLAIN_JARS = [29, 18, 37] as const;

/** The small jar at the mark's door, seen from a little above so its mouth shows. */
const DOOR_JAR = { w: 36, h: 40, foot: 0.84, belly: 0.4, neck: 0.84, lip: 0.94, lipH: 0.15, top: 0.26, skew: 0.04, seed: 3, rough: 0.03 } as const;

/*
 * The mark's five pieces, in the order they are set: the pillars rise, then
 * the centre's three blocks settle in from above (as in the splash).
 */
const [leftPillar, topBlock, middleBlock, bottomBlock, rightPillar] = MARK_PARTS;
const PIECES = [
  { d: leftPillar, move: "rise", delay: 0 },
  { d: rightPillar, move: "rise", delay: 110 },
  { d: topBlock, move: "drop", delay: 280 },
  { d: middleBlock, move: "drop", delay: 370 },
  { d: bottomBlock, move: "drop", delay: 460 },
] as const;

/**
 * The house's mark, built in teak beside its story: the arch is the front of
 * the house, and a small stone jar stands at its door. When the scene first
 * comes into view (a [data-phrase]) the pieces are set one by one, then warm
 * air rises from the jar and traces the arch, once (ArchWisp). Its rest frame
 * is the finished mark. Drawn in px on a 120 by 226 grid: the mark is 96 wide
 * (0.16 of its 600), its foot at 168; the jar's mouth sits where the wisp
 * starts, at (60, 180). Decorative.
 */
function MarkScene() {
  return (
    <div className={styles.markScene} data-phrase="" aria-hidden="true">
      <svg className={`${paper.paper} ${styles.markArt}`} viewBox="0 0 120 226" width="120" height="226" focusable="false">
        <ellipse className={styles.forecourt} cx="60" cy="196" rx="59" ry="28" />
        <g transform="translate(12 24) scale(0.16)">
          {PIECES.map(({ d, move, delay }) => (
            <path key={delay} d={d} className={`${styles.piece} ${styles[move]}`} style={{ "--delay": `${delay}ms` } as CSSProperties} />
          ))}
        </g>
        <g transform="translate(60 216)">
          {/* The page shows it once, so a fixed id is safe. */}
          <PaperJar spec={DOOR_JAR} id="about-door-jar" open />
        </g>
      </svg>
      <ArchWisp size={192} className={styles.wisp} />
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        morph="about"
        title="About the house"
        lede={`${identity.name.value} is a calm dorm hostel in ${location.neighbourhood.value}: ${countWord(building.floors.value).toLowerCase()} floors of pod beds, with a café downstairs.`}
        art={<Drawing name="plain" preload />}
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
        </Prose>
        <div className={styles.withArt}>
          <Prose>
            <p>{plainOfJars.summary.value}</p>
          </Prose>
          <StoneJars seeds={PLAIN_JARS} className={styles.jars} />
        </div>
        <div className={styles.withArt}>
          <Prose>
            <p>{identity.markStory.value}</p>
          </Prose>
          <MarkScene />
        </div>
      </Block>

      <Block id="team" title="The team">
        <Prose>
          <p>
            The team is {lowerFirst(staff.hours.value.summary)} and speaks {joinList(staff.languages.value)}. Guests
            say {lowerFirst(staff.transport.value)}, and that the team replies to messages quickly.
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
