import { addDays, formatDay, isIsoDate, nightsBetween } from "../dates";

/*
 * The mini rail on /book (docs/DESIGN.md §5.3): once a guest has chosen their
 * dates, the stay as the house will live it, in one line:
 *
 *   Check-in from 14:00 on Friday 9 October · breakfast 08:00–10:30 · check-out by 11:30 on Sunday 11 October
 *
 * Dates are calendar days at the house (YYYY-MM-DD, Vientiane), so month and
 * year ends are only day arithmetic (lib/dates.ts). The times are passed in
 * (times.checkIn, times.checkOut and breakfast.hours from content/stay, read
 * by the server page): this file imports no content, so the booking forms'
 * JavaScript stays small. Pure and browser-safe, and free of zod.
 */

/** The house's times, as content/stay writes them. */
export interface RailTimes {
  /** Check-in from ("14:00"): times.checkIn. */
  readonly checkIn: string;
  /** Check-out by ("11:30"): times.checkOut. */
  readonly checkOut: string;
  /** Breakfast hours ("08:00–10:30"): breakfast.hours. */
  readonly breakfast: string;
}

export type RailStopId = "check-in" | "breakfast" | "check-out";

export interface RailStop {
  readonly id: RailStopId;
  /** "Check-in" */
  readonly label: string;
  /** "from 14:00" */
  readonly time: string;
  /** "Friday 9 October", or for breakfast "each morning" ("the next morning" for one night). */
  readonly when: string;
  /** The stop as the line says it: "Check-in from 14:00 on Friday 9 October". */
  readonly text: string;
}

export interface StayRail {
  readonly checkIn: string;
  readonly checkOut: string;
  readonly nights: number;
  /** The first morning's date (breakfast's first day). */
  readonly firstMorning: string;
  readonly stops: readonly [RailStop, RailStop, RailStop];
  /** The whole rail in one line, stops joined by " · ". */
  readonly text: string;
}

/**
 * "Friday 9 October", or "Friday 9 October 2026" with `year`. Composed by
 * lib/dates, so every browser writes it the same way (en-GB order).
 */
export function railDate(date: string, year = false): string {
  const long = formatDay(date, "long");
  return year ? long : long.replace(/ \d{4}$/, "");
}

/** The first time in a range of hours: "08:00–10:30" → "08:00". The whole text if it holds no time. */
export function breakfastFrom(hours: string): string {
  return /\b\d{2}:\d{2}\b/.exec(hours)?.[0] ?? hours;
}

/** The booking card's line: "Your first morning: breakfast from 08:00." */
export function firstMorningText(hours: string): string {
  return `Your first morning: breakfast from ${breakfastFrom(hours)}.`;
}

/**
 * The rail for a stay, or null until both dates are real and check-out comes
 * after check-in. Years are written when the stay crosses a year end, or
 * when it starts in a year other than `today`'s (house date, if given).
 */
export function stayRail(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
  times: RailTimes,
  options: { today?: string } = {},
): StayRail | null {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return null;
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return null;

  const year = checkIn.slice(0, 4) !== checkOut.slice(0, 4) || (isIsoDate(options.today) && options.today.slice(0, 4) !== checkIn.slice(0, 4));
  const arrive = railDate(checkIn, year);
  const leave = railDate(checkOut, year);
  const stops = [
    { id: "check-in", label: "Check-in", time: `from ${times.checkIn}`, when: arrive, text: `Check-in from ${times.checkIn} on ${arrive}` },
    {
      id: "breakfast",
      label: "Breakfast",
      time: times.breakfast,
      when: nights === 1 ? "the next morning" : "each morning",
      text: `breakfast ${times.breakfast}`,
    },
    { id: "check-out", label: "Check-out", time: `by ${times.checkOut}`, when: leave, text: `check-out by ${times.checkOut} on ${leave}` },
  ] as const satisfies readonly [RailStop, RailStop, RailStop];

  return {
    checkIn,
    checkOut,
    nights,
    firstMorning: addDays(checkIn, 1),
    stops,
    text: stops.map((stop) => stop.text).join(" · "),
  };
}

/** The rail for a check-in and a number of nights (the booking card's and booking direct's form). */
export function stayRailForNights(
  checkIn: string | null | undefined,
  nights: number,
  times: RailTimes,
  options: { today?: string } = {},
): StayRail | null {
  if (!isIsoDate(checkIn) || !Number.isInteger(nights) || nights < 1) return null;
  return stayRail(checkIn, addDays(checkIn, nights), times, options);
}
