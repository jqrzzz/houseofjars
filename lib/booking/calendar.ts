import {
  addDays,
  addMonths,
  daysInMonth,
  formatDay,
  monthOf,
  nightsBetween,
  weekdayIndex,
} from "../dates";
import { MAX_DAYS_AHEAD } from "../inquiry/dates";
import { MAX_STAY_NIGHTS, type BookingLimits } from "./types";

/*
 * The logic of the booking form's date-range picker: which days can be
 * chosen, what choosing one does, and where the keyboard moves. Days are the
 * house's calendar days in Vientiane. Browser-safe and free of zod.
 */

export interface CalendarRules {
  /** The first possible check-in: today at the house. */
  readonly first: string;
  /** The last day a stay may reach: its check-out, at the end of the booking window. */
  readonly last: string;
  readonly minNights: number;
  readonly maxNights: number;
}

export interface DateRange {
  readonly checkIn: string | null;
  readonly checkOut: string | null;
}

export const NO_DATES: DateRange = { checkIn: null, checkOut: null };

/** The house's rules, from Shadow's limits. */
export function calendarRules(today: string, limits: BookingLimits): CalendarRules {
  return {
    first: today,
    last: addDays(today, limits.window_days),
    minNights: limits.min_nights,
    maxNights: Math.max(limits.min_nights, limits.max_nights),
  };
}

/**
 * Only the website's own bounds, for when Shadow hasn't said its limits
 * (Shadow still checks them, and explains, when the guest looks for beds).
 */
export function looseRules(today: string): CalendarRules {
  return { first: today, last: addDays(today, MAX_DAYS_AHEAD), minNights: 1, maxNights: MAX_STAY_NIGHTS };
}

/** The weeks of a month, Monday first, null outside the month: always six, so the grid keeps its height. */
export function monthWeeks(month: string): (string | null)[][] {
  const lead = weekdayIndex(`${month}-01`);
  const length = daysInMonth(month);
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = week * 7 + weekday - lead + 1;
      return day >= 1 && day <= length ? `${month}-${String(day).padStart(2, "0")}` : null;
    }),
  );
}

/** Why a day can't be chosen next. */
export type DayBlock = "past" | "beyond_window" | "too_short" | "too_long" | "window_end";

/** Whether the next choice is a check-out: a check-in is chosen and a check-out isn't yet. */
export function choosingCheckOut(range: DateRange): boolean {
  return range.checkIn !== null && range.checkOut === null;
}

export function dayBlock(day: string, range: DateRange, rules: CalendarRules): DayBlock | null {
  if (day < rules.first) return "past";
  if (day > rules.last) return "beyond_window";
  if (choosingCheckOut(range) && day > range.checkIn!) {
    const nights = nightsBetween(range.checkIn!, day);
    if (nights < rules.minNights) return "too_short";
    if (nights > rules.maxNights) return "too_long";
    return null;
  }
  // Otherwise the day would be a check-in: the shortest stay must fit in the window.
  return addDays(day, rules.minNights) > rules.last ? "window_end" : null;
}

export type Pick =
  | { readonly range: DateRange; readonly picked: "check_in" | "check_out" }
  | { readonly blocked: DayBlock };

/**
 * Choosing a day. The first choice is the check-in, the next a later day is
 * the check-out; an earlier day, or any day once both are chosen, starts again
 * from that check-in.
 */
export function pickDay(range: DateRange, day: string, rules: CalendarRules): Pick {
  const block = dayBlock(day, range, rules);
  if (block) return { blocked: block };
  if (choosingCheckOut(range) && day > range.checkIn!) {
    return { range: { checkIn: range.checkIn, checkOut: day }, picked: "check_out" };
  }
  return { range: { checkIn: day, checkOut: null }, picked: "check_in" };
}

/** The part a day plays in the stay (or the one being chosen, up to `preview`). */
export function dayRole(day: string, range: DateRange, preview: string | null = null): "check_in" | "check_out" | "in_stay" | null {
  if (day === range.checkIn) return "check_in";
  if (day === range.checkOut) return "check_out";
  const end = range.checkOut ?? (choosingCheckOut(range) && preview && preview > range.checkIn! ? preview : null);
  return range.checkIn && end && day > range.checkIn && day < end ? "in_stay" : null;
}

/** A range that still fits the rules (they may arrive after a link filled in the dates). */
export function fitRange(range: DateRange, rules: CalendarRules): DateRange {
  if (!range.checkIn || dayBlock(range.checkIn, NO_DATES, rules)) return NO_DATES;
  if (range.checkOut && dayBlock(range.checkOut, { checkIn: range.checkIn, checkOut: null }, rules)) {
    return { checkIn: range.checkIn, checkOut: null };
  }
  return range;
}

const clamp = (day: string, rules: CalendarRules) => (day < rules.first ? rules.first : day > rules.last ? rules.last : day);

/** The same day of another month, or that month's last day. */
function shiftMonths(day: string, count: number): string {
  const month = addMonths(monthOf(day), count);
  const date = Math.min(Number(day.slice(8)), daysInMonth(month));
  return `${month}-${String(date).padStart(2, "0")}`;
}

/**
 * Where keyboard focus moves from `day`, as in the WAI-ARIA date picker
 * pattern: arrows by day and week, Home and End to the week's ends, Page Up
 * and Page Down by month (with Shift, by year). Kept inside the window; null
 * for keys the grid leaves alone.
 */
export function moveFocus(day: string, key: string, shift: boolean, rules: CalendarRules): string | null {
  const target = (() => {
    switch (key) {
      case "ArrowLeft":
        return addDays(day, -1);
      case "ArrowRight":
        return addDays(day, 1);
      case "ArrowUp":
        return addDays(day, -7);
      case "ArrowDown":
        return addDays(day, 7);
      case "Home":
        return addDays(day, -weekdayIndex(day));
      case "End":
        return addDays(day, 6 - weekdayIndex(day));
      case "PageUp":
        return shiftMonths(day, shift ? -12 : -1);
      case "PageDown":
        return shiftMonths(day, shift ? 12 : 1);
      default:
        return null;
    }
  })();
  return target === null ? null : clamp(target, rules);
}

/** The first of `count` months on show, moved as little as possible to show `day`, and never past the window. */
export function viewFor(day: string, view: string, count: number, rules: CalendarRules): string {
  const month = monthOf(day);
  let start = month < view ? month : month > addMonths(view, count - 1) ? addMonths(month, 1 - count) : view;
  const [firstMonth, lastStart] = [monthOf(rules.first), addMonths(monthOf(rules.last), 1 - count)];
  if (start > lastStart) start = lastStart;
  if (start < firstMonth) start = firstMonth;
  return start;
}

const nightsText = (count: number) => `${count} ${count === 1 ? "night" : "nights"}`;

/** Why a day can't be chosen, in words, for its label and for the announcement when it is tried. */
function blockText(block: DayBlock, rules: CalendarRules): string {
  switch (block) {
    case "past":
      return "in the past";
    case "beyond_window":
    case "window_end":
      return `online booking goes up to ${formatDay(rules.last, "long")}`;
    case "too_short":
      return `stays are at least ${nightsText(rules.minNights)}`;
    case "too_long":
      return `online, stays are at most ${nightsText(rules.maxNights)}`;
  }
}

/** A day's name for screen readers: "Saturday 3 October 2026, check-in". */
export function dayLabel(
  day: string,
  role: ReturnType<typeof dayRole>,
  block: DayBlock | null,
  rules: CalendarRules,
): string {
  const parts = [formatDay(day, "long")];
  if (day === rules.first) parts.push("today");
  if (role === "check_in") parts.push("check-in");
  if (role === "check_out") parts.push("check-out");
  if (role === "in_stay") parts.push("in your stay");
  if (block) parts.push(`not available: ${blockText(block, rules)}`);
  return parts.join(", ");
}

/** What the live region says after a choice. */
export function pickAnnouncement(pick: Pick, rules: CalendarRules): string {
  if ("blocked" in pick) return `That date can’t be chosen: ${blockText(pick.blocked, rules)}.`;
  const { checkIn, checkOut } = pick.range;
  if (pick.picked === "check_in") return `Check-in ${formatDay(checkIn!, "long")}. Now choose your check-out date.`;
  return `Check-out ${formatDay(checkOut!, "long")}: ${nightsText(nightsBetween(checkIn!, checkOut!))}.`;
}

export { nightsText };
