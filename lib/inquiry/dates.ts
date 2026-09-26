/*
 * The dates an inquiry may name. Kept apart from the schema, which needs
 * zod: the booking form reads links in the browser and must stay small.
 */

/** How far ahead an inquiry can be about. */
export const MAX_DAYS_AHEAD = 730;
const DAY_MS = 86_400_000;
const vientianeDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * The dates an inquiry may name, as YYYY-MM-DD: from yesterday in Vientiane
 * (a guest whose own calendar is a day behind can still pick "today") to
 * MAX_DAYS_AHEAD days ahead. A model guessing the year is the likeliest
 * source of anything outside it.
 */
export function dateWindow(now = Date.now()): { earliest: string; latest: string } {
  return { earliest: vientianeDate.format(now - DAY_MS), latest: vientianeDate.format(now + MAX_DAYS_AHEAD * DAY_MS) };
}
