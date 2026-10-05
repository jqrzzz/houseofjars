"use client";

import { useSearchParams } from "next/navigation";
import { useId, useState, useSyncExternalStore } from "react";
import { houseToday, isIsoDate } from "@/lib/dates";
import {
  MAX_TRAVELLERS,
  TRIP_KINDS,
  TRIP_LABELS,
  TRIP_SUGGESTIONS,
  tripFromLink,
  tripLinks,
  tripRequestText,
  type TripRequest as Trip,
} from "@/lib/trips/request";
import buttons from "../ui/button.module.css";
import { HouseIcon } from "../ui/HouseIcon";
import { MailIcon, WhatsAppIcon } from "../ui/icons";
import styles from "./TripRequest.module.css";

const subscribeNothing = () => () => {};
const peopleOptions = Array.from({ length: MAX_TRAVELLERS }, (_, index) => index + 1);

interface TripRequestProps {
  /** The house's WhatsApp link (wa.me) and email address. */
  whatsapp: string;
  email: string;
}

/**
 * Asking the team to book a train, a bus or a tour: the guest chooses what,
 * where, when and for how many, sees the message, and the two buttons open
 * their own WhatsApp or mail app with it written out (lib/trips/request.ts).
 * A /trips link can choose the kind and the place (?kind=bus&to=Pakse). The
 * site sends and books nothing; the team replies with the times and the price.
 */
export function TripRequest(props: TripRequestProps) {
  // The page is static: the link's query string is read only in the browser.
  const inBrowser = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return inBrowser ? <LinkedRequest {...props} /> : <Request {...props} search="" />;
}

function LinkedRequest(props: TripRequestProps) {
  const search = useSearchParams().toString();
  return <Request key={search} {...props} search={search} />;
}

function Request({ whatsapp, email, search }: TripRequestProps & { search: string }) {
  const id = useId();
  const [chosen, setChosen] = useState<Partial<Trip>>({});
  const trip: Trip = { ...tripFromLink(search), ...chosen };
  const choose = (change: Partial<Trip>) => setChosen((previous) => ({ ...previous, ...change }));
  const floor = useSyncExternalStore(subscribeNothing, houseToday, () => undefined);
  const links = tripLinks(trip, { whatsapp, email });
  const suggestions = TRIP_SUGGESTIONS[trip.kind];

  return (
    <div className={styles.request}>
      <fieldset className={styles.kinds}>
        <legend className="visually-hidden">What should the team book?</legend>
        {TRIP_KINDS.map((kind) => (
          <label key={kind} className={styles.kind}>
            <input
              type="radio"
              name={`${id}-kind`}
              value={kind}
              checked={trip.kind === kind}
              onChange={() => choose({ kind, where: kind === trip.kind ? trip.where : "" })}
            />
            <HouseIcon name={kind} className={styles.kindIcon} />
            <span>{TRIP_LABELS[kind]}</span>
          </label>
        ))}
      </fieldset>

      <div className={styles.fields}>
        <label className={`${styles.field} ${styles.wide}`} htmlFor={`${id}-where`}>
          <span>{trip.kind === "tour" ? "Which tour?" : "Where to?"}</span>
          <input
            id={`${id}-where`}
            type="text"
            autoComplete="off"
            maxLength={140}
            list={suggestions.length > 0 ? `${id}-places` : undefined}
            placeholder={trip.kind === "tour" ? "For example, Buddha Park" : "For example, Luang Prabang"}
            value={trip.where}
            onChange={(event) => choose({ where: event.target.value })}
          />
          {suggestions.length > 0 ? (
            <datalist id={`${id}-places`}>
              {suggestions.map((place) => (
                <option key={place} value={place} />
              ))}
            </datalist>
          ) : null}
        </label>
        <label className={styles.field} htmlFor={`${id}-date`}>
          <span>Date</span>
          <input
            id={`${id}-date`}
            type="date"
            min={floor}
            value={trip.date ?? ""}
            onChange={(event) => choose({ date: isIsoDate(event.target.value) ? event.target.value : null })}
          />
        </label>
        <label className={styles.field} htmlFor={`${id}-people`}>
          <span>People</span>
          <select id={`${id}-people`} value={trip.people} onChange={(event) => choose({ people: Number(event.target.value) })}>
            {peopleOptions.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
        <label className={`${styles.field} ${styles.wide}`} htmlFor={`${id}-note`}>
          <span>Anything else? (optional)</span>
          <input
            id={`${id}-note`}
            type="text"
            autoComplete="off"
            maxLength={140}
            placeholder={trip.kind === "tour" ? "For example, a half day" : "For example, a morning departure"}
            value={trip.note}
            onChange={(event) => choose({ note: event.target.value })}
          />
        </label>
      </div>

      <figure className={styles.preview}>
        <figcaption>Your message</figcaption>
        <blockquote aria-live="polite">{tripRequestText(trip)}</blockquote>
      </figure>

      <div className={styles.actions}>
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={`${buttons.button} ${buttons.primary}`}>
          <WhatsAppIcon />
          Send on WhatsApp
          <span className="visually-hidden"> (opens WhatsApp in a new tab)</span>
        </a>
        <a href={links.email} className={`${buttons.button} ${buttons.secondary}`}>
          <MailIcon />
          Send by email
        </a>
      </div>
      <p className={styles.note}>It opens in WhatsApp or your mail app, ready to send. The team replies with the times and the price.</p>
    </div>
  );
}
