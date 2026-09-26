/*
 * Calendar days at the house, as YYYY-MM-DD. Stays are nights in Vientiane
 * (UTC+7 all year), whatever the guest's own time zone, so "today" is today
 * in Vientiane. Day arithmetic runs on UTC midnights, which never shift.
 * Browser-safe and free of zod: the booking form's JavaScript loads this.
 */

const HOUSE_TIME_ZONE = "Asia/Vientiane";
const DAY_MS = 86_400_000;

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const houseParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: HOUSE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The wall-clock date and time at the house for an instant. */
function houseClock(instant: number): { date: string; time: string } {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    houseParts.formatToParts(instant).find((p) => p.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}

/** Today's date at the house. */
export function houseToday(now = Date.now()): string {
  return houseClock(now).date;
}

/** A real calendar date written YYYY-MM-DD (not 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const utc = (date: string) => Date.parse(`${date}T00:00:00Z`);

export function addDays(date: string, days: number): string {
  return new Date(utc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Nights from check-in to check-out (negative if they are the wrong way round). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((utc(checkOut) - utc(checkIn)) / DAY_MS);
}

/** Each night of a stay, by the date it starts. */
export function stayNights(checkIn: string, checkOut: string): string[] {
  return Array.from({ length: Math.max(0, nightsBetween(checkIn, checkOut)) }, (_, i) => addDays(checkIn, i));
}

/** 0 for Monday to 6 for Sunday. */
export function weekdayIndex(date: string): number {
  return (new Date(utc(date)).getUTCDay() + 6) % 7;
}

export function weekdayName(index: number): string {
  return WEEKDAYS[index] ?? "";
}

/** "2026-10-03" -> "2026-10" */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** "2026-12" plus 1 -> "2027-01" */
export function addMonths(month: string, count: number): string {
  const [year = 0, monthNumber = 1] = month.split("-").map(Number);
  const index = year * 12 + (monthNumber - 1) + count;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Days in a month given as YYYY-MM. */
export function daysInMonth(month: string): number {
  return nightsBetween(`${month}-01`, `${addMonths(month, 1)}-01`);
}

/** "2026-10" -> "October 2026" */
export function formatMonth(month: string): string {
  const [year, monthNumber = 1] = month.split("-").map(Number);
  return `${MONTHS[monthNumber - 1]} ${year}`;
}

/**
 * "2026-10-03" -> "Sat 3 Oct" (short) or "Saturday 3 October 2026" (long).
 * Composed by hand so the words are the same in every browser.
 */
export function formatDay(date: string, style: "short" | "long" = "short"): string {
  const [year, monthNumber = 1, day = 1] = date.split("-").map(Number);
  const weekday = WEEKDAYS[weekdayIndex(date)]!;
  const month = MONTHS[monthNumber - 1]!;
  return style === "short" ? `${weekday.slice(0, 3)} ${day} ${month.slice(0, 3)}` : `${weekday} ${day} ${month} ${year}`;
}

/** An instant as the house's wall clock: "Sunday 4 October, 14:00". Null for anything unreadable. */
export function formatHouseTime(iso: string): string | null {
  const instant = Date.parse(iso);
  if (Number.isNaN(instant)) return null;
  const { date, time } = houseClock(instant);
  const [, monthNumber = 1, day = 1] = date.split("-").map(Number);
  return `${WEEKDAYS[weekdayIndex(date)]} ${day} ${MONTHS[monthNumber - 1]}, ${time}`;
}
