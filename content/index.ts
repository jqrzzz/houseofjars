import { airportTransport, immigration, location, plainOfJars } from "./area";
import { identity } from "./identity";
import { honestNotes, praise, ratings } from "./reviews";
import { amenities, atmosphere, bathrooms, beds, breakfast, building, rules, staff, times } from "./stay";

/** Every fact the site publishes, in one tree (walked by content:check). */
export const content = {
  identity,
  times,
  building,
  beds,
  bathrooms,
  breakfast,
  staff,
  amenities,
  atmosphere,
  rules,
  location,
  airportTransport,
  immigration,
  plainOfJars,
  ratings,
  praise,
  honestNotes,
} as const;

/** Date the published facts were last reviewed against public listings. */
export const CONTENT_UPDATED = "2026-09-25";
