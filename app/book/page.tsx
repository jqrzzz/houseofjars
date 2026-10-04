import type { HouseNotes } from "@/components/book/BookingSteps";
import { DirectRequest } from "@/components/book/DirectRequest";
import { InquiryForm } from "@/components/book/InquiryForm";
import { OnlineBooking } from "@/components/book/OnlineBooking";
import { ContactDetails } from "@/components/contact/ContactDetails";
import { Block, Prose } from "@/components/page/Block";
import { PageHeader } from "@/components/page/PageHeader";
import { ExternalIcon } from "@/components/ui/icons";
import { PageJsonLd } from "@/components/PageJsonLd";
import { addressLines, identity, whatsappUrl } from "@/content/identity";
import { policies, rules, times } from "@/content/stay";
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
 * /book: booking direct first, the booking sites last. With Shadow
 * Check-in's address and key set when the site is built, the page opens with
 * online booking and has the message form. Without them neither form could
 * send anything (both go through Shadow Check-in), so the guest's dates are
 * written out for them to send on WhatsApp or by email (DirectRequest).
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
            lede={`Choose your dates to see the free beds, and book directly with the house. There is nothing to pay online: you pay when you arrive. ${policies.directPrice.value}`}
          />
          <OnlineBooking house={house} />
          <Block id="message" title="Send the team a message" aside="For dates, questions or anything you need before you arrive.">
            <InquiryForm labelledBy="message-title" />
          </Block>
        </>
      ) : (
        <>
          <PageHeader
            eyebrow="Book"
            morph="book"
            title="Book direct"
            lede={`${policies.directPrice.value} Send your dates to the team on WhatsApp or by email, and book with the house itself.`}
          />
          {/* Every "message the team" link lands here: the guest's dates, written out for their own WhatsApp or mail app. */}
          <Block id="message" title="Send your dates" aside="The team replies on WhatsApp or by email with what is free.">
            <DirectRequest whatsapp={whatsappUrl()} email={identity.contact.email.value} />
          </Block>
        </>
      )}

      <Block id="contact" title={online ? "Contact the team" : "Or call, or write"} tone="cream">
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

      {/* The booking sites come after the house's own ways to book. */}
      <Block id="online" title="Also on Booking.com and Agoda" aside="Live prices and free beds. Both open in a new tab; there is no payment on this website.">
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
      <PageJsonLd path={pages.book.path} />
    </>
  );
}
