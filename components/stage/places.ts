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

/**
 * The areas a placed rule names, for its <li data-places>: an area itself, every
 * area on a floor it names, the area a fixture stands in. Space-separated, in
 * the model's order, so CSS can match one with [data-places~="cafe"].
 */
export function placesOf(rule: { readonly places: readonly Place[] }): string {
  const named = new Set<string>();
  for (const place of rule.places) {
    if ("area" in place) {
      named.add(place.area);
    } else if ("floor" in place) {
      for (const area of houseOfJars.areas) if (area.floor === place.floor) named.add(area.id);
    } else {
      const fixture = houseOfJars.fixtures.find((f) => f.id === place.fixture);
      if (fixture) named.add(fixture.area);
    }
  }
  return houseOfJars.areas
    .map((a) => a.id)
    .filter((id) => named.has(id))
    .join(" ");
}

/**
 * A walk's stops as the stage places them (label, does, at…), for the text
 * beside a stage and for actRanges(); `floors` as the stage shows them.
 */
export function walkStops(route: string, floors?: readonly FloorId[]): readonly StageStop[] {
  return renderThreadLayer(route, { idPrefix: "", ...(floors ? { floors } : {}) }).stops;
}
