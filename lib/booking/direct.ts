import { addDays, formatDay, isIsoDate, nightsBetween } from "../dates";
import { inquiryPrefill, MAX_PREFILL_NIGHTS } from "../inquiry/prefill";
import { MAX_GUESTS } from "./types";

/*
 * Booking direct before the site takes bookings online: the stay a guest
 * chose, written out as a message to the team, ready to send from their own
 * WhatsApp or mail app. The site sends nothing, and a message books nothing:
 * the team replies with what is free. Pure and browser-safe (the booking
 * card's form runs it as the guest chooses).
 */

/** The most nights and guests the form offers: as many as a /book link may ask for. */
export const DIRECT_NIGHTS = MAX_PREFILL_NIGHTS;
export const DIRECT_GUESTS = MAX_GUESTS;

export interface DirectStay {
  /** YYYY-MM-DD, or null until the guest chooses. */
  checkIn: string | null;
  nights: number;
  guests: number;
}

/** Where the message goes: the house's WhatsApp link (wa.me) and email address. */
export interface DirectContact {
  whatsapp: string;
  email: string;
}

/** Longer than any stay worth writing out; the form itself offers up to DIRECT_NIGHTS. */
const MAX_NIGHTS = 365;

const count = (value: number, max: number) => (Number.isInteger(value) && value >= 1 ? Math.min(value, max) : 1);

function stayOf(stay: DirectStay) {
  const nights = count(stay.nights, MAX_NIGHTS);
  const guests = count(stay.guests, DIRECT_GUESTS);
  const checkIn = isIsoDate(stay.checkIn) ? stay.checkIn : null;
  return { nights, guests, checkIn, nightsText: `${nights} ${nights === 1 ? "night" : "nights"}` };
}

/**
 * The stay a /book link asks for (lib/inquiry/prefill.ts: the booking card's
 * check_in, nights and guests, or an assistant's check_in, check_out and
 * guests), else two nights for one guest with no date yet.
 */
export function directStayFromLink(search: string, now = Date.now()): DirectStay {
  const prefill = inquiryPrefill(search, now);
  const nights = prefill.check_in && prefill.check_out ? nightsBetween(prefill.check_in, prefill.check_out) : 2;
  return {
    checkIn: prefill.check_in ?? null,
    nights: Math.min(Math.max(nights, 1), DIRECT_NIGHTS),
    guests: Math.min(prefill.guests ?? 1, DIRECT_GUESTS),
  };
}

/** "Hello House of Jars! I would like to book 2 beds from Friday 9 October 2026 to Sunday 11 October 2026 (2 nights). Do you have space?" */
export function directRequestText(stay: DirectStay): string {
  const { nights, guests, checkIn, nightsText } = stayOf(stay);
  const beds = guests === 1 ? "a bed" : `${guests} beds`;
  const when = checkIn
    ? `from ${formatDay(checkIn, "long")} to ${formatDay(addDays(checkIn, nights), "long")} (${nightsText})`
    : `for ${nightsText}`;
  return `Hello House of Jars! I would like to book ${beds} ${when}. Do you have space?`;
}

/** The email's subject: "Booking request: Fri 9 Oct, 2 nights, 2 guests". */
export function directRequestSubject(stay: DirectStay): string {
  const { guests, checkIn, nightsText } = stayOf(stay);
  const guestsText = `${guests} ${guests === 1 ? "guest" : "guests"}`;
  return `Booking request: ${checkIn ? `${formatDay(checkIn)}, ` : ""}${nightsText}, ${guestsText}`;
}

/** The two ways to send it: WhatsApp with the message written, and an email with it as the body. */
export function directLinks(stay: DirectStay, contact: DirectContact): { whatsapp: string; email: string } {
  const text = encodeURIComponent(directRequestText(stay));
  return {
    whatsapp: `${contact.whatsapp}?text=${text}`,
    // encodeURIComponent writes spaces as %20, which every mail app reads (URLSearchParams's "+" shows up as a plus in some).
    email: `mailto:${contact.email}?subject=${encodeURIComponent(directRequestSubject(stay))}&body=${text}`,
  };
}
