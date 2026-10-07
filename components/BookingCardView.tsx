"use client";

import Form from "next/form";
import Link from "next/link";
import { ViewTransition } from "react";
import type { SiteMark } from "@/content/reviews";
import { DirectRequest } from "./book/DirectRequest";
import { WovenBand } from "./brand/WovenBand";
import styles from "./BookingCard.module.css";
import { ShadowWriting } from "./shadow/ShadowWriting";
import { BrandMark } from "./ui/BrandMark";
import { Section } from "./ui/Section";
import buttons from "./ui/button.module.css";
import { ArrowIcon, ExternalIcon } from "./ui/icons";

const nights = Array.from({ length: 14 }, (_, index) => index + 1);
const guests = Array.from({ length: 8 }, (_, index) => index + 1);

/** The booking card's words, from content/ and lib/ (BookingCard.tsx). */
export interface BookingCardWords {
  /** Online booking is on (lib/booking/config.ts). */
  readonly online: boolean;
  readonly directPrice: string;
  /** "Your first morning" and the rest of its sentence. */
  readonly morning: readonly [lead: string, rest: string];
  readonly bookPath: string;
  readonly whatsapp: string;
  readonly email: string;
  /** The booking sites, with their logos. */
  readonly platforms: readonly { readonly platform: string; readonly url: string; readonly mark: SiteMark | null }[];
}

/**
 * The view of the booking card (BookingCard.tsx): the server reads its words
 * and passes them; this side draws them, so the many pages that close with
 * the card carry its markup once (the HTML is still rendered on the server).
 */
export function BookingCardView({ online, directPrice, morning: [lead, rest], bookPath, whatsapp, email, platforms }: BookingCardWords) {
  // "Your first morning: breakfast from 08:00.", its lead set off like a label.
  const morning = (
    <p className={styles.morning}>
      <strong>{lead}:</strong> {rest}
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
                    <Form className={styles.form} action={bookPath} aria-labelledby="booking-card-title">
                      <h2 id="booking-card-title" className={styles.title}>
                        Find a bed for your dates.
                      </h2>
                      <p className={styles.text}>
                        See which beds are free on your dates and book directly with the house: pay when you arrive, or
                        online where your booking offers it. {directPrice}
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
                        {directPrice} Choose your dates and send them to the team on WhatsApp or by email.
                      </p>
                      {morning}
                      <DirectRequest whatsapp={whatsapp} email={email} />
                    </div>
                  )}
                </div>
                <div className={styles.stub}>
                  <ShadowWriting still className={styles.clipboard} />
                  <p className={styles.stubTitle}>Also on</p>
                  <p className={styles.stubText}>The house is on the booking sites too, with live prices.</p>
                  <ul role="list" className={styles.platforms}>
                    {platforms.map((platform) => (
                      <li key={platform.platform}>
                        <a href={platform.url} target="_blank" rel="noopener noreferrer" className={styles.platform}>
                          {platform.mark ? <BrandMark mark={platform.mark} className={styles.platformMark} /> : null}
                          {/* The words in a line box of their own, so the underline's thread follows them onto a second line. */}
                          <span>
                            <span>See prices on {platform.platform}</span>
                          </span>
                          <ExternalIcon />
                          <span className="visually-hidden"> (opens in a new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className={styles.more}>
                    Rather call or write?{" "}
                    <Link href={bookPath} transitionTypes={["nav-forward"]}>
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
