import { describe, expect, it } from "vitest";
import { noBreakHyphens } from "./no-break";

describe("non-breaking hyphens in short headings", () => {
  it("joins words around a hyphen, and leaves other dashes alone", () => {
    expect(noBreakHyphens("What time is check-in and check-out?")).toBe("What time is check‑in and check‑out?");
    expect(noBreakHyphens("Is there air-conditioning and Wi-Fi?")).toBe("Is there air‑conditioning and Wi‑Fi?");
    expect(noBreakHyphens("21:00–07:00, 2026-10-04")).toBe("21:00–07:00, 2026-10-04");
  });
});
