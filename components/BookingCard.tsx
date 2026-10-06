import Form from "next/form";
import Link from "next/link";
import { ViewTransition } from "react";
import { identity, whatsappUrl } from "@/content/identity";
import { breakfast, policies } from "@/content/stay";
import { onlineBookingConfigured } from "@/lib/booking/config";
import { firstMorningText } from "@/lib/booking/stay-rail";
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
 * The closing call to action on most pages: a paper ticket standing in a slot
 * in the front desk's teak counter, with the curtains' woven lozenges along
 * its top, against the paper wall behind the desk. As the slot comes into view the ticket slides 1.25rem up out of it
 * (a phrase: its base style is the rest frame, so Still, reduced motion and
 * pages without JavaScript simply show it standing). That is the card's only
 * motion: the form, prices and buttons never move.
 *
 * Booking direct comes first. With online booking (lib/booking/config.ts) the
 * form carries check-in, nights and guests to /book's free beds (a GET form,
 * so it works without JavaScript; with it, next/form follows it inside the
 * site). Without it, the same three fields write the guest's request into
 * WhatsApp or an email for them to send (DirectRequest). The stub offers
 * Booking.com and Agoda second: their date parameters can't be verified from
 * here, so the dates are not passed on.
 *
 * Going to /book from here, the ticket itself glides into the booking panel
 * there (the "booking-ticket" morph; React pairs the two only while both are
 * on screen).
 */
export function BookingCard() {
  const online = onlineBookingConfigured();
  // "Your first morning: breakfast from 08:00.", its lead set off like a label.
  const [lead, ...rest] = firstMorningText(breakfast.hours.value).split(": ");
  const morning = (
    <p className={styles.morning}>
      <strong>{lead}:</strong> {rest.join(": ")}
    </p>
  );
  return (
    <Section space="m" labelledBy="booking-card-title" className={styles.section}>
      <div className="container">
        <div className={styles.holder}>
          <div className={styles.sleeve}>
            <ViewTransition name="booking-ticket" share="morph" default="none">
              {/* A booking form of its own: Shadow's dock steps aside while it is at the bottom of the screen. */}
              <div className={styles.ticket} data-hides-launcher="">
                <div className={styles.main}>
                  <WovenBand pattern="lozenge" weave />
                  {online ? (
                    <Form className={styles.form} action={pages.book.path} aria-labelledby="booking-card-title">
                      <h2 id="booking-card-title" className={styles.title}>
                        Find a bed for your dates.
                      </h2>
                      <p className={styles.text}>
                        See which beds are free on your dates and book directly with the house. Nothing to pay online: you
                        pay when you arrive. {policies.directPrice.value}
                      </p>
                      {morning}
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
                    </Form>
                  ) : (
                    <div className={styles.form}>
                      <h2 id="booking-card-title" className={styles.title}>
                        Book direct with the house.
                      </h2>
                      <p className={styles.text}>
                        {policies.directPrice.value} Choose your dates and send them to the team on WhatsApp or by email.
                      </p>
                      {morning}
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
                  <p className={styles.more}>
                    Rather call or write?{" "}
                    <Link href={pages.book.path} transitionTypes={["nav-forward"]}>
                      Every way to book
                    </Link>
                  </p>
                </div>
              </div>
            </ViewTransition>
          </div>
          {/* The slot in the counter. It starts the ticket's arrival as it comes into view (StageLife). */}
          <div className={styles.slot} data-phrase="" aria-hidden="true" />
        </div>
      </div>
    </Section>
  );
}
