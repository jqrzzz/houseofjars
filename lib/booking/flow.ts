import { formatDay, nightsBetween } from "../dates";
import type { ContactMethod } from "../inquiry/reply";
import { nightsText } from "./calendar";
import { guestText } from "./text";
import {
  ARRIVAL_TIME,
  MAX_MESSAGE,
  MAX_NAME,
  PHONE_LENGTH,
  type Availability,
  type BookingConfirmation,
  type BookingProblem,
  type BookingRequest,
  type Currency,
  type FieldIssue,
  type Price,
  type RoomKind,
  type RoomType,
} from "./types";

/*
 * The booking form's logic, apart from React: talking to the website's own
 * routes, wording rooms and prices, checking the guest's details, and which
 * step a problem belongs to. Browser-safe and free of zod.
 */

export type Step = "dates" | "rooms" | "details" | "review" | "done";

export const STEPS: readonly { readonly id: Exclude<Step, "done">; readonly label: string }[] = [
  { id: "dates", label: "Dates" },
  { id: "rooms", label: "Beds" },
  { id: "details", label: "Your details" },
  { id: "review", label: "Check and send" },
];

export interface Stay {
  readonly check_in: string;
  readonly check_out: string;
  readonly guests: number;
}

export type Outcome<T> =
  | ({ readonly ok: true } & T)
  | { readonly ok: false; readonly problem: BookingProblem; readonly issues: readonly FieldIssue[] };

async function problemFrom(response: Response): Promise<Outcome<never>> {
  const body = (await response.json().catch(() => null)) as { error?: unknown; issues?: unknown } | null;
  const issues = Array.isArray(body?.issues) ? (body.issues as FieldIssue[]) : [];
  const problem: BookingProblem =
    response.status === 400
      ? "invalid"
      : response.status === 409
        ? "taken"
        : response.status === 429
          ? "rate_limited"
          : response.status === 503
            ? body?.error === "busy"
              ? "busy"
              : "not_configured"
            : "unavailable";
  return { ok: false, problem, issues };
}

/** GET /api/availability. Never throws: a network failure is "unavailable". */
export async function fetchAvailability(stay: Stay, signal?: AbortSignal): Promise<Outcome<{ availability: Availability }>> {
  const query = new URLSearchParams({ check_in: stay.check_in, check_out: stay.check_out, guests: String(stay.guests) });
  try {
    const response = await fetch(`/api/availability?${query}`, { signal });
    if (response.ok) return { ok: true, availability: (await response.json()) as Availability };
    return await problemFrom(response);
  } catch {
    return { ok: false, problem: "unavailable", issues: [] };
  }
}

/** POST /api/booking. Never throws: a network failure is "unavailable" (and the same client_ref is safe to resend). */
export async function postBooking(body: BookingRequest): Promise<Outcome<{ confirmation: BookingConfirmation }>> {
  try {
    const response = await fetch("/api/booking", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return { ok: true, confirmation: (await response.json()) as BookingConfirmation };
    return await problemFrom(response);
  } catch {
    return { ok: false, problem: "unavailable", issues: [] };
  }
}

const KIND_LABELS: Readonly<Record<RoomKind, string>> = {
  mixed_dorm: "Mixed dorm",
  female_dorm: "Female dorm",
  male_dorm: "Male dorm",
  private: "Private room",
};

/** The kind of room, when it adds something to the room's own name. */
export function kindLabel(room: Pick<RoomType, "kind" | "name">): string | null {
  const label = room.kind ? KIND_LABELS[room.kind] : null;
  return label && label.toLowerCase() !== room.name.trim().toLowerCase() ? label : null;
}

/** "360,000", "18", "18.50": kip in whole numbers, dollars with cents when there are any. */
function formatAmount(amount: number, currency: Currency, cents = currency === "USD" && !Number.isInteger(amount)): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(amount);
}

/** "LAK 360,000", "USD 18", "USD 18.50": the code first (and a no-break space), as receipts write them. */
export function formatMoney(amount: number, currency: Currency): string {
  return `${currency}\u00a0${formatAmount(amount, currency)}`;
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export interface PriceLines {
  /** "LAK 90,000", or "LAK 90,000 to 100,000" when nights differ. */
  readonly perNight: string;
  readonly total: string;
  /** "2 guests, 2 nights" */
  readonly totalFor: string;
}

export function priceLines(price: Price, stay: Stay): PriceLines {
  const amounts = price.per_guest_per_night.map((night) => night.amount);
  const [low, high] = [Math.min(...amounts), Math.max(...amounts)];
  // Both ends of a range in cents if either has them.
  const cents = price.currency === "USD" && !(Number.isInteger(low) && Number.isInteger(high));
  const perNight =
    amounts.length === 0 || low === high
      ? formatMoney(amounts[0] ?? 0, price.currency)
      : `${price.currency}\u00a0${formatAmount(low, price.currency, cents)} to ${formatAmount(high, price.currency, cents)}`;
  return {
    perNight,
    total: formatMoney(price.total, price.currency),
    totalFor: `${plural(stay.guests, "guest")}, ${nightsText(nightsBetween(stay.check_in, stay.check_out))}`,
  };
}

/** Free beds for the stay: "4 beds free every night". */
export function freeBedsText(room: RoomType, nights: number): string {
  const beds = plural(room.min_free, "bed");
  return nights === 1 ? `${beds} free that night` : `${beds} free every night`;
}

/** Why a room can't be booked for this stay, from Shadow's own counts. Null when it can. */
export function unavailableText(room: RoomType, guests: number): string | null {
  if (room.bookable) return null;
  const short = room.free_each_night.filter((night) => night.free < guests);
  const first = short[0];
  if (!first) return "Not open for online booking on these dates.";
  const night = formatDay(first.date);
  const text = first.free === 0 ? `Full on ${night}` : `Only ${plural(first.free, "bed")} free on ${night}`;
  return short.length > 1 ? `${text}, and on ${plural(short.length - 1, "more night")}.` : `${text}.`;
}

export interface GuestDetails {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly preferred_contact: ContactMethod | "";
  readonly arrival_time: string;
  readonly message: string;
  readonly consent: boolean;
}

export type DetailsField = keyof GuestDetails;

export const EMPTY_DETAILS: GuestDetails = {
  name: "",
  email: "",
  phone: "",
  preferred_contact: "",
  arrival_time: "",
  message: "",
  consent: false,
};

/** The fields in the order the form shows them, for the error summary. */
export const DETAILS_FIELDS: readonly DetailsField[] = [
  "name",
  "email",
  "phone",
  "preferred_contact",
  "arrival_time",
  "message",
  "consent",
];

/**
 * The form's own checks before the review step, in the same words as the
 * server's (which checks again, strictly).
 */
export function checkDetails(details: GuestDetails): Partial<Record<DetailsField, string>> {
  const errors: Partial<Record<DetailsField, string>> = {};
  const [name, email, phone] = [details.name.trim(), details.email.trim(), details.phone.trim()];
  if (!name) errors.name = guestText.name;
  else if (name.length > MAX_NAME) errors.name = guestText.nameLong;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = guestText.email;
  if (phone && (phone.length < PHONE_LENGTH.min || phone.length > PHONE_LENGTH.max)) errors.phone = guestText.phone;
  if (!email && !phone) errors.email = guestText.contact;
  if (details.preferred_contact === "email" && !email && !errors.email) {
    errors.preferred_contact = "You chose email: please give an email address.";
  }
  if ((details.preferred_contact === "whatsapp" || details.preferred_contact === "phone") && !phone && !errors.email) {
    errors.preferred_contact = "Please give the number the team should use.";
  }
  if (details.arrival_time && !ARRIVAL_TIME.test(details.arrival_time)) errors.arrival_time = guestText.arrival;
  if (details.message.trim().length > MAX_MESSAGE) errors.message = guestText.message;
  if (!details.consent) errors.consent = guestText.consent;
  return errors;
}

/** The request body, in the contract's order; blank optional fields are null. */
export function bookingBody(clientRef: string, stay: Stay, roomTypeId: string, details: GuestDetails): BookingRequest {
  const blank = (value: string) => value.trim() || null;
  return {
    client_ref: clientRef,
    room_type_id: roomTypeId,
    check_in: stay.check_in,
    check_out: stay.check_out,
    guests: stay.guests,
    name: details.name.trim(),
    email: blank(details.email),
    phone: blank(details.phone),
    preferred_contact: details.preferred_contact || null,
    arrival_time: blank(details.arrival_time),
    message: blank(details.message),
    consent: true,
  };
}

/** What makes two requests the same booking: everything but the client_ref. */
export function requestSignature(request: BookingRequest): string {
  return JSON.stringify({ ...request, client_ref: null });
}

/**
 * One client_ref per distinct request: sending exactly the same booking
 * again (after a failure whose outcome is unknown) reuses it, so Shadow
 * answers with the booking it may already have; any change gets a new one.
 */
export function clientRefFor(
  previous: { readonly signature: string; readonly ref: string } | null,
  request: BookingRequest,
  newRef: () => string,
): { signature: string; ref: string } {
  const signature = requestSignature(request);
  return previous?.signature === signature ? previous : { signature, ref: newRef() };
}

const STEP_OF: Readonly<Record<string, Step>> = {
  check_in: "dates",
  check_out: "dates",
  guests: "dates",
  room_type_id: "rooms",
  ...Object.fromEntries(DETAILS_FIELDS.map((field) => [field, "details"])),
};

/** The earliest step that can fix these issues (the review, if none can be placed). */
export function stepForIssues(issues: readonly FieldIssue[]): Step {
  const order: Step[] = ["dates", "rooms", "details"];
  return order.find((step) => issues.some((issue) => STEP_OF[issue.field] === step)) ?? "review";
}

/** A finished booking as the confirmation shows it; kept for the tab, without the guest's contact details. */
export interface SavedBooking {
  readonly confirmation: BookingConfirmation;
  readonly stay: Stay;
  readonly roomName: string;
  /** "by email", "on WhatsApp"... */
  readonly replyBy: string;
  readonly arrival: string | null;
  /** The price the guest saw, when it differs from the one Shadow booked. */
  readonly shownTotal: string | null;
}

const SAVED_KEY = "houseofjars.booking";

export function saveBooking(saved: SavedBooking): void {
  try {
    sessionStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  } catch {
    // Storage blocked: the confirmation is still on screen.
  }
}

export function loadBooking(): SavedBooking | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVED_KEY) ?? "null") as Partial<SavedBooking> | null;
    // Only what this page saved, in the shape it saves now; anything else is forgotten.
    const whole =
      typeof saved?.confirmation?.reference === "string" &&
      typeof saved.confirmation.status === "string" &&
      typeof saved.stay?.check_in === "string" &&
      typeof saved.stay.check_out === "string" &&
      typeof saved.stay.guests === "number" &&
      typeof saved.roomName === "string" &&
      typeof saved.replyBy === "string";
    return whole ? (saved as SavedBooking) : null;
  } catch {
    return null;
  }
}

export function forgetBooking(): void {
  try {
    sessionStorage.removeItem(SAVED_KEY);
  } catch {
    // Nothing to forget.
  }
}
