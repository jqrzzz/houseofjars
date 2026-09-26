import Link from "next/link";
import type { Metadata } from "next";
import { guidePath, type Guide, type GlanceRow, type GuideSection } from "@/content/guides";
import { formatDate } from "@/content/text";
import { pageMetadata } from "@/lib/metadata";
import { breadcrumbTrail, findPage } from "@/lib/pages";
import { BookingCard } from "../BookingCard";
import { InlineText } from "../InlineText";
import { PageJsonLd } from "../PageJsonLd";
import { PhotoFrame } from "../PhotoFrame";
import { Drawing } from "../art/Drawing";
import type { DrawingName } from "../art/drawings";
import { DriverAddress } from "../contact/DriverAddress";
import { Block, Prose, TickList } from "../page/Block";
import { Breadcrumbs } from "../page/Breadcrumbs";
import { Steps } from "../page/Lists";
import { PageHeader } from "../page/PageHeader";
import { Ledger } from "../ui/Ledger";
import { Section } from "../ui/Section";
import { guideArt } from "./art";
import { ReadNext } from "./ReadNext";
import { Sources } from "./Sources";
import styles from "./Guide.module.css";

export function guideMetadata(guide: Guide): Metadata {
  return pageMetadata(findPage(guidePath(guide)));
}

/**
 * A guide, answer first: the question as the heading and its answer as the
 * opening paragraph, the facts at a glance, then the detail, what to read
 * next and where every fact comes from.
 */
export function GuidePage({ guide }: { guide: Guide }) {
  const page = findPage(guidePath(guide));
  const art = guideArt(guide.slug);
  return (
    <>
      <PageHeader
        trail={<Breadcrumbs trail={breadcrumbTrail(page)} />}
        title={guide.question}
        lede={<InlineText parts={guide.answer} />}
        meta={
          <>
            Last reviewed <time dateTime={guide.reviewed}>{formatDate(guide.reviewed)}</time>
          </>
        }
        art={<Drawing name={art.header} />}
      />
      <Glance guide={guide} />
      {guide.sections.map((section) => (
        <GuideBlock key={section.id} section={section} drawing={art.sections?.[section.id]} />
      ))}
      <ReadNext paths={guide.related} />
      <Sources facts={guide.facts} />
      <BookingCard />
      <PageJsonLd path={page.path} />
    </>
  );
}

function GlanceValue({ row }: { row: GlanceRow }) {
  if (!row.href) return row.value;
  if (row.href.startsWith("/")) return <Link href={row.href}>{row.value}</Link>;
  return (
    <a href={row.href} target="_blank" rel="noopener noreferrer" className={styles.nowrap}>
      {row.value}
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

function Glance({ guide }: { guide: Guide }) {
  const { variant, rows } = guide.glance;
  return (
    <Section tone="deep" space="m" labelledBy="glance-title">
      <div className={`container ${styles.glance}`}>
        <div className={styles.glanceIntro}>
          <h2 id="glance-title" className={styles.glanceTitle}>
            At a glance
          </h2>
          <p className={styles.glanceNote}>The short version. Where each fact comes from is at the foot of the page.</p>
        </div>
        <Ledger
          variant={variant}
          ticks={variant === "standards"}
          rows={rows.map((row) => ({ term: row.term, value: <GlanceValue row={row} />, note: row.note }))}
        />
      </div>
    </Section>
  );
}

function GuideBlock({ section, drawing }: { section: GuideSection; drawing?: DrawingName }) {
  const { id, title, aside } = section;
  const frame = drawing ? <PhotoFrame caption={title} drawing={drawing} /> : null;
  switch (section.kind) {
    case "steps":
      return (
        <Block id={id} title={title} aside={aside} tone="cream">
          <Steps
            steps={section.steps.map((step) => ({
              title: step.title,
              body: (
                <p>
                  <InlineText parts={step.body} />
                </p>
              ),
            }))}
          />
          {frame}
        </Block>
      );
    case "text":
      return (
        <Block id={id} title={title} aside={aside}>
          <Prose>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index}>
                <InlineText parts={paragraph} />
              </p>
            ))}
          </Prose>
          {frame}
        </Block>
      );
    case "list":
      return (
        <Block id={id} title={title} aside={aside}>
          <TickList items={section.items.map((item, index) => <InlineText key={index} parts={item} />)} />
          {frame}
        </Block>
      );
    case "address":
      return (
        <Block id={id} title={title} aside={aside}>
          <DriverAddress label="Show your driver" />
          {frame}
        </Block>
      );
  }
}
