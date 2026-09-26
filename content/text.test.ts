import { describe, expect, it } from "vitest";
import { countWord, joinList, laoNumeral, lowerFirst } from "./text";

describe("text helpers", () => {
  it("writes Lao digits", () => {
    expect(laoNumeral(1)).toBe("໑");
    expect(laoNumeral(3)).toBe("໓");
    expect(laoNumeral(10)).toBe("໑໐");
    expect(() => laoNumeral(1.5)).toThrow(RangeError);
  });

  it("joins lists and counts in words", () => {
    expect(joinList(["a", "b", "c"])).toBe("a, b and c");
    expect(countWord(2)).toBe("Two");
    expect(lowerFirst("Cleaned")).toBe("cleaned");
  });
});
