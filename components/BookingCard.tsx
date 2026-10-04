import Image from "next/image";
import Link from "next/link";
import { identity, whatsappUrl } from "@/content/identity";
import { photos } from "@/content/photos";
import { onlineBookingConfigured } from "@/lib/booking/config";
import { pages } from "@/lib/site";
import styles from "./BookingCard.module.css";
import { ShadowWriting } from "./shadow/ShadowWriting";
import { Section } from "./ui/Section";
import buttons from "./ui/button.module.css";
import { ArrowIcon, ExternalIcon } from "./ui/icons";

const nights = Array.from({ length: 14 }, (_, index) => index + 1);
const guests = Array.from({ length: 8 }, (_, index) => index + 1);

const platforms = [
  { name: "Booking.com", href: identity.links.booking.value },
  { name: "Agoda", href: identity.links.agoda.value },
];

/**
 * The closing call to action on most pages, set like a ticket. With online
 * booking (lib/booking/config.ts) the form carries check-in, nights and
 * guests to /book's free beds (a plain GET, so it works without JavaScript).
 * Without it, nothing on the site could send a request, so the ticket offers
 * WhatsApp and the team's other contacts instead. The Booking.com and Agoda
 * links open the house's pages there: their date parameters can't be
 * verified from here, so the dates are not passed on.
 */
export function BookingCard() {
  const online = onlineBookingConfigured();
  return (
    <Section space="m" labelledBy="booking-card-title" className={styles.section}>
      {/* The dorm in lamplight, blurred behind the glass ticket. Decorative. */}
      <Image src={photos.dormFan.src} alt="" fill sizes="(min-width: 60rem) 50vw, 80vw" className={styles.backdrop} />
      <div className="container">
        {/* A booking form of its own: Shadow's dock steps aside while it is at the bottom of the screen. */}
        <div className={styles.ticket} data-hides-launcher="" data-reveal="">
          <div className={styles.main}>
            {online ? (
              <form
                className={styles.form}
                action={pages.book.path}
                method="get"
                aria-labelledby="booking-card-title"
              >
                <h2 id="booking-card-title" className={styles.title}>
                  Find a bed for your dates.
                </h2>
                <p className={styles.text}>
                  See which beds are free on your dates and book directly with the house. Nothing to pay online: you pay when
                  you arrive.
                </p>
                <div className={styles.fields}>
                  <label className={`${styles.field} ${styles.date}`}>
                    <span>Check-in</span>
                    <input type="date" name="check_in" />
                  </label>
                  <label className={styles.field}>
                    <span>Nights</span>
                    <select name="nights" defaultValue="2">
                      {nights.map((count) => (
                        <option key={count}>{count}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Guests</span>
                    <select name="guests" defaultValue="1">
                      {guests.map((count) => (
                        <option key={count}>{count}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button type="submit" className={`${buttons.button} ${buttons.primary}`}>
                  See free beds
                  <ArrowIcon />
                </button>
              </form>
            ) : (
              <div className={styles.form}>
                <h2 id="booking-card-title" className={styles.title}>
                  Find a bed for your dates.
                </h2>
                <p className={styles.text}>
                  Send the team your dates on WhatsApp: someone is on site day and night. Live prices and free beds are on
                  the booking sites too.
                </p>
                <div className={styles.actions}>
                  <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className={`${buttons.button} ${buttons.primary}`}>
                    Message on WhatsApp
                    <ExternalIcon />
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                  <Link href={`${pages.book.path}#message`} className={`${buttons.button} ${buttons.secondary}`}>
                    Phone or email
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className={styles.stub}>
            <ShadowWriting still className={styles.clipboard} />
            <p className={styles.stubTitle}>{online ? "Also on" : "Live prices"}</p>
            <p className={styles.stubText}>
              {online ? "The house is on the booking sites too." : "Free beds and prices are on the booking sites."}
            </p>
            <ul role="list" className={styles.platforms}>
              {platforms.map((platform) => (
                <li key={platform.name}>
                  <a href={platform.href} target="_blank" rel="noopener noreferrer" className={styles.platform}>
                    <span>See prices on {platform.name}</span>
                    <ExternalIcon />
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}
