import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { creditCues, isFirm, standingOf } from "@/content/certainty";
import { collectFacts, factsMentionedIn } from "@/lib/content-audit";
import { standardRows } from "./Standards";

const softFacts = collectFacts(content, "content").filter((found) => !isFirm(found.fact));

describe("the house's standards on the home page", () => {
  it("say who says so for anything that isn't firm, and stamp only what is", () => {
    for (const row of standardRows) {
      const text = [row.term, row.value, row.note].join(" ");
      for (const { fact, path } of factsMentionedIn(text, softFacts)) {
        expect(creditCues[standingOf(fact) as keyof typeof creditCues].test(text), `${row.term}: ${path}`).toBe(true);
      }
      if (row.stamp) expect(factsMentionedIn(row.stamp, softFacts), row.term).toEqual([]);
    }
  });

  it("tell smokers the terrace is no place to smoke either", () => {
    const smoking = standardRows.find((row) => row.term === "Smoking")!;
    expect(`${smoking.value}. ${smoking.note}`).toContain("Not in the house or on the terrace");
  });
});
