"use client";

import Link from "next/link";
import { useId } from "react";
import { nightsText } from "@/lib/booking/calendar";
import { freeBedsText, kindLabel } from "@/lib/booking/flow";
import { bookingLinkFor } from "@/lib/concierge/chat";
import type { AvailabilityCard as Card } from "@/lib/concierge/protocol";
import { formatDay } from "@/lib/dates";
import buttons from "../ui/button.module.css";
import { ArrowIcon } from "../ui/icons";
import styles from "./ConciergePanel.module.css";

/**
 * Free beds Shadow looked up, exactly as the server read them from Shadow
 * Check-in (never from his words), with a link that opens /book at those
 * dates. Free now is not held for the guest: the note says so.
 */
export function AvailabilityCard({ card, onNavigate }: { card: Card; onNavigate: () => void }) {
  const titleId = useId();
  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.cardTitle}>
        Free beds for your dates
      </h3>
      <dl className={styles.cardDetails}>
        <div>
          <dt>Dates</dt>
          <dd className={`${styles.lines} tnum`}>
            <span>
              {formatDay(card.check_in)} to {formatDay(card.check_out)}
            </span>{" "}
            <span className={styles.soft}>{nightsText(card.nights)}</span>
          </dd>
        </div>
        <div>
          <dt>Guests</dt>
          <dd className="tnum">{card.guests}</dd>
        </div>
        <div>
          <dt>Beds</dt>
          <dd>
            <ul role="list" className={styles.freeRooms}>
              {card.rooms.map((room, index) => {
                const kind = kindLabel(room);
                return (
                  <li key={index} className={styles.lines}>
                    <span className={styles.roomName}>
                      {room.name}
                      {kind ? ` (${kind})` : null}
                    </span>{" "}
                    <span className={styles.soft}>{freeBedsText({ min_free: room.free }, card.nights)}</span>
                  </li>
                );
              })}
            </ul>
          </dd>
        </div>
      </dl>
      <Link
        href={bookingLinkFor(card)}
        onClick={onNavigate}
        className={`${buttons.button} ${buttons.primary} ${buttons.small} ${styles.bookLink}`}
      >
        Book these dates
        <ArrowIcon />
      </Link>
      <p className={styles.soft}>Free when Shadow checked. Nothing is held for you until you send a booking request.</p>
    </section>
  );
}
