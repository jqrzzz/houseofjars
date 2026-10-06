import { describe, expect, it } from "vitest";
import { photos } from "@/content/photos";
import { placedHouseRules } from "@/lib/house/rules";
import { anchorOf, planOverlay } from "@/lib/house/paper";
import { cameraNumber, cameraSpots, placesOf, walkStops } from "./places";

const rule = (id: string) => placedHouseRules().find((r) => r.id === id)!;

describe("cameraSpots", () => {
  it("numbers only photos with a place, in the order given, at their area", () => {
    const spots = cameraSpots(["wallOfJars", "dormFan", "lamp", "stairsJar"]);
    expect(spots).toEqual([
      { n: 1, key: "dormFan", caption: photos.dormFan.caption, anchor: "area-dorm-h" },
      { n: 2, key: "stairsJar", caption: photos.stairsJar.caption, anchor: "area-landing-1" },
    ]);
    expect(cameraNumber(["dormFan", "stairsJar"], "stairsJar")).toBe(2);
    expect(cameraNumber(["dormFan"], "lamp")).toBeUndefined();
  });

  it("places every photo with a place somewhere on the stage", () => {
    for (const key of Object.keys(photos) as (keyof typeof photos)[]) {
      const area = photos[key].place?.area;
      if (area) expect(anchorOf(`area-${area}`), key).toBeDefined();
    }
  });
});

describe("placesOf", () => {
  it("names a rule's areas, a floor's areas and a fixture's area", () => {
    const shoes = placesOf(rule("no-shoes-upstairs")).split(" ");
    expect(shoes).toEqual(expect.arrayContaining(["stairs-ground", "landing-1", "dorm-h", "bath-women", "dorm-j"]));
    expect(placesOf(rule("smoke-past-the-terrace"))).toBe("terrace");
    expect(placesOf(rule("check-in-hours"))).toBe("desk");
    expect(placesOf(rule("no-smoking"))).toBe("");
  });

  it("names only areas the rule plans can light", () => {
    const planned = new Set([...planOverlay("ground").areas, ...planOverlay("floor1").areas].map((a) => a.id));
    for (const r of placedHouseRules()) {
      const named = placesOf(r).split(" ").filter(Boolean);
      // Floor 2's areas have no plan here; every other area named does.
      for (const id of named.filter((a) => !["dorm-j", "landing-2", "bath-men"].includes(a))) expect(planned.has(id), `${r.id}: ${id}`).toBe(true);
    }
  });
});

describe("walkStops", () => {
  it("gives the arrival walk's five stops with their text, in walking order", () => {
    const stops = walkStops("arrival", ["ground", "floor1"]);
    expect(stops.map((s) => s.label)).toEqual(["Front door", "Check in", "Shoes off", "Shoes", "Pod H01"]);
    expect(stops.every((s) => s.does)).toBe(true);
    expect(stops.at(-1)?.at).toBe(1);
  });
});
