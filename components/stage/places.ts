/*
 * Where things are, for the stage's overlays, the text beside it and the rule
 * plans: a walk's stops, photos with a place as numbered camera dots, and the
 * areas a placed house rule names. Server code only (it reads the house model).
 */
import { photos } from "@/content/photos";
import { houseOfJars } from "@/lib/house/house-of-jars";
import { renderThreadLayer, type StageStop } from "@/lib/house/paper";
import type { Place } from "@/lib/house/rules";
import type { FloorId } from "@/lib/house/types";
import type { StageSpot } from "./PaperStage";

export type PhotoKey = keyof typeof photos;

/**
 * Camera dots for the photos given, in that order: those with a confirmed
 * place (content/photos.ts) are numbered 1, 2, 3… and placed at their area.
 * A gallery that shows the same photos, in the same order, repeats the numbers.
 */
export function cameraSpots(keys: readonly PhotoKey[]): StageSpot[] {
  const spots: StageSpot[] = [];
  for (const key of keys) {
    const photo = photos[key];
    const area = photo.place?.area;
    if (area) spots.push({ n: spots.length + 1, key, caption: photo.caption, anchor: `area-${area}` });
  }
  return spots;
}

/** The number a photo's camera dot carries in cameraSpots(keys), or undefined if it has none. */
export function cameraNumber(keys: readonly PhotoKey[], key: PhotoKey): number | undefined {
  return cameraSpots(keys).find((spot) => spot.key === key)?.n;
}

/** The prefix of a whole floor in data-places: "floor:floor1". */
export const FLOOR = "floor:";

/** The prefix of a place a rule keeps something out of, in data-places: "not:dorm-h". */
export const AVOID = "not:";

/**
 * Places as data-places tokens: the areas named one by one (an area itself,
 * the area a fixture stands in), in the model's order, then each floor named
 * as a whole, "floor:floor1", in the model's order.
 */
function tokensOf(places: readonly Place[]): string[] {
  const areas = new Set<string>();
  const floors = new Set<string>();
  for (const place of places) {
    if ("area" in place) {
      areas.add(place.area);
    } else if ("floor" in place) {
      floors.add(place.floor);
    } else {
      const fixture = houseOfJars.fixtures.find((f) => f.id === place.fixture);
      if (fixture) areas.add(fixture.area);
    }
  }
  return [
    ...houseOfJars.areas.map((a) => a.id).filter((id) => areas.has(id)),
    ...houseOfJars.floors.map((f) => f.id).filter((id) => floors.has(id)).map((id) => `${FLOOR}${id}`),
  ];
}

/**
 * Where a placed rule lives, for its <li data-places>: the areas it names one
 * by one (an area, the area a fixture stands in), then the floors it names
 * whole ("floor:floor1"); then, each prefixed "not:", the places it keeps
 * something out of ("never in Dorm H"), which a plan marks apart instead of
 * lighting. Space-separated, so CSS can match one with [data-places~="cafe"],
 * [data-places~="floor:floor1"] or [data-places~="not:dorm-h"].
 */
export function placesOf(rule: { readonly places: readonly Place[]; readonly avoid?: readonly Place[] }): string {
  const here = tokensOf(rule.places);
  const not = tokensOf(rule.avoid ?? []).filter((token) => !here.includes(token));
  return [...here, ...not.map((token) => `${AVOID}${token}`)].join(" ");
}

/**
 * A walk's stops as the stage places them (label, does, at…), for the text
 * beside a stage and for actRanges(); `floors` as the stage shows them.
 */
export function walkStops(route: string, floors?: readonly FloorId[]): readonly StageStop[] {
  return renderThreadLayer(route, { idPrefix: "", ...(floors ? { floors } : {}) }).stops;
}
