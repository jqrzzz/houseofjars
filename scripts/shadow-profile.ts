/**
 * Writes the house profile for Shadow Check-in (lib/shadow/profile.ts) to
 * shadow/house-profile.json. Run it after changing the content or the house
 * model; a unit test fails while the committed file differs from a fresh build.
 *
 *   npm run shadow:profile
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildShadowProfile, profileJson } from "../lib/shadow/profile";

const dir = join(process.cwd(), "shadow");
mkdirSync(dir, { recursive: true });
const profile = buildShadowProfile();
writeFileSync(join(dir, "house-profile.json"), profileJson(profile));
const beds = profile.rooms.reduce((sum, room) => sum + room.beds.length, 0);
console.log(
  `wrote shadow/house-profile.json: ${profile.rooms.length} rooms, ${beds} beds, ${profile.facts.length} facts, ${profile.houseRules.rules.length} house rules`,
);
