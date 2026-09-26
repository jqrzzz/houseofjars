import { describe, expect, it } from "vitest";
import { lichen, num, seeded, specks, stoneJar } from "./stone-jar";

const numbers = (path: string) => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe("num", () => {
  it("rounds to one decimal and never writes -0", () => {
    expect(num(12.345)).toBe("12.3");
    expect(num(-0.04)).toBe("0");
    expect(num(7)).toBe("7");
  });
});

describe("stoneJar", () => {
  const spec = { w: 200, h: 300 } as const;

  it("draws the same jar every time", () => {
    expect(stoneJar(spec)).toEqual(stoneJar(spec));
  });

  it("closes every shape and keeps the jar inside its box", () => {
    const jar = stoneJar(spec);
    for (const part of [jar.body, jar.top, jar.mouth, jar.ledge, jar.under, jar.litPlanes, jar.darkPlanes]) {
      expect(part.startsWith("M")).toBe(true);
      expect(part.endsWith("Z")).toBe(true);
    }
    // Nothing reaches above the top of the box (y grows downwards; the jar rises into negative y).
    expect(Math.min(...numbers(jar.body))).toBeGreaterThanOrEqual(jar.box.y);
    expect(jar.box.width).toBeGreaterThan(spec.w);
  });

  it("stands on its foot and rises to its full height", () => {
    const jar = stoneJar(spec);
    // The body starts at the foot, just above the ground line, and the rim's top reaches -h.
    expect(jar.body.startsWith("M")).toBe(true);
    expect(numbers(jar.body)[1]).toBe(-2);
    // The rim's flat top is an ellipse centred just below -h (default lip 0.9, top 0.08).
    expect(jar.top).toContain(` ${num(-spec.h + (spec.w / 2) * 0.9 * 0.08)}`);
  });

  it("chips the rim only when asked", () => {
    const whole = stoneJar(spec);
    const chipped = stoneJar({ ...spec, notch: 0.3 });
    expect(chipped.body).not.toBe(whole.body);
    expect(chipped.body.length).toBeGreaterThan(whole.body.length);
    expect(chipped.mouth).toBe(whole.mouth);
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
    expect(specks([[1.25, -2]])).toBe("M1.3 -2h0");
  });
});
