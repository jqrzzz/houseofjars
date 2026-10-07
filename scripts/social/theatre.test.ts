import { describe, expect, it } from "vitest";
import { MARK_PATH } from "../../components/brand/mark-shape";
import { houseRules } from "./pieces/house-rules";
import { archPath, BOARD, cropScale, easings, readTokens } from "./theatre";

describe("the theatre's shared parts", () => {
  it("reads the site's tokens for Day and Evening, and its easings", () => {
    const tokens = readTokens();
    const day = new Map(tokens.day);
    const evening = new Map(tokens.evening);
    expect(day.get("--jar-orange")).toBe("#e76e43");
    expect(evening.get("--paper-near")).toBe("var(--night-raised)");
    const curves = easings(tokens);
    expect(curves.lamp).toBe("cubic-bezier(0.3, 0, 0.1, 1)");
    // The shipped paper curve: a long glide with no overshoot.
    const stops = [...curves.paper.matchAll(/(\d*\.?\d+)(?: \d+%)?/g)].map((m) => Number(m[1]));
    expect(Math.max(...stops)).toBe(1);
  });

  it("cuts the arch to the mark's outline: the crown is 250/600 of the width", () => {
    expect(archPath(600, 900)).toBe("M0 900V250C0 98.13 117.75 0 300 0C482.25 0 600 98.13 600 250V900Z");
    expect(archPath(860, 900)).toMatch(/^M0 900V358\.3\d/);
    // The mark's pillars are the same arch, 600 wide.
    expect(MARK_PATH).toContain("600 250V900");
  });

  it("fills each board stage with its crop, and refuses a crop of another shape", () => {
    for (const row of houseRules.board.rows) {
      for (const format of ["gif", "still"] as const) expect(cropScale(row.crop, BOARD[format].stage)).toBeGreaterThan(0);
    }
    expect(cropScale({ x: 0, y: 0, width: 480, height: 600 }, BOARD.gif.stage)).toBeCloseTo(136 / 480, 9);
    expect(() => cropScale({ x: 0, y: 0, width: 480, height: 480 }, BOARD.gif.stage)).toThrow(/not the stage's shape/);
  });
});
