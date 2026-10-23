import type { Device } from "./lines";

/*
 * What the page-view route reads from a request, and keeps none of: whether
 * it is a robot or asks not to be counted, the kind of device, the country
 * the host's network says it is in, and which of the site's pages it was.
 */

/** Search engines' and link previews' robots, and scripts: they read pages, nobody visits. */
const ROBOT =
  /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|inspectiontool|screenshot|preview|facebookexternalhit|embedly|quora link|whatsapp|python|curl|wget|httpclient|java\/|go-http|axios|node-fetch|undici|postman|insomnia/i;

export function isRobot(userAgent: string | null): boolean {
  return !userAgent || ROBOT.test(userAgent);
}

/** Do Not Track or Global Privacy Control: the browser asks sites not to follow its visitor, and it is not counted. */
export function asksNotToBeCounted(headers: Headers): boolean {
  return headers.get("dnt") === "1" || headers.get("sec-gpc") === "1";
}

export function deviceOf(userAgent: string | null): Device {
  const ua = userAgent ?? "";
  if (/iPad|Tablet|PlayBook|Silk|Kindle|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|Windows Phone|Opera Mini|IEMobile/i.test(ua)) return "phone";
  return "computer";
}

/** The visitor's country as Vercel's network sees it (two small letters), or null when it does not say. */
export function countryOf(headers: Headers): string | null {
  const code = headers.get("x-vercel-ip-country")?.trim().toLowerCase() ?? "";
  return /^[a-z]{2}$/.test(code) ? code : null;
}

/** A page's name for the counts: one of the site's own paths, or "other" (a mistyped address, a robot's guess). */
export function pageKey(path: string, pages: ReadonlySet<string>): string {
  const bare = path.split(/[?#]/)[0] ?? "";
  const tidy = bare.length > 1 ? bare.replace(/\/+$/, "") : bare;
  return pages.has(tidy) ? tidy : "other";
}
