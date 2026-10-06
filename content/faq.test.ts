import { describe, expect, it } from "vitest";
import { collectFacts, factsMentionedIn } from "@/lib/content-audit";
import { content } from ".";
import { airportTransport } from "./area";
import { creditCues, isFirm, standingOf } from "./certainty";
import { faq, faqFor, type FaqGroup } from "./faq";
import { inlineToText } from "./inline";

const softFacts = collectFacts(content, "content").filter((found) => !isFirm(found.fact));

/** Answers that use a fact that isn't firm without saying who says so ("guests say", "travel sites report"…). */
function uncredited(groups: readonly FaqGroup[]): string[] {
  return groups.flatMap((group) =>
    group.entries.flatMap((entry) => {
      const answer = inlineToText(entry.answer);
      return factsMentionedIn(answer, softFacts).flatMap(({ fact, path }) =>
        creditCues[standingOf(fact) as keyof typeof creditCues].test(answer) ? [] : [`${entry.id}: ${path} without its source`],
      );
    }),
  );
}

describe("the FAQ", () => {
  it.each([
    ["without online booking", false],
    ["with online booking", true],
  ])("says who says so wherever an answer uses a fact that isn't firm, %s", (_, online) => {
    expect(uncredited(faqFor(online))).toEqual([]);
  });

  it("would catch what guests say written as certain", () => {
    const bold: FaqGroup = { title: "Test", entries: [{ id: "bold", question: "Airport?", answer: [airportTransport.value] }] };
    expect(uncredited([bold])).toEqual(["bold: content.airportTransport without its source"]);
  });

  it("tells smokers the terrace is no place to smoke either", () => {
    const quiet = inlineToText(faq.flatMap((group) => group.entries).find((entry) => entry.id === "quiet")!.answer);
    expect(quiet).toContain("no smoking in the house or on the terrace");
  });
});
