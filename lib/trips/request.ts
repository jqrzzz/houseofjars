import { formatDay, isIsoDate } from "../dates";

/*
 * Asking the team to book a train, a bus or a tour: what the guest chose,
 * written out as a message to the team and ready to send from their own
 * WhatsApp or mail app, the way booking direct works (lib/booking/direct.ts).
 * The site sends nothing and books nothing: the team replies with the times
 * and the price. Pure and browser-safe (the /trips form runs it as the
 * guest chooses).
 */

export const TRIP_KINDS = ["train", "bus", "tour"] as const;
export type TripKind = (typeof TRIP_KINDS)[number];

export const TRIP_LABELS: Readonly<Record<TripKind, string>> = { train: "Train", bus: "Bus or minivan", tour: "Tour" };

/** The most travellers the form offers. */
export const MAX_TRAVELLERS = 12;
/** Longer than any destination, tour name or note worth writing out. */
const MAX_TEXT = 140;

export interface TripRequest {
  kind: TripKind;
  /** Where to, or which tour: free text, may be empty. */
  where: string;
  /** YYYY-MM-DD, or null while the date is open. */
  date: string | null;
  people: number;
  note: string;
}

/** Places guests often ask for, as suggestions under "Where to?" (the guest may type anything). */
export const TRIP_SUGGESTIONS: Readonly<Record<TripKind, readonly string[]>> = {
  train: ["Vang Vieng", "Luang Prabang", "Kunming, China"],
  bus: ["Vang Vieng", "Luang Prabang", "Phonsavan", "Thakhek", "Pakse", "Nong Khai, Thailand", "Udon Thani, Thailand"],
  tour: [],
};

const tidy = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
const peopleOf = (people: number) => (Number.isInteger(people) && people >= 1 ? Math.min(people, MAX_TRAVELLERS) : 1);
const isKind = (value: string | null): value is TripKind => TRIP_KINDS.includes(value as TripKind);

/** The trip a /trips link asks for (?kind=train&to=Luang+Prabang), else a train with nothing filled in. */
export function tripFromLink(search: string): TripRequest {
  const params = new URLSearchParams(search);
  const kind = params.get("kind");
  return { kind: isKind(kind) ? kind : "train", where: tidy(params.get("to") ?? ""), date: null, people: 1, note: "" };
}

function parts(trip: TripRequest) {
  const people = peopleOf(trip.people);
  const where = tidy(trip.where);
  const when = isIsoDate(trip.date) ? formatDay(trip.date, "long") : null;
  return { people, where, when, note: tidy(trip.note), who: `${people} ${people === 1 ? "person" : "people"}` };
}

/** "a train ticket" for one person, "bus tickets" for more. */
function tickets(kind: TripKind, people: number): string {
  const what = kind === "train" ? "train" : "bus";
  return people === 1 ? `a ${what} ticket` : `${what} tickets`;
}

/** "Hello House of Jars! Could you book train tickets to Luang Prabang for 2 people on Friday 9 October 2026? …" */
export function tripRequestText(trip: TripRequest): string {
  const { where, when, note, who } = parts(trip);
  const on = when ? ` on ${when}` : "";
  const ask =
    trip.kind === "tour"
      ? `Could you book a tour${where ? ` (${where})` : ""} for ${who}${on}? What are the options and the price?`
      : `Could you book ${tickets(trip.kind, parts(trip).people)}${where ? ` to ${where}` : ""}${parts(trip).people === 1 ? "" : ` for ${who}`}${on}? What are the times and the price?`;
  return [`Hello House of Jars! ${ask}`, ...(when ? [] : ["My date is still open."]), ...(note ? [`Note: ${note}`] : [])].join(" ");
}

/** The email's subject: "Trip request: train to Luang Prabang, Fri 9 Oct, 2 people". */
export function tripRequestSubject(trip: TripRequest): string {
  const { where, who } = parts(trip);
  const what = trip.kind === "tour" ? `tour${where ? `: ${where}` : ""}` : `${trip.kind}${where ? ` to ${where}` : ""}`;
  const date = isIsoDate(trip.date) ? `, ${formatDay(trip.date)}` : "";
  return `Trip request: ${what}${date}, ${who}`;
}

/** The two ways to send it: WhatsApp with the message written, and an email with it as the body. */
export function tripLinks(trip: TripRequest, contact: { whatsapp: string; email: string }): { whatsapp: string; email: string } {
  const text = encodeURIComponent(tripRequestText(trip));
  return {
    whatsapp: `${contact.whatsapp}?text=${text}`,
    email: `mailto:${contact.email}?subject=${encodeURIComponent(tripRequestSubject(trip))}&body=${text}`,
  };
}
