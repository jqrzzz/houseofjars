"use client";

import { useSearchParams } from "next/navigation";
import { useId, useState, useSyncExternalStore } from "react";
import { DIRECT_GUESTS, DIRECT_NIGHTS, directLinks, directStayFromLink, type DirectContact, type DirectStay } from "@/lib/booking/direct";
import { stayRailForNights, type RailTimes } from "@/lib/booking/stay-rail";
import { houseToday, isIsoDate } from "@/lib/dates";
import buttons from "../ui/button.module.css";
import { MailIcon, WhatsAppIcon } from "../ui/icons";
import styles from "./DirectRequest.module.css";
import { MiniRail } from "./MiniRail";

const subscribeNothing = () => () => {};
const nightOptions = Array.from({ length: DIRECT_NIGHTS }, (_, index) => index + 1);
const guestOptions = Array.from({ length: DIRECT_GUESTS }, (_, index) => index + 1);

interface DirectRequestProps extends DirectContact {
  className?: string;
  /** The house's times (content/stay): with them, the stay's rail appears once a date is chosen (/book). */
  rail?: RailTimes;
}

/**
 * Booking direct before the site takes bookings online: the guest chooses
 * check-in, nights and guests, and the two buttons open their own WhatsApp
 * or mail app with the request written out (lib/booking/direct.ts). They are
 * ordinary links, so they work without JavaScript too, just without the
 * dates. A /book link fills the stay in (an assistant's, the booking card's,
 * or one followed inside the site without a reload). The team replies there;
 * nothing is sent or booked by the site. On /book, once a date is chosen,
 * the stay's rail (check-in, breakfast, check-out) sits above the buttons.
 */
export function DirectRequest(props: DirectRequestProps) {
  // The page is static: the link's query string is read only in the browser.
  const inBrowser = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return inBrowser ? <LinkedRequest {...props} /> : <Request {...props} search="" />;
}

/** In the browser: the stay the page's link asks for. A new link starts the form afresh from its stay. */
function LinkedRequest(props: DirectRequestProps) {
  const search = useSearchParams().toString();
  return <Request key={search} {...props} search={search} />;
}

function Request({ whatsapp, email, className, rail, search }: DirectRequestProps & { search: string }) {
  const id = useId();
  // The guest's own choices go on top of the link's.
  const [chosen, setChosen] = useState<Partial<DirectStay>>({});
  const stay: DirectStay = { ...directStayFromLink(search), ...chosen };
  const choose = (change: Partial<DirectStay>) => setChosen((previous) => ({ ...previous, ...change }));
  // Dates in the past make no sense: the floor, once the browser knows today's date at the house.
  const floor = useSyncExternalStore(subscribeNothing, houseToday, () => undefined);
  const links = directLinks(stay, { whatsapp, email });
  const shown = rail ? stayRailForNights(stay.checkIn, stay.nights, rail, { today: floor }) : null;

  return (
    <div className={[styles.request, className].filter(Boolean).join(" ")}>
      <div className={styles.fields} role="group" aria-label="Your stay">
        <label className={`${styles.field} ${styles.date}`} htmlFor={`${id}-check-in`}>
          <span>Check-in</span>
          <input
            id={`${id}-check-in`}
            type="date"
            min={floor}
            value={stay.checkIn ?? ""}
            onChange={(event) => choose({ checkIn: isIsoDate(event.target.value) ? event.target.value : null })}
          />
        </label>
        <label className={styles.field} htmlFor={`${id}-nights`}>
          <span>Nights</span>
          <select id={`${id}-nights`} value={stay.nights} onChange={(event) => choose({ nights: Number(event.target.value) })}>
            {nightOptions.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field} htmlFor={`${id}-guests`}>
          <span>Guests</span>
          <select id={`${id}-guests`} value={stay.guests} onChange={(event) => choose({ guests: Number(event.target.value) })}>
            {guestOptions.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
      </div>
      {shown ? <MiniRail rail={shown} /> : null}
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
      <p className={styles.note}>Your dates open in WhatsApp or your mail app, written out and ready to send. The team replies there.</p>
    </div>
  );
}
