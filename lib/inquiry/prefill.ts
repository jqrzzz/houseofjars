import { dateWindow } from "./dates";

export interface InquiryPrefill {
  readonly check_in?: string;
  readonly check_out?: string;
  readonly guests?: number;
}

/** The most nights a link may ask for; longer stays are a conversation. */
export const MAX_PREFILL_NIGHTS = 30;
const MAX_GUESTS = 20;
const DAY_MS = 86_400_000;

const isDate = (value: string | null): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const addDays = (date: string, days: number) =>
  new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);

const wholeNumber = (value: string | null, max: number): number | undefined => {
  if (!value || !/^\d{1,3}$/.test(value)) return undefined;
  const number = Number(value);
  return number >= 1 && number <= max ? number : undefined;
};

/** The first of these parameters the link carries. */
const first = (params: URLSearchParams, ...names: string[]): string | null =>
  names.map((name) => params.get(name)).find((value) => value !== null) ?? null;

/**
 * Reads a /book link, as the booking card sends it (check_in, nights,
 * guests) or as an assistant might write it (check_in, check_out, guests,
 * as llms.txt documents; checkin, checkout and adults are understood too),
 * into values for the message form. Anything malformed or outside the dates
 * an inquiry may name is left out, never guessed.
 */
export function inquiryPrefill(search: string, now = Date.now()): InquiryPrefill {
  const params = new URLSearchParams(search);
  const { earliest, latest } = dateWindow(now);
  const guests = wholeNumber(first(params, "guests", "adults"), MAX_GUESTS);
  const checkIn = first(params, "check_in", "checkin");
  if (!isDate(checkIn) || checkIn < earliest || checkIn > latest) return guests ? { guests } : {};

  const checkOut = first(params, "check_out", "checkout");
  const nights = wholeNumber(params.get("nights"), MAX_PREFILL_NIGHTS);
  const out = isDate(checkOut) && checkOut > checkIn ? checkOut : nights ? addDays(checkIn, nights) : undefined;
  return {
    check_in: checkIn,
    ...(out && out <= latest ? { check_out: out } : {}),
    ...(guests ? { guests } : {}),
  };
}
