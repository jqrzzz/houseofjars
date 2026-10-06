import { describe, expect, it } from "vitest";
import { photos } from "@/content/photos";
import { houseOfJars as model } from "@/lib/house/house-of-jars";
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
  it("names a rule's areas, the area of a fixture it names, and the floors it names whole", () => {
    expect(placesOf(rule("no-shoes-upstairs"))).toBe("stairs-ground landing-1 floor:floor1 floor:floor2");
    expect(placesOf(rule("registered-guests-upstairs"))).toBe("stairs-ground floor:floor1 floor:floor2");
    expect(placesOf(rule("smoke-past-the-terrace"))).toBe("terrace");
    expect(placesOf(rule("check-in-hours"))).toBe("desk");
    expect(placesOf(rule("no-smoking"))).toBe("");
  });

  it("names the places a rule keeps something out of apart, with not:", () => {
    expect(placesOf(rule("eat-in-the-cafe"))).toBe("cafe not:dorm-h not:dorm-j");
    expect(placesOf(rule("pack-downstairs"))).toBe("cafe not:dorm-h not:dorm-j");
    expect(placesOf(rule("quiet"))).toBe("dorm-h dorm-j");
  });

  it("names only areas the rule plans can light, and floors of the house", () => {
    const planned = new Set([...planOverlay("ground").areas, ...planOverlay("floor1").areas].map((a) => a.id));
    const floors = new Set<string>(model.floors.map((f) => f.id));
    for (const r of placedHouseRules()) {
      for (const token of placesOf(r).split(" ").filter(Boolean)) {
        const place = token.replace(/^not:/, "");
        if (place.startsWith("floor:")) expect(floors.has(place.slice("floor:".length)), `${r.id}: ${token}`).toBe(true);
        // The 2nd floor's areas have no plan here; every other area named does.
        else if (!["dorm-j", "landing-2", "bath-men"].includes(place)) expect(planned.has(place), `${r.id}: ${token}`).toBe(true);
      }
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
