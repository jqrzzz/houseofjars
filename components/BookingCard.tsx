import { identity } from "@/content/identity";
import { pages } from "@/lib/site";
import styles from "./BookingCard.module.css";
import { TextileBand } from "./brand/TextileBand";
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
 * The closing call to action on most pages, set like a ticket. The form
 * carries check-in, nights and guests to the message form on /book (a plain
 * GET, so it works without JavaScript). The Booking.com and Agoda links open
 * the house's pages there: their date parameters can't be verified from
 * here, so the dates are not passed on.
 */
export function BookingCard() {
  return (
    <Section space="m" labelledBy="booking-card-title" className={styles.section}>
      <div className="container">
        <div className={styles.ticket}>
          <div className={styles.main}>
            <TextileBand pattern="lozenge" weave="view" />
            <form className={styles.form} action={`${pages.book.path}#message`} method="get">
              <h2 id="booking-card-title" className={styles.title}>
                Find a bed for your dates.
              </h2>
              <p className={styles.text}>
                Tell the team when you would like to stay, and they will reply by email or WhatsApp.
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
                Ask the team
                <ArrowIcon />
              </button>
            </form>
          </div>
          <div className={styles.stub}>
            <ShadowWriting still className={styles.clipboard} />
            <p className={styles.stubTitle}>Live prices</p>
            <p className={styles.stubText}>Free beds and prices are on the booking sites.</p>
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
