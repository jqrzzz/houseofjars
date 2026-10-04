import { describe, expect, it } from "vitest";
import { collectFacts } from "@/lib/content-audit";
import { content } from ".";
import { immigration, plainOfJars } from "./area";
import { creditFor, firm, isFirm, standingOf } from "./certainty";
import { fact, type Fact } from "./fact";
import { identity } from "./identity";
import { sources } from "./sources";
import { bathrooms, times } from "./stay";

describe("how firmly a fact may be stated", () => {
  it("knows the kind of every source the site uses, so no fact is judged by accident", () => {
    const unknown = collectFacts(content, "content").filter((found) => standingOf(found.fact) === "unknown");
    expect(unknown.map((found) => `${found.path}: ${found.fact.source}`)).toEqual([]);
  });

  it("states the house's own listings, official sources and confirmed facts plainly", () => {
    expect(standingOf(times.checkIn)).toBe("listing");
    expect(standingOf(immigration.ldif)).toBe("official");
    expect(standingOf(plainOfJars.summary)).toBe("confirmed");
    for (const firmFact of [times.checkIn, immigration.ldif, plainOfJars.summary]) expect(isFirm(firmFact)).toBe(true);
    expect(firm(times.checkIn)).toBe(times.checkIn.value);
    expect(creditFor(times.checkIn)).toBeNull();
  });

  it("credits what guests say, one source, general practice and assumptions instead", () => {
    const seenOnce = fact("Shoes off indoors.", sources.oneReview);
    expect([bathrooms.cleaning, seenOnce, immigration.registration, identity.nameStory].map(standingOf)).toEqual([
      "guests",
      "one-source",
      "practice",
      "assumption",
    ]);
    const soft: Fact<unknown>[] = [bathrooms.cleaning, seenOnce, immigration.registration, identity.nameStory];
    for (const found of soft) {
      expect(isFirm(found)).toBe(false);
      expect(firm(found)).toBeUndefined();
      expect(creditFor(found)).toMatch(/\w/);
    }
  });

  it("treats a fact from an unknown source as unconfirmed until the house confirms it", () => {
    const told = fact("22:00–07:00", "Nang, by WhatsApp");
    expect(standingOf(told)).toBe("unknown");
    expect(isFirm(told)).toBe(false);
    expect(creditFor(told)).toBe("not yet confirmed");
    expect(isFirm(fact("22:00–07:00", "Nang, by WhatsApp", { confirmed: true }))).toBe(true);
    expect(firm(null)).toBeUndefined();
  });
});
