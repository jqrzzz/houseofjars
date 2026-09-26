/*
 * The dates an inquiry may name. Kept apart from the schema, which needs
 * zod: the booking form reads links in the browser and must stay small.
 */

import { addDays, houseToday } from "../dates";

/** How far ahead an inquiry can be about. */
export const MAX_DAYS_AHEAD = 730;

/**
 * The dates an inquiry may name, as YYYY-MM-DD: from yesterday in Vientiane
 * (a guest whose own calendar is a day behind can still pick "today") to
 * MAX_DAYS_AHEAD days ahead. A model guessing the year is the likeliest
 * source of anything outside it.
 */
export function dateWindow(now = Date.now()): { earliest: string; latest: string } {
  const today = houseToday(now);
  return { earliest: addDays(today, -1), latest: addDays(today, MAX_DAYS_AHEAD) };
}
