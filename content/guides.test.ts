import { describe, expect, it } from "vitest";
import { collectFacts, factsMentionedIn } from "@/lib/content-audit";
import { allPages } from "@/lib/pages";
import { CONTENT_UPDATED, content } from ".";
import { airportTransport } from "./area";
import { creditCues, isFirm, standingOf } from "./certainty";
import { faq } from "./faq";
import { guideList, guidePath, type Guide } from "./guides";
import { inlineToText, type Inline } from "./inline";

const everyFact = collectFacts(content, "content");
const softFacts = everyFact.filter((found) => !isFirm(found.fact));
const text = (parts: readonly Inline[]) => inlineToText(parts);
const today = new Date().toISOString().slice(0, 10);

/** The pieces of a guide a reader takes in as one statement, each checked on its own. */
function statements(guide: Guide): { where: string; text: string }[] {
  return [
    { where: "teaser", text: guide.teaser },
    { where: "description", text: guide.description },
    { where: "answer", text: text(guide.answer) },
    ...guide.glance.rows.map((row) => ({ where: `glance "${row.term}"`, text: [row.term, row.value, row.note].join(" ") })),
    ...guide.sections.flatMap((section) => {
      const heading = [section.title, section.aside ?? ""].join(" ");
      switch (section.kind) {
        case "steps":
          return section.steps.map((step) => ({ where: `step "${step.title}"`, text: `${step.title} ${text(step.body)}` }));
        case "text":
          return [{ where: section.id, text: [heading, ...section.paragraphs.map(text)].join(" ") }];
        case "list":
          return [{ where: section.id, text: [heading, ...section.items.map(text)].join(" ") }];
        case "address":
          return [];
      }
    }),
  ];
}

/** Facts that aren't firm, used without saying who says so or without being listed in the guide's facts. */
function uncredited(guide: Guide): string[] {
  return statements(guide).flatMap((statement) =>
    factsMentionedIn(statement.text, softFacts).flatMap((found) => {
      const cue = creditCues[standingOf(found.fact) as keyof typeof creditCues];
      return [
        ...(cue.test(statement.text) ? [] : [`${statement.where}: ${found.path} without its source`]),
        ...(guide.facts.includes(found.fact) ? [] : [`${statement.where}: ${found.path} is not in the guide's facts`]),
      ];
    }),
  );
}

/** Every link a guide or the FAQ writes, internal ones as paths. */
function links(guide: Guide): string[] {
  const parts: Inline[] = [
    ...guide.answer,
    ...guide.sections.flatMap((section) =>
      section.kind === "steps"
        ? section.steps.flatMap((step) => step.body)
        : section.kind === "text"
          ? section.paragraphs.flat()
          : section.kind === "list"
            ? section.items.flat()
            : [],
    ),
  ];
  return [
    ...parts.flatMap((part) => (typeof part === "string" ? [] : [part.href])),
    ...guide.glance.rows.flatMap((row) => (row.href ? [row.href] : [])),
  ];
}

describe.each(guideList.map((guide) => [guide.slug, guide] as const))("the guide %s", (_, guide) => {
  it("opens with its question and a short, direct answer", () => {
    expect(guide.question).toMatch(/\?$/);
    expect(text(guide.answer).length).toBeGreaterThan(60);
    expect(text(guide.answer).length).toBeLessThanOrEqual(320);
    expect(guide.glance.rows.length).toBeGreaterThanOrEqual(3);
  });

  it("uses only facts from the content layer", () => {
    for (const used of guide.facts) expect(everyFact.some((found) => found.fact === used)).toBe(true);
  });

  it("says who says so wherever it uses a fact that isn't firm, and lists its source", () => {
    expect(uncredited(guide)).toEqual([]);
  });

  it("links only to pages that exist, and on to two or three others", () => {
    const paths = allPages.map((page) => page.path);
    for (const href of [...links(guide), ...guide.related]) {
      if (href.startsWith("/")) expect(paths).toContain(href.split(/[?#]/)[0]);
      else expect(href).toMatch(/^https:\/\//);
    }
    expect(guide.related.length).toBeGreaterThanOrEqual(2);
    expect(guide.related.length).toBeLessThanOrEqual(3);
    expect(guide.related).not.toContain(guidePath(guide));
  });

  it("was reviewed after its facts were read, and not in the future", () => {
    expect(guide.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(guide.reviewed >= CONTENT_UPDATED && guide.reviewed <= today).toBe(true);
  });
});

describe("guides", () => {
  it("would catch what guests say written as certain, or a source left out", () => {
    const [airportGuide] = guideList;
    const bold = {
      ...airportGuide!,
      answer: [`${airportTransport.value} Just message them.`],
      facts: airportGuide!.facts.filter((used) => used !== airportTransport),
    };
    expect(uncredited(bold)).toEqual([
      "answer: content.airportTransport without its source",
      "answer: content.airportTransport is not in the guide's facts",
    ]);
  });

  it("have their own addresses", () => {
    const slugs = guideList.map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("are linked from the FAQ, which links only to pages that exist", () => {
    const paths = allPages.map((page) => page.path);
    const hrefs = faq.flatMap((group) =>
      group.entries.flatMap((entry) => entry.answer.flatMap((part) => (typeof part === "string" ? [] : [part.href]))),
    );
    for (const href of hrefs.filter((candidate) => candidate.startsWith("/"))) expect(paths).toContain(href.split(/[?#]/)[0]);
    for (const guide of guideList) expect(hrefs).toContain(guidePath(guide));
  });
});
