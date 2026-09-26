import { InquiryForm } from "@/components/book/InquiryForm";
import { ContactDetails } from "@/components/contact/ContactDetails";
import { Block, Prose } from "@/components/page/Block";
import { PageHeader } from "@/components/page/PageHeader";
import { ExternalIcon } from "@/components/ui/icons";
import { addressLines, identity } from "@/content/identity";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./book.module.css";

export const metadata = pageMetadata(pages.book);

const platforms = [
  { name: "Booking.com", href: identity.links.booking.value },
  { name: "Agoda", href: identity.links.agoda.value },
];

export default function BookPage() {
  return (
    <>
      <PageHeader
        eyebrow="Book"
        title="Check availability"
        lede="Live prices and free beds are on Booking.com and Agoda. Or send the team a message, and they will reply by email or WhatsApp."
      />

      <Block id="online" title="Book online" aside="Both open in a new tab. There is no payment on this website.">
        <ul role="list" className={styles.platforms}>
          {platforms.map((platform) => (
            <li key={platform.name}>
              <a href={platform.href} target="_blank" rel="noopener noreferrer" className={styles.platform}>
                <span className={styles.platformName}>{platform.name}</span>
                <span className={styles.platformNote}>Live prices and availability</span>
                <ExternalIcon className={styles.platformIcon} />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </Block>

      <Block id="message" title="Send the team a message" aside="For dates, questions or anything you need before you arrive.">
        <InquiryForm />
      </Block>

      <Block id="contact" title="Contact the team" tone="cream">
        <ContactDetails />
        <Prose>
          <p className={styles.addressLabel}>Address</p>
          <address className={styles.address}>
            {addressLines().map((line) => (
              <span key={line}>{line}</span>
            ))}
          </address>
        </Prose>
      </Block>
    </>
  );
}
