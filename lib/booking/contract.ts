import { z } from "zod";
import { addDays, houseToday, isIsoDate, nightsBetween } from "../dates";
import { MAX_DAYS_AHEAD } from "../inquiry/dates";
import { CONTACT_METHODS } from "../inquiry/reply";
import { toFieldIssues } from "../inquiry/schema";
import { guestText } from "./text";
import {
  ARRIVAL_TIME,
  CURRENCIES,
  MAX_GUESTS,
  MAX_MESSAGE,
  MAX_NAME,
  MAX_STAY_NIGHTS,
  PHONE_LENGTH,
  ROOM_KINDS,
  type Availability,
  type BookingConfirmation,
  type BookingRequest,
  type FieldIssue,
  type Quote,
  type RoomKind,
} from "./types";

/*
 * Shadow Check-in's booking contract (docs/BOOKING_API.md), server side:
 *  - parseAvailabilityQuery: the dates and guests of GET /api/availability;
 *  - availabilitySchema: Shadow's 200 answer to GET /api/public/availability;
 *  - bookingRequestSchema: the body of POST /api/booking, which is exactly
 *    the body POSTed to Shadow's /api/public/booking-requests;
 *  - bookingCreatedSchema: Shadow's 201 (or 200) answer to it, and
 *    priceChangedSchema its 409 when the total isn't the one the guest saw.
 * What the website sends is strict. Shadow's answers may carry fields the
 * website doesn't use yet; those are dropped.
 */

export const MAX_BOOKING_BYTES = 16 * 1024;

export { guestText } from "./text";

export interface AvailabilityQuery {
  readonly check_in: string;
  readonly check_out: string;
  readonly guests: number;
}

/** Problems with a stay's dates, as a guest would read them. */
function dateIssues(checkIn: string, checkOut: string, now: number): FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (!isIsoDate(checkIn)) issues.push({ field: "check_in", message: guestText.realDates });
  if (!isIsoDate(checkOut)) issues.push({ field: "check_out", message: guestText.realDates });
  if (issues.length > 0) return issues;

  const today = houseToday(now);
  if (checkIn < today) issues.push({ field: "check_in", message: guestText.fromToday });
  if (checkOut <= checkIn) issues.push({ field: "check_out", message: guestText.order });
  else if (nightsBetween(checkIn, checkOut) > MAX_STAY_NIGHTS) issues.push({ field: "check_out", message: guestText.tooLong });
  else if (checkOut > addDays(today, MAX_DAYS_AHEAD)) issues.push({ field: "check_out", message: guestText.tooFar });
  return issues;
}

/**
 * The query of GET /api/availability. The house's own limits (nights,
 * guests, how far ahead) are Shadow's to apply; these are the website's
 * sanity bounds, so nothing malformed reaches Shadow or the cache.
 */
export function parseAvailabilityQuery(
  params: URLSearchParams,
  now = Date.now(),
): { ok: true; query: AvailabilityQuery } | { ok: false; issues: FieldIssue[] } {
  const checkIn = params.get("check_in") ?? "";
  const checkOut = params.get("check_out") ?? "";
  const guestsText = params.get("guests") ?? "";
  const guests = /^\d{1,3}$/.test(guestsText) ? Number(guestsText) : NaN;

  const issues = dateIssues(checkIn, checkOut, now);
  if (!(guests >= 1 && guests <= MAX_GUESTS)) issues.push({ field: "guests", message: guestText.guests });
  return issues.length > 0 ? { ok: false, issues } : { ok: true, query: { check_in: checkIn, check_out: checkOut, guests } };
}

const isoDate = z.iso.date();
const count = z.number().int().min(0);

const priceSchema = z.object({
  currency: z.enum(CURRENCIES),
  per_guest_per_night: z.array(z.object({ date: isoDate, amount: z.number().nonnegative() })),
  total: z.number().nonnegative(),
});

const roomTypeSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  kind: z.string().transform((kind): RoomKind | null => (ROOM_KINDS.find((known) => known === kind) ?? null)),
  description: z
    .string()
    .trim()
    .nullish()
    .transform((text) => text || null),
  features: z.array(z.string()).transform((list) => list.map((feature) => feature.trim()).filter(Boolean)),
  free_each_night: z.array(z.object({ date: isoDate, free: count })),
  min_free: count,
  bookable: z.boolean(),
  price: priceSchema.nullable(),
});

const availabilitySchema = z.object({
  property: z.object({ name: z.string(), timezone: z.string() }),
  check_in: isoDate,
  check_out: isoDate,
  nights: z.number().int().positive(),
  guests: z.number().int().positive(),
  // Anything but "instant" is treated as a request the team confirms: the safer promise.
  mode: z.string().transform((mode) => (mode === "instant" ? "instant" : "request")),
  hold_hours: z
    .number()
    .positive()
    .nullish()
    .transform((hours) => hours ?? null),
  limits: z.object({
    max_guests: z.number().int().positive(),
    min_nights: z.number().int().positive(),
    max_nights: z.number().int().positive(),
    window_days: z.number().int().nonnegative(),
  }),
  room_types: z.array(roomTypeSchema),
});

/** Shadow's availability for exactly this query, without the parts the page doesn't use; null if it doesn't fit the contract. */
export function readAvailability(body: unknown, query: AvailabilityQuery): Availability | null {
  const parsed = availabilitySchema.safeParse(body);
  if (!parsed.success) return null;
  const { check_in, check_out, nights, guests, mode, hold_hours, limits, room_types } = parsed.data;
  const availability: Availability = { check_in, check_out, nights, guests, mode, hold_hours, limits, room_types };
  const echoed =
    availability.check_in === query.check_in &&
    availability.check_out === query.check_out &&
    availability.guests === query.guests &&
    availability.nights === nightsBetween(query.check_in, query.check_out);
  return echoed ? availability : null;
}

const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

/** Optional field: blank strings and missing keys become null. */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess(blankToNull, schema.nullish()).transform((value) => value ?? null);
}

const bookingRequestSchema = z
  .strictObject({
    client_ref: z.uuid(guestText.checkForm),
    room_type_id: z.uuid(guestText.roomRefused),
    check_in: z.string(guestText.realDates),
    check_out: z.string(guestText.realDates),
    guests: z.number(guestText.guests).int(guestText.guests).min(1, guestText.guests).max(MAX_GUESTS, guestText.guests),
    name: z.string(guestText.name).trim().min(1, guestText.name).max(MAX_NAME, guestText.nameLong),
    email: optional(z.string().trim().pipe(z.email(guestText.email))),
    phone: optional(z.string().trim().min(PHONE_LENGTH.min, guestText.phone).max(PHONE_LENGTH.max, guestText.phone)),
    preferred_contact: optional(z.enum(CONTACT_METHODS, guestText.preferred)),
    arrival_time: optional(z.string().trim().regex(ARRIVAL_TIME, guestText.arrival)),
    message: optional(z.string().trim().max(MAX_MESSAGE, guestText.message)),
    consent: z.literal(true, guestText.consent),
    // The total the guest saw; a page from before the price protection sends neither.
    quoted_total: z.number(guestText.checkForm).nonnegative(guestText.checkForm).nullable().optional(),
    quoted_currency: z.enum(CURRENCIES, guestText.checkForm).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.phone) {
      ctx.addIssue({ code: "custom", path: ["email"], message: guestText.contact });
    }
    // A total and its currency, or no price at all (the team confirms it): nothing in between.
    const [total, currency] = [value.quoted_total, value.quoted_currency];
    const whole = total === undefined ? currency === undefined : currency !== undefined && (total === null) === (currency === null);
    if (!whole) ctx.addIssue({ code: "custom", path: ["quoted_total"], message: guestText.checkForm });
  });

/** The body for Shadow, keys in the contract's order, or what the guest must fix. */
export function parseBookingRequest(
  input: unknown,
  now = Date.now(),
): { ok: true; request: BookingRequest } | { ok: false; issues: FieldIssue[] } {
  const parsed = bookingRequestSchema.safeParse(input);
  const raw = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const dates =
    typeof raw.check_in === "string" && typeof raw.check_out === "string"
      ? dateIssues(raw.check_in, raw.check_out, now)
      : [];
  if (!parsed.success || dates.length > 0) {
    return { ok: false, issues: [...(parsed.success ? [] : toFieldIssues(parsed.error)), ...dates] };
  }
  const v = parsed.data;
  return {
    ok: true,
    request: {
      client_ref: v.client_ref,
      room_type_id: v.room_type_id,
      check_in: v.check_in,
      check_out: v.check_out,
      guests: v.guests,
      name: v.name,
      email: v.email,
      phone: v.phone,
      preferred_contact: v.preferred_contact,
      arrival_time: v.arrival_time,
      message: v.message,
      consent: true,
      ...(v.quoted_total === undefined ? {} : { quoted_total: v.quoted_total, quoted_currency: v.quoted_currency ?? null }),
    },
  };
}

const bookingCreatedSchema = z.object({
  id: z.string().min(1),
  // A property prefix, then 6 unambiguous characters: "HOJ-7K3M9Q".
  reference: z.string().regex(/^[A-Z0-9]{1,12}-[A-Z0-9]{6}$/),
  status: z.enum(["pending", "confirmed"]),
  hold_expires_at: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)))
    .nullable(),
  total: z.number().nonnegative().nullable(),
  currency: z.enum(CURRENCIES).nullable(),
});

/** What the guest's browser needs from Shadow's 201: everything but Shadow's own id. */
export function readConfirmation(body: unknown): BookingConfirmation | null {
  const parsed = bookingCreatedSchema.safeParse(body);
  if (!parsed.success) return null;
  const { reference, status, hold_expires_at, total, currency } = parsed.data;
  return { reference, status, hold_expires_at, total, currency };
}

const priceChangedSchema = z
  .object({
    error: z.literal("price_changed"),
    total: z.number().nonnegative().nullable(),
    currency: z.enum(CURRENCIES).nullable(),
  })
  .refine((body) => (body.total === null) === (body.currency === null));

/**
 * Shadow's 409: "price_changed" with the total it would book at now, or null
 * for any other 409 (the beds are no longer free).
 */
export function readPriceChange(body: unknown): { changed: true; quote: Quote } | { changed: false } {
  const parsed = priceChangedSchema.safeParse(body);
  return parsed.success ? { changed: true, quote: { total: parsed.data.total, currency: parsed.data.currency } } : { changed: false };
}

/** Whether a request carries the total the guest saw (the price protection). */
export function hasQuote(request: BookingRequest): boolean {
  return request.quoted_total !== undefined;
}

/** The same request without the quote, for a Shadow Check-in that doesn't take one yet. */
export function withoutQuote(request: BookingRequest): BookingRequest {
  const copy = { ...request };
  delete copy.quoted_total;
  delete copy.quoted_currency;
  return copy;
}

const shadowIssuesSchema = z.object({ issues: z.array(z.object({ field: z.string(), message: z.string() })) });

/** Guest wording for the fields Shadow's 400 names (its own messages are written for developers). */
const refusedField: Readonly<Record<string, string>> = {
  check_in: guestText.datesRefused,
  check_out: guestText.datesRefused,
  guests: guestText.guestsRefused,
  room_type_id: guestText.roomRefused,
  name: guestText.name,
  email: guestText.email,
  phone: guestText.phone,
  preferred_contact: guestText.preferred,
  arrival_time: guestText.arrival,
  message: guestText.message,
  consent: guestText.consent,
};

/** The issues of Shadow's 400 the website can place on a field of the guest's booking, in the guest's words. */
function placedIssues(body: unknown): FieldIssue[] {
  const parsed = shadowIssuesSchema.safeParse(body);
  const fields = parsed.success ? parsed.data.issues.map((issue) => issue.field.split(".")[0] ?? "") : [];
  return [...new Set(fields)].flatMap((field) => {
    const message = refusedField[field];
    return message ? [{ field, message }] : [];
  });
}

/** Shadow's 400 issues in the guest's words, one per field; "form" when none can be placed. */
export function refusedIssues(body: unknown): FieldIssue[] {
  const issues = placedIssues(body);
  return issues.length > 0 ? issues : [{ field: "form", message: guestText.checkForm }];
}

/**
 * Whether a 400 says nothing about the guest's booking itself: the body as a
 * whole was refused (for example keys Shadow doesn't know yet).
 */
export function refusedOnlyTheBody(body: unknown): boolean {
  return placedIssues(body).length === 0;
}
