import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { beds } from "@/content/stay";
import { buildShadowProfile, profileJson } from "./profile";

/*
 * The limits are Shadow Check-in's (its lib/rooms/attributes.ts, lib/rooms/edit.ts,
 * lib/handbook/areas.ts and the facts' database function, migrations/049): a profile
 * that breaks one would stop half way through its import.
 */
const SHADOW = {
  factLength: 1000,
  roomDescription: 600,
  roomFeatures: 12,
  roomFeature: 60,
  staffNotes: 1000,
  bedsPerRoom: 100,
  bedName: /^[A-Za-z0-9\-_ ]{1,12}$/,
  rules: 50,
  rule: 1000,
  ruleTitle: 200,
  detail: 300,
} as const;

const profile = buildShadowProfile();

describe("the house profile for Shadow", () => {
  it("is committed as built: run npm run shadow:profile after changing the content or the house model", () => {
    expect(readFileSync(join(process.cwd(), "shadow/house-profile.json"), "utf8")).toBe(profileJson());
  });

  it("has the house's details, in Shadow's limits", () => {
    const { property } = profile;
    expect(property.name).toBe("House of Jars");
    for (const value of [property.address, property.district, property.province, property.phone]) {
      expect(value.length).toBeGreaterThan(0);
      expect(value.length).toBeLessThanOrEqual(SHADOW.detail);
    }
    expect([property.country, property.timezone, property.currency]).toEqual(["LA", "Asia/Vientiane", "LAK"]);
  });

  it("has both dorms with every pod of the bed register, and none of the skipped numbers", () => {
    expect(profile.rooms.map((room) => room.name)).toEqual(["Dorm H", "Dorm J"]);
    for (const room of profile.rooms) {
      const letter = room.name.slice(-1);
      expect(room.beds).toHaveLength(beds.podsPerDorm.value);
      expect(room.beds.filter((bed) => bed.type === "top_bunk")).toHaveLength(beds.podsPerDorm.value / 2);
      const names = room.beds.map((bed) => bed.name);
      expect(new Set(names).size).toBe(names.length);
      for (const name of names) {
        expect(name).toMatch(new RegExp(`^${letter}\\d\\d$`));
        expect(beds.numbering.value.skipped).not.toContain(Number(name.slice(1)));
      }
    }
  });

  it("keeps every room and bed within what Shadow accepts", () => {
    for (const room of profile.rooms) {
      expect(room.description.length).toBeLessThanOrEqual(SHADOW.roomDescription);
      expect(room.features.length).toBeLessThanOrEqual(SHADOW.roomFeatures);
      for (const feature of room.features) expect(feature.length).toBeLessThanOrEqual(SHADOW.roomFeature);
      expect(room.staffNotes.length).toBeLessThanOrEqual(SHADOW.staffNotes);
      expect(room.beds.length).toBeGreaterThan(0);
      expect(room.beds.length).toBeLessThanOrEqual(SHADOW.bedsPerRoom);
      for (const bed of room.beds) expect(bed.name).toMatch(SHADOW.bedName);
    }
  });

  it("gives Shadow facts it can save, each once", () => {
    const contents = profile.facts.map((fact) => fact.content);
    expect(new Set(contents).size).toBe(contents.length);
    for (const fact of profile.facts) {
      expect(fact.content.length).toBeGreaterThanOrEqual(3);
      expect(fact.content.length).toBeLessThanOrEqual(SHADOW.factLength);
      expect(fact.content).not.toMatch(/\s{2}/);
    }
    // The website's concierge describing itself, and the name's unconfirmed story, stay on the website.
    expect(contents.some((content) => content.startsWith("Who is Shadow?"))).toBe(false);
    expect(contents.some((content) => content.startsWith("Why is it called House of Jars?"))).toBe(false);
  });

  it("gives the tablet the house rules, each with its reason", () => {
    expect(profile.houseRules.title.length).toBeLessThanOrEqual(SHADOW.ruleTitle);
    expect(profile.houseRules.rules.length).toBeGreaterThan(0);
    expect(profile.houseRules.rules.length).toBeLessThanOrEqual(SHADOW.rules);
    for (const rule of profile.houseRules.rules) expect(rule.length).toBeLessThanOrEqual(SHADOW.rule);
    expect(profile.houseRules.rules[0]).toMatch(/^No shoes upstairs/);
  });
});
