import { describe, expect, it } from "vitest";
import { type Node, S, box, behind, depthSort, isoProjection, num, planProjection, prismFaces } from "./geometry";

const D = 16;

describe("projections", () => {
  it("puts the front-right corner nearest (lowest on screen) in the isometric view", () => {
    const p = isoProjection(D);
    const corners = [
      [0, 0],
      [4, 0],
      [0, D],
      [4, D],
    ].map(([x, y]) => ({ x, y, sy: p.point([x!, y!, 0])[1] }));
    const lowest = corners.reduce((a, b) => (b.sy > a.sy ? b : a));
    expect([lowest.x, lowest.y]).toEqual([4, 0]);
    // The street side runs to the lower left, the depth to the upper right.
    expect(p.point([0, 0, 0])[0]).toBeLessThan(p.point([0, D, 0])[0]);
    expect(p.point([0, 0, 0])[1]).toBeGreaterThan(p.point([0, D, 0])[1]);
  });

  it("follows the spec's formula: X = (u - v) cos30 S, Y = (u + v) sin30 S - z S", () => {
    const [x, y] = isoProjection(D).point([1, 3, 2]);
    const u = 1;
    const v = D - 3;
    expect(x).toBeCloseTo((u - v) * Math.cos(Math.PI / 6) * S, 9);
    expect(y).toBeCloseTo((u + v) * 0.5 * S - 2 * S, 9);
  });

  it("draws plans with the street at the bottom and the left wall on the left", () => {
    const p = planProjection(D, 50);
    expect(p.point([0, 0, 0])).toEqual([0, 800]);
    expect(p.point([4, D, 0])).toEqual([200, 0]);
  });
});

describe("painter's sorting", () => {
  const node = (b: ReturnType<typeof box>): Node => ({ box: b });

  it("knows what is behind: further left, further back, or lower", () => {
    const a = box(0, 1, 0, 1, 0, 1);
    expect(behind(a, box(1, 2, 0, 1, 0, 1))).toBe(true);
    expect(behind(box(0, 1, 2, 3, 0, 1), a)).toBe(true);
    expect(behind(a, box(0, 1, 0, 1, 1, 2))).toBe(true);
    expect(behind(a, box(0.5, 1.5, 0.5, 1.5, 0.5, 1.5))).toBeUndefined();
  });

  it("draws a long wall behind a small box in front of it, though the wall's middle is nearer", () => {
    // A long left wall (its centre is far forward in u + v) and a stool against its far end.
    const wall = node(box(-0.15, 0, 0, D, 0, 3));
    const stool = node(box(0.1, 0.4, 15, 15.3, 0, 0.6));
    expect(depthSort([stool, wall], D)).toEqual([wall, stool]);
    expect(depthSort([wall, stool], D)).toEqual([wall, stool]);
  });

  it("sorts boxes whose outlines overlap, and keeps the given order where they do not", () => {
    const back = node(box(0, 1, 2, 3, 0, 1));
    const front = node(box(0, 1, 0, 1, 0, 1));
    const aside = node(box(10, 11, 10, 11, 5, 6));
    expect(depthSort([front, aside, back], D).indexOf(back)).toBeLessThan(depthSort([front, aside, back], D).indexOf(front));
  });

  it("shows only the sides of an extruded shape that face the camera, sorted, then its top", () => {
    const square: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    const faces = prismFaces(square, 0, 1, D, { top: "t", front: "f", right: "r" });
    expect(faces.map((f) => f.cls)).toEqual(["f", "r", "t"]);
  });
});

describe("numbers", () => {
  it("rounds to one decimal, without -0", () => {
    expect(num(1.26)).toBe("1.3");
    expect(num(-0.04)).toBe("0");
    expect(num(12)).toBe("12");
    expect(num(-3.35)).toBe("-3.3");
  });
});
