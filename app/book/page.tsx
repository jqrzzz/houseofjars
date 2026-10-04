import type { HouseNotes } from "@/components/book/BookingSteps";
import { InquiryForm } from "@/components/book/InquiryForm";
import { OnlineBooking } from "@/components/book/OnlineBooking";
import { ContactDetails } from "@/components/contact/ContactDetails";
import { Block, Prose } from "@/components/page/Block";
import { PageHeader } from "@/components/page/PageHeader";
import { ExternalIcon } from "@/components/ui/icons";
import { PageJsonLd } from "@/components/PageJsonLd";
import { addressLines, identity } from "@/content/identity";
import { rules, times } from "@/content/stay";
import { lowerFirst } from "@/content/text";
import { onlineBookingConfigured } from "@/lib/booking/config";
import { pageMetadata } from "@/lib/metadata";
import { bookPage } from "@/lib/pages";
import { pages } from "@/lib/site";
import styles from "./book.module.css";

export const metadata = pageMetadata(bookPage());

const platforms = [
  { name: "Booking.com", href: identity.links.booking.value },
  { name: "Agoda", href: identity.links.agoda.value },
];

const passport = rules.stay.find((rule) => rule.value.rule.startsWith("Bring your passport"));

/** What the booking confirmation says about arriving. */
const house: HouseNotes = {
  checkInFrom: times.checkIn.value,
  passport: passport ? `Bring your passport: ${lowerFirst(passport.value.why)}` : "",
};

/**
 * /book. With Shadow Check-in's address and key set when the site is built,
 * the page opens with online booking and has the message form. Without them
 * neither form could send anything (both go through Shadow Check-in), so the
 * page offers the booking sites and the team's WhatsApp, phone and email.
 */
export default function BookPage() {
  const online = onlineBookingConfigured();
  return (
    <>
      {online ? (
        <>
          <PageHeader
            eyebrow="Book"
            morph="book"
            title="Book a bed"
            lede="Choose your dates to see the free beds, and book directly with the house. There is nothing to pay online: you pay when you arrive."
          />
          <OnlineBooking house={house} />
        </>
      ) : (
        <PageHeader
          eyebrow="Book"
          morph="book"
          title="Prices and booking"
          lede="Live prices and free beds are on Booking.com and Agoda. Or send the team a message, and they will reply by email or WhatsApp."
        />
      )}

      <Block
        id="online"
        title={online ? "Or book on Booking.com or Agoda" : "Book on Booking.com or Agoda"}
        aside="Both open in a new tab. There is no payment on this website."
      >
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

      {online ? (
        <Block id="message" title="Send the team a message" aside="For dates, questions or anything you need before you arrive.">
          <InquiryForm labelledBy="message-title" />
        </Block>
      ) : null}

      {/* Without online booking this is where every "message the team" link lands: the ways that always work. */}
      <Block
        id={online ? "contact" : "message"}
        title={online ? "Contact the team" : "Message the team"}
        aside={online ? undefined : "Send your dates on WhatsApp or by email. The team is on site day and night."}
        tone="cream"
      >
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
      <PageJsonLd path={pages.book.path} />
    </>
  );
}
