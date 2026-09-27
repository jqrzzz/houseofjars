import { describe, expect, it } from "vitest";
import { lichen, num, seeded, specks, stoneJar, stoneLid } from "./stone-jar";

const numbers = (path: string) => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
/** The y values of a path made only of absolute M, L and Q commands (x y pairs). */
const ys = (path: string) => numbers(path).filter((_, index) => index % 2 === 1);

describe("num", () => {
  it("rounds to one decimal and never writes -0", () => {
    expect(num(12.345)).toBe("12.3");
    expect(num(-0.04)).toBe("0");
    expect(num(7)).toBe("7");
  });
});

describe("stoneJar", () => {
  const spec = { w: 200, h: 300 } as const;

  it("draws the same jar every time, and a different one for another seed", () => {
    expect(stoneJar(spec)).toEqual(stoneJar(spec));
    expect(stoneJar({ ...spec, seed: 2 }).body).not.toBe(stoneJar(spec).body);
  });

  it("closes every shape and keeps the jar inside its box", () => {
    const jar = stoneJar(spec);
    for (const part of [jar.body, jar.top, jar.mouth, jar.collar, jar.stains, jar.mound]) {
      expect(part.startsWith("M")).toBe(true);
      expect(part.endsWith("Z")).toBe(true);
    }
    const bodyYs = ys(jar.body);
    expect(Math.min(...bodyYs)).toBeGreaterThanOrEqual(jar.box.y);
    expect(Math.max(...bodyYs)).toBeLessThanOrEqual(jar.box.y + jar.box.height);
    expect(jar.box.width).toBeGreaterThan(spec.w);
  });

  it("stands on its foot and rises to its full height", () => {
    const jar = stoneJar(spec);
    // The outline starts at the foot, just above the ground line, and the worn back of the rim reaches about -h.
    expect(numbers(jar.body)[1]).toBe(-2);
    const top = Math.min(...ys(jar.body));
    expect(top).toBeLessThan(-spec.h * 0.97);
    expect(top).toBeGreaterThan(-spec.h * 1.03);
  });

  it("is hewn, not turned: its two sides are not mirror images", () => {
    const jar = stoneJar(spec);
    const xs = numbers(jar.body).filter((_, index) => index % 2 === 0);
    expect(Math.max(...xs)).not.toBeCloseTo(-Math.min(...xs), 0);
  });

  it("breaks, chips and cracks only when asked", () => {
    const whole = stoneJar(spec);
    expect(whole.bite).toBe("");
    expect(whole.biteEdge).toBe("");
    expect(whole.crack).toBe("");

    const broken = stoneJar({ ...spec, bite: { at: 0.3, width: 0.5, depth: 0.2 }, crack: { at: -0.3, length: 0.4 } });
    expect(broken.bite.startsWith("M")).toBe(true);
    expect(broken.bite.endsWith("Z")).toBe(true);
    expect(broken.biteEdge.startsWith("M")).toBe(true);
    // The break runs down from the opening, about as deep as asked.
    const biteYs = ys(broken.bite);
    const depth = Math.max(...biteYs) - Math.min(...biteYs);
    expect(depth).toBeGreaterThan(spec.h * 0.2);
    expect(depth).toBeLessThan(spec.h * 0.4);
    // The crack is a line: it starts at the rim and never closes.
    expect(broken.crack.startsWith("M")).toBe(true);
    expect(broken.crack).not.toContain("Z");
  });
});

describe("stoneLid", () => {
  it("draws a closed disc and its edge, the same every time", () => {
    const lid = stoneLid(50, 10, 16);
    expect(lid).toEqual(stoneLid(50, 10, 16));
    for (const part of [lid.top, lid.side]) {
      expect(part.startsWith("M")).toBe(true);
      expect(part.endsWith("Z")).toBe(true);
    }
  });
});

describe("seeded and lichen", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = seeded(5);
    const b = seeded(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("scatters the asked number of specks, as round-capped dots", () => {
    expect(lichen(3, 0, 0, 10, 6).match(/M/g)).toHaveLength(6);
    expect(specks([[1.25, -2]])).toBe("M1 -2h0");
  });
});
