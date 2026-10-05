import type { HouseIconName } from "./house-icons";

/*
 * Which of the house's icons goes with a rule or an amenity, by what it says,
 * as on the house's own signs. Nothing matched: no icon (the list shows the
 * house's mark instead). sign-icons.test.ts checks every published rule and
 * amenity gets one it should.
 */
const byWords: readonly [RegExp, HouseIconName][] = [
  // Where smoking is allowed, a place, not a ban.
  [/smoke out past/i, "location"],
  [/smok/i, "no-smoking"],
  [/front door/i, "front-door"],
  [/padlock/i, "valuables"],
  [/\bpets?\b/i, "no-pets"],
  [/drugs|weapons/i, "prohibited"],
  [/outside guests/i, "no-outside-guests"],
  [/eat and drink|food/i, "no-food-in-dorms"],
  [/shoes/i, "shoes-off"],
  [/voice|quiet/i, "quiet-hours"],
  [/pack your bag|luggage/i, "luggage"],
  [/motorbike|bicycle/i, "motorbike"],
  [/check-out|leaving before/i, "check-out-time"],
  [/check-in|arriving|reception|front desk/i, "check-in"],
  [/air-condition/i, "air-conditioning"],
  [/wi-?fi/i, "wifi"],
  [/breakfast/i, "breakfast"],
  [/café|cafe/i, "coffee"],
  [/locker|safe\b/i, "locker"],
  [/shower|hot water/i, "shower"],
];

export function signIcon(text: string): HouseIconName | null {
  return byWords.find(([words]) => words.test(text))?.[1] ?? null;
}
