import Link from "next/link";
import { BookingCard } from "@/components/BookingCard";
import { Drawing } from "@/components/art/Drawing";
import { Film } from "@/components/film/Film";
import { Block } from "@/components/page/Block";
import { RuleList, Steps, type RuleItem, type Step } from "@/components/page/Lists";
import { PageHeader } from "@/components/page/PageHeader";
import { PageJsonLd } from "@/components/PageJsonLd";
import { ReadNext } from "@/components/guide/ReadNext";
import { CurrentMarker } from "@/components/stage/CurrentMarker";
import { placesOf } from "@/components/stage/places";
import { RulePlan } from "@/components/stage/RulePlan";
import { airportTransport, immigration } from "@/content/area";
import { whatsappUrl } from "@/content/identity";
import { beds, rules, times, type HouseRule } from "@/content/stay";
import { joinList, lowerFirst } from "@/content/text";
import { DRAWN_CAPTION } from "@/lib/house/caption";
import { placedHouseRules, type ResolvedRule } from "@/lib/house/rules";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./house-rules.module.css";

export const metadata = pageMetadata(pages.rules);

/** Each rule's place in the house (lib/house/rules.ts), found by the rule itself. */
const placed = placedHouseRules();

/**
 * A rule with where it lives: the model's sentence, and the areas a plan
 * lights for it. A rule about the booking rather than a place (no places, and
 * about the stay) gets no "Where" line.
 */
function withPlace(rule: HouseRule, place: ResolvedRule | undefined): RuleItem {
  if (!place || (place.scope === "stay" && place.places.length === 0)) return rule;
  return { ...rule, where: place.where, places: placesOf(place) };
}

const placeOf = (rule: HouseRule) => placed.find((p) => p.fact.value === rule);

const houseRules: RuleItem[] = [
  ...rules.house.map((rule) => withPlace(rule.value, placeOf(rule.value))),
  // Quiet hours are the house's "voice down" rule, in hours: they live where it does.
  ...(times.quietHours
    ? [withPlace({ rule: `Quiet hours are ${times.quietHours.value}.`, why: "So everyone can sleep." }, placed.find((p) => p.id === "quiet"))]
    : []),
];

const stayRules: RuleItem[] = rules.stay.map((rule) => withPlace(rule.value, placeOf(rule.value)));

const { ldif, registration } = immigration;

/** Links deeper into the site play the forward page transition. */
const FORWARD = ["nav-forward"];

const arrival: Step[] = [
  {
    title: "Before you travel",
    body: (
      <p>
        {ldif.value.summary}{" "}
        <a href={ldif.value.url} target="_blank" rel="noopener noreferrer">
          Official information on the {ldif.value.name}
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
        .
      </p>
    ),
  },
  {
    title: "On the way",
    body: (
      <p>
        <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
          Message the team on WhatsApp
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>{" "}
        with your arrival time. Guests say {lowerFirst(airportTransport.value)}{" "}
        <Link href="/guides/from-wattay-airport" transitionTypes={FORWARD}>
          From the airport, step by step
        </Link>
        .
      </p>
    ),
  },
  {
    title: "At the desk",
    body: <p>{registration.value}</p>,
  },
  {
    title: "Your pod",
    body: (
      <p>
        Check-in is from {times.checkIn.value} until {times.checkInUntil.value}. Early check-in:{" "}
        {lowerFirst(times.earlyCheckIn.value)}. Your pod has{" "}
        {joinList(beds.perBed.value.map((item) => `a ${item.toLowerCase()}`))}.{" "}
        <Link href={pages.house.path} transitionTypes={FORWARD}>
          More about the house
        </Link>
        .
      </p>
    ),
  },
];

export default function HouseRulesPage() {
  return (
    <>
      <PageHeader
        eyebrow="House rules"
        morph="house-rules"
        title="A few rules keep the house calm."
        lede="Each one comes with the reason behind it. Most are about sleep: this is a house for resting, not for parties."
        art={<Drawing name="door" preload />}
      />

      {/*
       * Where each rule lives: the paper plans of the ground floor and Floor 1
       * stay beside the rules (above them on phones), and a rule lights its
       * places when it is pointed at or crosses the middle of the screen. The
       * plans are decorative: each rule's "Where" line says the same in words.
       * With them, the line every house drawing carries: under the plans on
       * wide screens, just above the strips on phones. On phones the column
       * steps aside (display: contents), so each piece is aria-hidden itself.
       */}
      <div id="where-rules" className={styles.where}>
        <div className={styles.planColumn} aria-hidden="true">
          <div className={styles.planHolder}>
            <p className={styles.planLabel} aria-hidden="true">
              Where each rule lives
            </p>
            <RulePlan scope="where-rules" className={styles.plans} />
            <p className={styles.planCaption} aria-hidden="true">
              {DRAWN_CAPTION}
            </p>
          </div>
        </div>
        <div className={styles.lists}>
          <section id="in-the-house" aria-labelledby="in-the-house-title" className={styles.group}>
            <h2 id="in-the-house-title" className={styles.groupTitle}>
              In the house
            </h2>
            <RuleList rules={houseRules} />
          </section>
          <section id="your-stay" aria-labelledby="your-stay-title" className={styles.group}>
            <h2 id="your-stay-title" className={styles.groupTitle}>
              Your stay
            </h2>
            <RuleList rules={stayRules} />
          </section>
        </div>
        <CurrentMarker selector="#where-rules [data-places]" />
      </div>

      <Block id="arrival" title="When you arrive" tone="cream" aside="Four steps from the airport to your pod.">
        <Steps steps={arrival} />
        <Film id="arrival" />
      </Block>

      <ReadNext paths={["/guides/quiet-hostel-vientiane", "/guides/from-wattay-airport", pages.house.path]} />
      <BookingCard />
      <PageJsonLd path={pages.rules.path} />
    </>
  );
}
