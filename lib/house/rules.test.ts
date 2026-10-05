import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { rules } from "@/content/stay";
import { describeHouse } from "./context";
import { houseOfJars as model } from "./house-of-jars";
import { placedHouseRules, placedRules, rulesAt } from "./rules";

describe("the house rules, placed in the house", () => {
  const placed = placedHouseRules();

  it("places every rule of content/stay.ts exactly once, so a new rule cannot go unplaced", () => {
    const all = [...rules.house, ...rules.stay].map((f) => f.value.rule);
    expect(placed.map((r) => r.rule).sort()).toEqual([...all].sort());
  });

  it("gives every placed rule a unique id and a sentence for guides", () => {
    expect(new Set(placedRules.map((r) => r.id)).size).toBe(placedRules.length);
    for (const r of placedRules) expect(r.where, r.id).toMatch(/\.$/);
  });

  it("points only at places that exist in the model", () => {
    const areas = new Set(model.areas.map((a) => a.id));
    const floors = new Set(model.floors.map((f) => f.id));
    const fixtures = new Set(model.fixtures.map((f) => f.id));
    for (const r of placedRules) {
      for (const place of r.places) {
        if ("area" in place) expect(areas.has(place.area), `${r.id}: ${place.area}`).toBe(true);
        else if ("floor" in place) expect(floors.has(place.floor), `${r.id}: ${place.floor}`).toBe(true);
        else expect(fixtures.has(place.fixture), `${r.id}: ${place.fixture}`).toBe(true);
      }
    }
  });

  it("only rules about the whole house or the stay may have no place", () => {
    for (const r of placedRules.filter((x) => x.places.length === 0)) expect(["house", "stay"], r.id).toContain(r.scope);
  });

  it("finds the rules where guests meet them", () => {
    const ids = (area: string) => rulesAt(model, area, placed).map((r) => r.id);
    expect(ids("stairs-ground")).toEqual(expect.arrayContaining(["no-shoes-upstairs", "registered-guests-upstairs"]));
    expect(ids("landing-1")).toContain("no-shoes-upstairs");
    expect(ids("dorm-h")).toEqual(expect.arrayContaining(["eat-in-the-cafe", "quiet", "no-shoes-upstairs", "check-out-hours"]));
    expect(ids("dorm-j")).toEqual(expect.arrayContaining(["eat-in-the-cafe", "quiet", "no-shoes-upstairs"]));
    expect(ids("desk")).toEqual(expect.arrayContaining(["check-in-hours", "passport", "deposit"]));
    expect(ids("entrance")).toContain("front-door-locked");
    expect(ids("cafe")).toEqual(expect.arrayContaining(["eat-in-the-cafe", "pack-downstairs"]));
    expect(() => rulesAt(model, "nowhere", placed)).toThrow(/Unknown area/);
  });
});

describe("the house in words", () => {
  it("names every floor and area, and counts the pods with their numbers", () => {
    const text = describeHouse();
    for (const f of model.floors) expect(text).toContain(`## ${f.name}`);
    for (const a of model.areas) expect(text).toContain(a.name);
    expect(text).toContain("14 pods (H01 to H17, with no H04, H13 or H14)");
    expect(text).toContain("14 pods (J01 to J17, with no J04, J13 or J14)");
    expect(text).toContain("## House customs");
    expect(text).toContain("30 shoe cubbies");
    expect(text).not.toMatch(/undefined|NaN/);
  });

  it("is the same every time, and the committed copy in docs/ matches the model", () => {
    expect(describeHouse()).toBe(describeHouse());
    const committed = readFileSync(join(process.cwd(), "docs/house-context.md"), "utf8");
    expect(committed).toBe(describeHouse());
  });
});
