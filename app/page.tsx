import Image from "next/image";
import Link from "next/link";
import { BookingBand } from "@/components/BookingBand";
import { JarMark } from "@/components/brand/JarMark";
import { AskShadowButton } from "@/components/concierge/AskShadowButton";
import { shadowFull } from "@/components/concierge/mascot";
import { BreakfastDrawing, PodBedDrawing, ShowerDrawing } from "@/components/drawings/Drawings";
import { Hero } from "@/components/home/Hero";
import { Ledger, type LedgerRow } from "@/components/ui/Ledger";
import { Eyebrow, Section } from "@/components/ui/Section";
import buttons from "@/components/ui/button.module.css";
import { ArrowIcon, ExternalIcon } from "@/components/ui/icons";
import { location } from "@/content/area";
import { identity } from "@/content/identity";
import { praise, ratings } from "@/content/reviews";
import { bathrooms, beds, breakfast, staff, times } from "@/content/stay";
import { joinList, lowerFirst } from "@/content/text";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./home.module.css";

export const metadata = pageMetadata(pages.home);

const rooms = [
  {
    Drawing: PodBedDrawing,
    title: "Your own pod",
    text: `Every bed is its own cubicle, with ${joinList(beds.perBed.value.map((item) => `a ${item.toLowerCase()}`))}.`,
  },
  {
    Drawing: ShowerDrawing,
    title: "Hot showers",
    text: `Shared bathrooms with hot showers, ${lowerFirst(bathrooms.cleaning.value)}.`,
  },
  ...(breakfast.included.value
    ? [
        {
          Drawing: BreakfastDrawing,
          title: "Breakfast downstairs",
          text: `Included, in the café on the ground floor: ${joinList(breakfast.items.value.map((item) => item.toLowerCase()))}.`,
        },
      ]
    : []),
];

const standards: LedgerRow[] = [
  {
    term: "Check-in",
    value: <>From {times.checkIn.value}</>,
    note: `Early check-in: ${lowerFirst(times.earlyCheckIn.value)}.`,
  },
  { term: "Check-out", value: <>Until {times.checkOut.value}</>, note: "Luggage storage if you leave later in the day." },
  { term: "Reception", value: staff.hours.value, note: `The team speaks ${joinList(staff.languages.value)}.` },
  { term: "Bathrooms", value: bathrooms.cleaning.value, note: "Shared, with hot showers." },
  { term: "Smoking", value: "Not anywhere in the house", note: "Clean air in every dorm." },
  {
    term: "Nights",
    value: times.quietHours ? `Quiet from ${times.quietHours.value}` : "Calm and quiet",
    note: "Not a party hostel: no hen or stag parties.",
  },
];

const distances: LedgerRow[] = Object.values(location.nearby).map((nearby) => ({
  term: nearby.value.place,
  value: nearby.value.distance,
}));

const questions = [
  "What time can I check in?",
  "Is breakfast included?",
  "How do I get here from the airport?",
  "Is the house quiet at night?",
];

export default function HomePage() {
  const ownerNote = identity.owner.note;

  return (
    <>
      <Hero />

      <Section labelledBy="house-title" className={styles.house}>
        <div className="container">
          <div className={styles.intro}>
            <Eyebrow>The house</Eyebrow>
            <h2 id="house-title" className={styles.heading}>
              Made for a good night’s sleep.
            </h2>
          </div>
          <ul role="list" className={styles.rooms}>
            {rooms.map(({ Drawing, title, text }) => (
              <li key={title} className={styles.room}>
                <div className={styles.niche}>
                  <Drawing className={styles.drawing} />
                </div>
                <h3 className={styles.roomTitle}>{title}</h3>
                <p className={styles.roomText}>{text}</p>
              </li>
            ))}
          </ul>
          <Link href={pages.house.path} className={buttons.textLink}>
            <span>Everything about the house</span>
            <ArrowIcon />
          </Link>
        </div>
      </Section>

      <Section tone="deep" labelledBy="standards-title">
        <div className={`container ${styles.split}`}>
          <div className={styles.intro}>
            <Eyebrow>How we run the house</Eyebrow>
            <h2 id="standards-title" className={styles.heading}>
              Small things, done well, every day.
            </h2>
            <p className={styles.lede}>
              A calm stay is mostly routine: clean bathrooms, fixed times and someone at the desk whenever you
              need them. These are the house’s standards.
            </p>
            <Link href={pages.rules.path} className={buttons.textLink}>
              <span>Read the house rules</span>
              <ArrowIcon />
            </Link>
          </div>
          <Ledger rows={standards} />
        </div>
      </Section>

      <Section labelledBy="ratings-title">
        <div className="container">
          <div className={styles.intro}>
            <Eyebrow>Guest ratings</Eyebrow>
            <h2 id="ratings-title" className={styles.heading}>
              What guests say
            </h2>
          </div>
          <ul role="list" className={styles.ratings}>
            {ratings.map(({ value: rating }) => (
              <li key={rating.platform} className={styles.rating}>
                <p className={styles.score}>
                  <span className={styles.scoreValue}>{rating.score}</span>
                  {rating.outOf ? <span className={styles.outOf}> out of {rating.outOf}</span> : null}
                </p>
                <p className={styles.platform}>{rating.platform}</p>
                <p className={styles.context}>{rating.context}</p>
                <p className={styles.context}>As of {formatDate(rating.asOf)}</p>
                {rating.url ? (
                  <a href={rating.url} target="_blank" rel="noopener noreferrer" className={styles.source}>
                    See it on {rating.platform}
                    <ExternalIcon />
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          <p className={styles.asOf}>Scores are as each site showed them on that date. They change, so follow the links for today’s figures.</p>
          <div className={styles.praise}>
            <h3 className={styles.praiseTitle}>What guests mention most</h3>
            <ul role="list" className={styles.praiseList}>
              {praise.value.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="cream" labelledBy="owner-title">
        <div className={`container ${styles.owner}`}>
          <JarMark className={styles.ownerMark} />
          <h2 id="owner-title" className={styles.heading}>
            Owned and run by {identity.owner.name.value}.
          </h2>
          <p className={styles.ownerText}>
            A team is on site day and night and speaks {joinList(staff.languages.value)}. Guests often mention how
            friendly and helpful they are, and how quickly they reply.
          </p>
          {ownerNote ? (
            <blockquote className={styles.ownerNote}>
              <p>{ownerNote.value}</p>
              <footer>{identity.owner.name.value}</footer>
            </blockquote>
          ) : null}
          <Link href={pages.about.path} className={buttons.textLink}>
            <span>About the house</span>
            <ArrowIcon />
          </Link>
        </div>
      </Section>

      <Section labelledBy="shadow-title">
        <div className={`container ${styles.shadowGrid}`}>
          <div className={styles.shadowArt}>
            <Image
              src={shadowFull.src}
              width={shadowFull.width}
              height={shadowFull.height}
              sizes="(min-width: 60rem) 20rem, 11rem"
              alt="Shadow, a friendly ghost butler in a brown vest, saffron bow tie and bellhop cap, holding a clipboard"
              className={styles.shadowImage}
            />
          </div>
          <div>
            <Eyebrow>Ask Shadow</Eyebrow>
            <h2 id="shadow-title" className={styles.heading}>
              Questions at any hour? Ask Shadow.
            </h2>
            <p className={styles.lede}>
              Shadow is the house’s AI concierge. He knows the beds, the breakfast, check-in and the way from the
              airport, and he can pass a message to the team. He is an AI, so he can get things wrong: for anything
              important, the team is a message away.
            </p>
            <ul role="list" className={styles.questions}>
              {questions.map((question) => (
                <li key={question}>
                  <AskShadowButton question={question} className={styles.question}>
                    <span>{question}</span>
                    <ArrowIcon />
                  </AskShadowButton>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="cream" labelledBy="area-title">
        <div className={`container ${styles.split}`}>
          <div className={styles.intro}>
            <Eyebrow>The neighbourhood</Eyebrow>
            <h2 id="area-title" className={styles.heading}>
              In {identity.address.village.value}, a short walk from the Mekong.
            </h2>
            <p className={styles.lede}>
              The house is in {location.neighbourhood.value}, a few minutes’ walk from the river.
            </p>
            <Link href={pages.vientiane.path} className={buttons.textLink}>
              <span>Getting here</span>
              <ArrowIcon />
            </Link>
          </div>
          <Ledger rows={distances} />
        </div>
      </Section>

      <BookingBand />
    </>
  );
}
