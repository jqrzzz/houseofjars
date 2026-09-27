import { BookingCard } from "@/components/BookingCard";
import { InlineText } from "@/components/InlineText";
import { Block } from "@/components/page/Block";
import { PageHeader } from "@/components/page/PageHeader";
import { PageJsonLd } from "@/components/PageJsonLd";
import { ReadNext } from "@/components/guide/ReadNext";
import { faqFor } from "@/content/faq";
import { onlineBookingConfigured } from "@/lib/booking/config";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./faq.module.css";

export const metadata = pageMetadata(pages.faq);

const groupId = (title: string) => title.toLowerCase().replace(/[^a-z]+/g, "-");

export default function FaqPage() {
  const faq = faqFor(onlineBookingConfigured());
  return (
    <>
      <PageHeader
        eyebrow="Questions"
        morph="faq"
        title="Questions and answers"
        lede="Plain answers about staying at House of Jars. If yours isn’t here, ask Shadow or message the team."
      />

      <nav aria-label="Topics" className={`container ${styles.topics}`}>
        <ul role="list" className={styles.topicList}>
          {faq.map((group) => (
            <li key={group.title}>
              <a href={`#${groupId(group.title)}`}>{group.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      {faq.map((group) => (
        <Block key={group.title} id={groupId(group.title)} title={group.title}>
          <dl className={styles.list}>
            {group.entries.map((entry) => (
              <div key={entry.id} id={entry.id} className={styles.entry}>
                <dt className={styles.question}>{entry.question}</dt>
                <dd className={styles.answer}>
                  <InlineText parts={entry.answer} />
                </dd>
              </div>
            ))}
          </dl>
        </Block>
      ))}

      <ReadNext paths={["/guides/from-wattay-airport", "/guides/lao-digital-immigration-form", "/guides/quiet-hostel-vientiane"]} />
      <BookingCard />
      <PageJsonLd path={pages.faq.path} />
    </>
  );
}
