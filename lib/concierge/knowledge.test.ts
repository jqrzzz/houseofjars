import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { creditCues, isFirm, standingOf } from "@/content/certainty";
import { beds, staff } from "@/content/stay";
import { collectFacts, factsMentionedIn } from "../content-audit";
import { buildHouseKnowledge } from "./knowledge";

const site = "https://thehouseofjars.com";
const softFacts = collectFacts(content, "content").filter((found) => !isFirm(found.fact));

/** Lines using a fact that isn't firm where neither the line nor its section's heading says who says so. */
function uncredited(knowledge: string): string[] {
  return knowledge
    .split(/^## /m)
    .filter(Boolean)
    .flatMap((section) => {
      const [heading = "", ...lines] = section.split("\n");
      return lines.flatMap((line) =>
        factsMentionedIn(line, softFacts).flatMap(({ fact, path }) => {
          const cue = creditCues[standingOf(fact) as keyof typeof creditCues];
          return cue.test(line) || cue.test(heading) ? [] : [`${heading}: ${path}: ${line}`];
        }),
      );
    });
}

describe("Shadow's house knowledge", () => {
  it.each([
    ["without online booking", false],
    ["with online booking", true],
  ])("says who says so wherever it uses a fact that isn't firm, %s", (_, onlineBooking) => {
    expect(uncredited(buildHouseKnowledge(site, { onlineBooking }))).toEqual([]);
  });

  it("would catch what guests say written as certain", () => {
    expect(uncredited("## Getting here\n- The team can arrange transport from the airport.")).toHaveLength(1);
  });

  it("counts the floors as the house has them: two floors of dorms above the café", () => {
    const knowledge = buildHouseKnowledge(site);
    expect(knowledge).toContain("- Two floors of pod dorms, above a café on the ground floor.");
    expect(knowledge).not.toMatch(/\b\d+ floors\b/);
  });

  it("knows what the house has confirmed about the dorms, the bed numbers and the team's round", () => {
    const knowledge = buildHouseKnowledge(site);
    expect(knowledge).toContain(`- Each dorm has ${beds.podsPerDorm.value} pods.`);
    expect(knowledge).toContain("- There is no pod 4, 13 or 14, so no guest is given an unlucky bed.");
    expect(knowledge).toContain(`- The team looks over and cleans the house ${staff.housekeepingRound.value}.`);
    expect(knowledge).not.toContain("14-bed dorm");
  });
});
