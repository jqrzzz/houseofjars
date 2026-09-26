import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { fact } from "@/content/fact";
import { collectFacts, describeValue, unconfirmedFacts } from "./content-audit";

describe("content audit", () => {
  const tree = {
    a: fact("x", "source A", { confirmed: true }),
    nested: { b: fact(2, "source B"), list: [fact(["y"], "source C", { note: "check" })] },
    empty: null,
    plain: "not a fact",
  };

  it("finds every fact with a readable path", () => {
    expect(collectFacts(tree, "tree").map((found) => found.path)).toEqual(["tree.a", "tree.nested.b", "tree.nested.list[0]"]);
  });

  it("lists only the unconfirmed ones", () => {
    expect(unconfirmedFacts(tree, "tree").map((found) => found.path)).toEqual(["tree.nested.b", "tree.nested.list[0]"]);
  });

  it("shortens long values to one line", () => {
    expect(describeValue("short")).toBe("short");
    expect(describeValue({ a: 1 })).toBe('{"a":1}');
    expect(describeValue("x".repeat(200))).toHaveLength(110);
  });

  it("finds the site's real facts, each with a source", () => {
    const facts = collectFacts(content, "content");
    expect(facts.length).toBeGreaterThan(40);
    expect(facts.every((found) => found.fact.source.trim().length > 0)).toBe(true);
    expect(facts.map((found) => found.path)).toContain("content.identity.address.street");
    // Nothing from public listings is confirmed until the house says so.
    expect(unconfirmedFacts(content, "content").map((found) => found.path)).toContain("content.times.checkIn");
  });
});
