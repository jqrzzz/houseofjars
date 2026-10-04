import Image from "next/image";
import { identity, whatsappUrl } from "@/content/identity";
import { photos } from "@/content/photos";
import { onlineBookingConfigured } from "@/lib/booking/config";
import { pages } from "@/lib/site";
import { DirectRequest } from "./book/DirectRequest";
import { WovenBand } from "./brand/WovenBand";
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
 * The closing call to action on most pages, set like a ticket, with the
 * curtains' woven lozenges along its top. Booking direct comes first. With
 * online booking (lib/booking/config.ts) the form carries check-in, nights
 * and guests to /book's free beds (a plain GET, so it works without
 * JavaScript). Without it, the same three fields write the guest's request
 * into WhatsApp or an email for them to send (DirectRequest). The stub
 * offers Booking.com and Agoda second: their date parameters can't be
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
            <WovenBand pattern="lozenge" weave />
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
                  Book direct with the house.
                </h2>
                <p className={styles.text}>
                  Choose your dates and send them to the team on WhatsApp or by email. Someone is on site day and night.
                </p>
                <DirectRequest whatsapp={whatsappUrl()} email={identity.contact.email.value} />
              </div>
            )}
          </div>
          <div className={styles.stub}>
            <ShadowWriting still className={styles.clipboard} />
            <p className={styles.stubTitle}>Also on</p>
            <p className={styles.stubText}>The house is on the booking sites too, with live prices.</p>
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
