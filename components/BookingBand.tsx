import Link from "next/link";
import { whatsappUrl } from "@/content/identity";
import { pages } from "@/lib/site";
import styles from "./BookingBand.module.css";
import { Section } from "./ui/Section";
import buttons from "./ui/button.module.css";
import { ArrowIcon, WhatsAppIcon } from "./ui/icons";

/** The closing call to action on most pages. */
export function BookingBand() {
  return (
    <Section tone="band" space="m" labelledBy="booking-band-title">
      <div className={`container ${styles.grid}`}>
        <div>
          <h2 id="booking-band-title" className={styles.title}>
            Find a bed for your dates.
          </h2>
          <p className={styles.text}>
            Live prices are on Booking.com and Agoda. Or message the team, and they will reply by email or WhatsApp.
          </p>
        </div>
        <div className={styles.actions}>
          <Link href={pages.book.path} className={`${buttons.button} ${buttons.bandFill}`}>
            Check availability
            <ArrowIcon />
          </Link>
          <a
            href={whatsappUrl()}
            className={`${buttons.button} ${buttons.secondary}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon />
            WhatsApp the team
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </Section>
  );
}
