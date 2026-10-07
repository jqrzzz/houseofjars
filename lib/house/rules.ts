/*
 * The house rules, placed in the house. The rules themselves live in
 * content/stay.ts, each with its reason and its source; this file only says
 * where each one applies or is acted on, so a tour, a cleaning guide or Shadow
 * can give the right rule in the right place. No rule is written here.
 *
 * Each rule is found by a phrase from its wording. If a rule is reworded so
 * the phrase no longer matches, or a new rule is added without a place, the
 * tests fail and say which.
 */
import type { Fact } from "@/content/fact";
import { rules, type HouseRule } from "@/content/stay";
import type { Area, FloorId, HouseModel } from "./types";

/** A place in the house model: an area, a whole floor, or one fixture. */
export type Place = { readonly area: string } | { readonly floor: FloorId } | { readonly fixture: string };

/**
 * - house: everywhere indoors; its places are where it matters most or is acted on.
 * - places: only at its places.
 * - stay: about the booking or the stay rather than a place; its places are where it is handled.
 */
export type RuleScope = "house" | "places" | "stay";

export interface PlacedRule {
  /** A stable key, for links from tours, guides and Shadow. */
  readonly id: string;
  /** A phrase from the rule's wording in content/stay.ts that matches exactly one rule. */
  readonly match: string;
  readonly scope: RuleScope;
  readonly places: readonly Place[];
  /**
   * Places the rule keeps something out of ("never in Dorm H"): a plan marks them apart from its places,
   * never lit as if the rule happened there. The rule still applies there, so rulesAt() finds it.
   */
  readonly avoid?: readonly Place[];
  /** One plain sentence for a guide: what happens where. */
  readonly where: string;
}

/** Every place a rule concerns: where it happens and where it keeps something out of. */
export function concerns(rule: Pick<PlacedRule, "places" | "avoid">): readonly Place[] {
  return [...rule.places, ...(rule.avoid ?? [])];
}

export const placedRules: readonly PlacedRule[] = [
  { id: "no-smoking", match: "No smoking anywhere", scope: "house", places: [], where: "Everywhere in the house, on every floor." },
  {
    id: "registered-guests-upstairs",
    match: "No outside guests upstairs",
    scope: "places",
    places: [{ floor: "floor1" }, { floor: "floor2" }, { area: "stairs-ground" }],
    where: "The 1st and 2nd floors are for registered guests only; the stairs behind the counter lead up to them.",
  },
  {
    id: "smoke-past-the-terrace",
    match: "Smoke out past the terrace",
    scope: "places",
    places: [{ area: "terrace" }, { fixture: "jar-butts" }],
    where: "Not on the terrace in front of the café, where smoke drifts inside: a few steps further out, where a small jar takes the butts.",
  },
  { id: "no-outside-food", match: "No outside food or drink", scope: "house", places: [{ area: "entrance" }], where: "Anywhere in the house, from the front door in." },
  {
    id: "eat-in-the-cafe",
    match: "Eat and drink in the café",
    scope: "places",
    places: [{ area: "cafe" }],
    avoid: [{ area: "dorm-h" }, { area: "dorm-j" }],
    where: "Food and drink belong in the café on the ground floor, never in Dorm H or Dorm J.",
  },
  { id: "no-strong-food", match: "No strong-smelling food", scope: "house", places: [], where: "Anywhere in the house." },
  {
    id: "no-shoes-upstairs",
    match: "No shoes upstairs",
    scope: "places",
    places: [{ area: "stairs-ground" }, { fixture: "shoe-cubbies" }, { floor: "floor1" }, { floor: "floor2" }],
    where: "Shoes are fine on the ground floor. They come off at the foot of the stairs, and guests carry them up to the cubbies on the 1st floor landing: no shoes on the 1st or 2nd floor.",
  },
  { id: "no-pets", match: "No pets", scope: "house", places: [{ area: "entrance" }], where: "Anywhere in the house." },
  { id: "nothing-dangerous", match: "No drugs, weapons", scope: "house", places: [], where: "Anywhere in the house." },
  { id: "no-parties", match: "No hen or stag parties", scope: "stay", places: [], where: "About who books, not about a place." },
  {
    id: "pack-downstairs",
    match: "Pack your bag on the ground floor",
    scope: "places",
    places: [{ fixture: "luggage-space" }],
    avoid: [{ area: "dorm-h" }, { area: "dorm-j" }],
    where: "Early leavers pack on the ground floor, where luggage waits beside the front desk, so Dorm H and Dorm J can sleep on.",
  },
  {
    id: "quiet",
    match: "Keep your voice down",
    scope: "house",
    places: [{ area: "dorm-h" }, { area: "dorm-j" }],
    where: "Everywhere, and above all in Dorm H and Dorm J.",
  },
  {
    id: "front-door-locked",
    match: "The front door is locked",
    scope: "places",
    places: [{ fixture: "door-front" }],
    where: "The glass front door, on the left of the shopfront: knock on it when it is locked.",
  },
  { id: "check-in-hours", match: "Check-in from", scope: "stay", places: [{ area: "desk" }], where: "At the front desk, the café counter." },
  { id: "late-arrival", match: "Arriving after", scope: "stay", places: [{ area: "desk" }], where: "Message the team before you travel, so the front desk expects you." },
  { id: "early-check-in", match: "Early check-in", scope: "stay", places: [{ area: "desk" }], where: "Ask at the front desk." },
  { id: "passport", match: "Bring your passport", scope: "stay", places: [{ area: "desk" }], where: "Shown at the front desk at check-in." },
  { id: "deposit", match: "A deposit of", scope: "stay", places: [{ area: "desk" }], where: "Paid and refunded at the front desk." },
  {
    id: "check-out-hours",
    match: "Check-out from 08:00",
    scope: "stay",
    places: [{ area: "desk" }, { area: "dorm-h" }, { area: "dorm-j" }],
    where: "Pods in Dorm H and Dorm J are left by 11:30, and guests check out at the front desk.",
  },
  { id: "leaving-before-eight", match: "Leaving before 08:00", scope: "stay", places: [{ area: "desk" }], where: "Tell the front desk beforehand." },
  { id: "no-refund", match: "no refund", scope: "stay", places: [], where: "About the booking, not about a place." },
  {
    id: "bikes",
    match: "motorbike or bicycle",
    scope: "places",
    places: [{ area: "desk" }, { area: "terrace" }],
    where: "Tell the front desk: bikes may not stay outside the terrace overnight.",
  },
];

export interface ResolvedRule extends PlacedRule {
  readonly rule: string;
  readonly why: string;
  readonly group: keyof typeof rules;
  /** The rule as content/stay.ts holds it, with its source and whether the house confirmed it. */
  readonly fact: Fact<HouseRule>;
}

const contentRules = (Object.keys(rules) as (keyof typeof rules)[]).flatMap((group) =>
  rules[group].map((fact) => ({ group, fact })),
);

/** Every placed rule joined with its wording; throws if a phrase matches no rule or more than one. */
export function placedHouseRules(): ResolvedRule[] {
  return placedRules.map((placed) => {
    const found = contentRules.filter(({ fact }) => fact.value.rule.includes(placed.match));
    if (found.length !== 1) {
      throw new Error(`House rule "${placed.id}": "${placed.match}" matches ${found.length} rules in content/stay.ts, not one.`);
    }
    const { group, fact } = found[0]!;
    return { ...placed, rule: fact.value.rule, why: fact.value.why, group, fact };
  });
}

/** Whether a rule names this area (as a place or a place it keeps something out of), its floor, its parent area or a fixture in it. */
function names(rule: PlacedRule, model: HouseModel, area: Area): boolean {
  return concerns(rule).some((place) => {
    if ("area" in place) return place.area === area.id || place.area === area.parent;
    if ("floor" in place) return place.floor === area.floor;
    return model.fixtures.some((f) => f.id === place.fixture && f.area === area.id);
  });
}

/** The rules that name an area (by itself, its floor, its parent or a fixture in it), in the order of content/stay.ts. */
export function rulesAt(model: HouseModel, areaId: string, all: readonly ResolvedRule[] = placedHouseRules()): ResolvedRule[] {
  const area = model.areas.find((a) => a.id === areaId);
  if (!area) throw new Error(`Unknown area "${areaId}".`);
  return all.filter((rule) => names(rule, model, area));
}
