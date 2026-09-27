import type { BetaTool } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { findAvailability, type AvailabilityAnswer, type AvailabilityDeps } from "../booking/handler";
import { guestText } from "../booking/text";
import { MAX_GUESTS, MAX_STAY_NIGHTS, type Availability, type FieldIssue, type RoomKind } from "../booking/types";
import { addDays, houseToday, nightsBetween } from "../dates";
import { MAX_DAYS_AHEAD } from "../inquiry/dates";
import type { AvailabilityCard } from "./protocol";

export const CHECK_AVAILABILITY = "check_availability";

/**
 * The concierge's read-only look at free beds, offered only when the site
 * takes bookings online. The server validates every call with
 * checkAvailabilityInputSchema, which is also what makes eager input
 * streaming (no server-side buffering) safe.
 */
export const checkAvailabilityTool: BetaTool = {
  name: CHECK_AVAILABILITY,
  eager_input_streaming: true,
  description:
    "Look up which beds are free at House of Jars for one stay, live from the house's booking system. " +
    "It only reads: it books nothing, holds nothing and never shows prices. " +
    "Call it when the guest asks whether there are beds for particular dates and you know the check-in date, " +
    "the check-out date and the number of guests; if any of them is unclear, ask the guest first instead of guessing. " +
    "Returns each room type with the fewest free beds across the nights and whether it can be booked for that many guests, " +
    "or the reason the stay can't be booked online.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      check_in: { type: "string", format: "date", description: "Arrival date, YYYY-MM-DD." },
      check_out: { type: "string", format: "date", description: "Departure date, YYYY-MM-DD, after check_in." },
      guests: { type: "integer", description: `Number of guests, 1 to ${MAX_GUESTS}.` },
    },
    required: ["check_in", "check_out", "guests"],
  },
};

/**
 * What check_availability accepts: real dates and a whole number of guests.
 * The stay then goes through /book's own checks (findAvailability), so it
 * keeps to the same bounds and booking window as the booking form.
 */
export const checkAvailabilityInputSchema = z.strictObject({
  check_in: z.iso.date(),
  check_out: z.iso.date(),
  guests: z.number().int().min(1).max(MAX_GUESTS),
});

export type AvailabilityQueryInput = z.output<typeof checkAvailabilityInputSchema>;

/** Why a stay can't be booked online. */
export type UnbookableReason =
  | "past"
  | "check_out_not_after_check_in"
  | "too_short"
  | "too_long"
  | "outside_window"
  | "too_many_guests"
  /** The house's booking system turns the stay down for a reason it doesn't give (its own limits). */
  | "not_taken_online"
  | "fully_booked"
  | "booking_closed";

/** One room type as Claude reads it: never its price. */
interface RoomFacts {
  readonly name: string;
  readonly kind: RoomKind | null;
  /** The fewest free beds on any night of the stay. */
  readonly fewest_free_beds: number;
  /** Enough beds free every night for this many guests, within the house's limits. */
  readonly bookable: boolean;
}

export interface AvailabilityToolOutcome {
  /** The tool result Claude reads (JSON): facts only, never a price. */
  readonly content: string;
  readonly isError: boolean;
  /** The chat window's card, built from Shadow Check-in's answer: only when something can be booked. */
  readonly card: AvailabilityCard | null;
}

export type CheckAvailability = (input: unknown) => Promise<AvailabilityToolOutcome>;

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

const answer = (result: Record<string, unknown>, card: AvailabilityCard | null = null): AvailabilityToolOutcome => ({
  content: JSON.stringify(result),
  isError: false,
  card,
});

const failure = (error: string, detail: string, more: Record<string, unknown> = {}): AvailabilityToolOutcome => ({
  content: JSON.stringify({ error, detail, ...more }),
  isError: true,
  card: null,
});

/** The chat window's card: the stay as Shadow Check-in echoed it, and the room types it says can be booked. */
export function availabilityCard(availability: Availability): AvailabilityCard | null {
  const rooms = availability.room_types
    .filter((room) => room.bookable)
    .map((room) => ({ name: room.name, kind: room.kind, free: room.min_free }));
  if (rooms.length === 0) return null;
  const { check_in, check_out, nights, guests } = availability;
  return { check_in, check_out, nights, guests, rooms };
}

/** Why nothing in Shadow Check-in's answer can be booked, from its own counts and limits. */
function unbookable(availability: Availability, today: string): { reason: UnbookableReason; detail: string } {
  const { limits, nights, guests, check_out, room_types } = availability;
  if (guests > limits.max_guests) {
    return { reason: "too_many_guests", detail: `Online booking takes up to ${plural(limits.max_guests, "guest")} at a time.` };
  }
  if (nights < limits.min_nights || nights > limits.max_nights) {
    return {
      reason: nights < limits.min_nights ? "too_short" : "too_long",
      detail: `Online booking takes stays of ${limits.min_nights} to ${plural(limits.max_nights, "night")}.`,
    };
  }
  const last = addDays(today, limits.window_days);
  if (check_out > last) return { reason: "outside_window", detail: `Online booking takes stays that end by ${last}.` };
  if (room_types.length > 0 && room_types.every((room) => room.min_free < guests)) {
    return { reason: "fully_booked", detail: `No room type has ${plural(guests, "bed")} free on every night of the stay.` };
  }
  return { reason: "not_taken_online", detail: "The house's booking system doesn't take this stay online." };
}

/** The reasons behind the website's own checks and Shadow Check-in's refusals (lib/booking/contract.ts), by their wording. */
function refused(issues: readonly FieldIssue[], stay: AvailabilityQueryInput, today: string): { reason: UnbookableReason; detail: string } {
  const reasons: readonly [string, UnbookableReason, string][] = [
    [guestText.fromToday, "past", `Check-in is before today in Vientiane (${today}).`],
    [guestText.order, "check_out_not_after_check_in", "Check-out must be after check-in."],
    [guestText.tooLong, "too_long", `Online booking takes stays of at most ${MAX_STAY_NIGHTS} nights.`],
    [guestText.tooFar, "outside_window", `Online booking takes stays that end by ${addDays(today, MAX_DAYS_AHEAD)}.`],
    [guestText.guestsRefused, "too_many_guests", `The house's booking system doesn't take ${plural(stay.guests, "guest")} in one booking online.`],
    [guestText.datesRefused, "not_taken_online", "The house's booking system doesn't take these dates online (its limits on how long a stay is or how far ahead it is)."],
  ];
  for (const issue of issues) {
    const found = reasons.find(([message]) => message === issue.message);
    if (found) return { reason: found[1], detail: found[2] };
  }
  return { reason: "not_taken_online", detail: "The house's booking system doesn't take this stay online." };
}

/**
 * What Claude reads about a lookup. Only the facts it needs are copied out,
 * field by field, so a price in Shadow Check-in's answer can never reach it:
 * prices stay on the booking page. Limits and failures become results Claude
 * can relay, never an exception.
 */
export function shapeAvailability(stay: AvailabilityQueryInput, found: AvailabilityAnswer, today: string): AvailabilityToolOutcome {
  const asked = {
    check_in: stay.check_in,
    check_out: stay.check_out,
    ...(stay.check_out > stay.check_in ? { nights: nightsBetween(stay.check_in, stay.check_out) } : {}),
    guests: stay.guests,
  };
  if (found.ok) {
    const { availability } = found;
    const card = availabilityCard(availability);
    const room_types: RoomFacts[] = availability.room_types.map((room) => ({
      name: room.name,
      kind: room.kind,
      fewest_free_beds: room.min_free,
      bookable: room.bookable,
    }));
    const why = card ? null : unbookable(availability, today);
    return answer(
      {
        check_in: availability.check_in,
        check_out: availability.check_out,
        nights: availability.nights,
        guests: availability.guests,
        bookable: card !== null,
        ...(why ? { reason: why.reason, reason_detail: why.detail } : {}),
        room_types,
        booking_card_shown: card !== null,
      },
      card,
    );
  }
  switch (found.error) {
    case "invalid_request": {
      const why = refused(found.issues, stay, today);
      return answer({ ...asked, bookable: false, reason: why.reason, reason_detail: why.detail, booking_card_shown: false });
    }
    case "not_configured":
      return answer({
        ...asked,
        bookable: false,
        reason: "booking_closed",
        reason_detail: "Online booking isn't open just now.",
        booking_card_shown: false,
      });
    case "rate_limited":
      return failure("rate_limited", "This guest's connection has looked up many stays in the last few minutes.", {
        retry_after_minutes: Math.max(1, Math.ceil(found.retryAfterSeconds / 60)),
      });
    case "busy":
      return failure("busy", "The house's booking system is busy just now.");
    case "unavailable":
      return failure("unavailable", "The house's booking system couldn't be reached just now.");
  }
}

/**
 * check_availability for one guest: their input checked, then the stay looked
 * up through the booking form's own path (findAvailability: the same checks,
 * cache and limits), counted against the guest's own address.
 */
export function availabilityChecker(deps: AvailabilityDeps, client: string): CheckAvailability {
  return async (input) => {
    const parsed = checkAvailabilityInputSchema.safeParse(input);
    if (!parsed.success) {
      const problems = parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`);
      return failure("invalid_input", problems.join("; "));
    }
    const stay = parsed.data;
    const query = new URLSearchParams({ check_in: stay.check_in, check_out: stay.check_out, guests: String(stay.guests) });
    const found = await findAvailability(query, client, deps);
    return shapeAvailability(stay, found, houseToday(deps.now?.()));
  };
}
