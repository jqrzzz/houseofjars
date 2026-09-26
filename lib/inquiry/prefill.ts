import { addDays, isIsoDate } from "../dates";
import { dateWindow } from "./dates";

export interface InquiryPrefill {
  readonly check_in?: string;
  readonly check_out?: string;
  readonly guests?: number;
}

/** The most nights a link may ask for; longer stays are a conversation. */
export const MAX_PREFILL_NIGHTS = 30;
const MAX_GUESTS = 20;

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
  if (!isIsoDate(checkIn) || checkIn < earliest || checkIn > latest) return guests ? { guests } : {};

  const checkOut = first(params, "check_out", "checkout");
  const nights = wholeNumber(params.get("nights"), MAX_PREFILL_NIGHTS);
  const out = isIsoDate(checkOut) && checkOut > checkIn ? checkOut : nights ? addDays(checkIn, nights) : undefined;
  return {
    check_in: checkIn,
    ...(out && out <= latest ? { check_out: out } : {}),
    ...(guests ? { guests } : {}),
  };
}
