import { airportTransport, immigration, location, plainOfJars } from "./area";
import { identity } from "./identity";
import { privacy } from "./privacy";
import { honestNotes, praise, ratings } from "./reviews";
import { amenities, atmosphere, bathrooms, beds, breakfast, building, rules, services, staff, times } from "./stay";
import { travel } from "./travel";

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
  services,
  location,
  airportTransport,
  immigration,
  plainOfJars,
  ratings,
  praise,
  honestNotes,
  privacy,
  travel,
} as const;

/** Date the published facts were last reviewed against public listings. */
export const CONTENT_UPDATED = "2026-09-25";
