import type { ContactMethod } from "../inquiry/reply";

/*
 * Online booking (docs/BOOKING_API.md): what the website's own routes,
 * /api/availability and /api/booking, send to the booking form. The shapes
 * follow Shadow Check-in's booking contract, minus anything the page doesn't
 * need. Browser-safe and free of zod.
 */

export const ROOM_KINDS = ["mixed_dorm", "female_dorm", "male_dorm", "private"] as const;
export type RoomKind = (typeof ROOM_KINDS)[number];

export const CURRENCIES = ["LAK", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface NightFree {
  readonly date: string;
  readonly free: number;
}

export interface Price {
  readonly currency: Currency;
  /** Each night's rate per guest; for a room priced as a whole, its price shared among the guests. */
  readonly per_guest_per_night: readonly { readonly date: string; readonly amount: number }[];
  /** A private room priced as a whole, however many guests it sleeps: the room's price each night. */
  readonly per_room_per_night?: readonly { readonly date: string; readonly amount: number }[];
  /** For every guest and night together (exact, even when shared per guest). */
  readonly total: number;
}

export interface RoomType {
  readonly id: string;
  readonly name: string;
  /** Null when Shadow sends a kind this website doesn't know yet. */
  readonly kind: RoomKind | null;
  readonly description: string | null;
  readonly features: readonly string[];
  readonly free_each_night: readonly NightFree[];
  readonly min_free: number;
  /** Enough beds free every night, within the house's limits and booking window. */
  readonly bookable: boolean;
  /** Null until the house sets a rate: the team then confirms the price. */
  readonly price: Price | null;
}

export interface BookingLimits {
  readonly max_guests: number;
  readonly min_nights: number;
  readonly max_nights: number;
  /** How many days ahead the house takes bookings. */
  readonly window_days: number;
}

/** "request": the team confirms each booking; "instant": booked straight away. */
export type BookingMode = "request" | "instant";

export interface Availability {
  readonly check_in: string;
  readonly check_out: string;
  readonly nights: number;
  readonly guests: number;
  readonly mode: BookingMode;
  /** How long a request holds its beds while the team confirms it. */
  readonly hold_hours: number | null;
  readonly limits: BookingLimits;
  readonly room_types: readonly RoomType[];
}

/** The total a guest saw for their stay: null when the page said the team confirms the price. */
export interface Quote {
  readonly total: number | null;
  readonly currency: Currency | null;
}

/** The body of POST /api/booking: exactly the body Shadow receives. */
export interface BookingRequest {
  readonly client_ref: string;
  readonly room_type_id: string;
  readonly check_in: string;
  readonly check_out: string;
  readonly guests: number;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly preferred_contact: ContactMethod | null;
  readonly arrival_time: string | null;
  readonly message: string | null;
  readonly consent: true;
  /**
   * The total the guest saw (the contract's price protection): Shadow books
   * nothing and answers 409 price_changed if its own total differs. Both or
   * neither; a page from before the protection sends neither.
   */
  readonly quoted_total?: number | null;
  readonly quoted_currency?: Currency | null;
}

/** What POST /api/booking answers with 201 (or 200 when the booking was already received). */
export interface BookingConfirmation {
  readonly reference: string;
  readonly status: "pending" | "confirmed";
  readonly hold_expires_at: string | null;
  readonly total: number | null;
  readonly currency: Currency | null;
}

export interface FieldIssue {
  readonly field: string;
  readonly message: string;
}

/**
 * Why a request to the website's booking routes failed:
 * - invalid: the request needs changing (issues say what);
 * - rate_limited: this guest sent many requests in a short time;
 * - busy: the line to Shadow Check-in is busy (never the guest's fault);
 * - not_configured: online booking is not open;
 * - unavailable: Shadow Check-in could not be reached;
 * - taken (bookings only): the beds went while the guest was booking;
 * - price_changed (bookings only): the total isn't the one the guest saw, so nothing was booked.
 */
export type BookingProblem =
  | "invalid"
  | "rate_limited"
  | "busy"
  | "not_configured"
  | "unavailable"
  | "taken"
  | "price_changed";

/** The website's own limits, whatever the house sets: a sanity bound on what is sent to Shadow. */
export const MAX_GUESTS = 20;
export const MAX_STAY_NIGHTS = 365;
export const MAX_NAME = 120;
export const MAX_MESSAGE = 2000;
export const PHONE_LENGTH = { min: 5, max: 40 } as const;
/** "HH:MM", 00:00 to 23:59. */
export const ARRIVAL_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
