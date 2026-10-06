import { describe, expect, it } from "vitest";
import walks from "../../public/house/walks.json";
import {
  HOLD,
  LIGHT_LEAD,
  RING_LEAD,
  actAt,
  actRanges,
  arriveFrames,
  beadFrames,
  keyframes,
  lightName,
  shareAlong,
  shareAt,
  stageKeyframes,
  threadFrames,
  walkClock,
} from "./acts";

const arrival = walks.routes.arrival.stops;

describe("walkClock", () => {
  const clock = walkClock(arrival);

  it("runs from the start of the act to its end, never backwards", () => {
    expect(clock[0]).toEqual({ u: 0, p: 0 });
    expect(clock[clock.length - 1]).toEqual({ u: 1, p: 1 });
    for (let i = 1; i < clock.length; i++) {
      expect(clock[i]!.u).toBeGreaterThanOrEqual(clock[i - 1]!.u);
      expect(clock[i]!.p).toBeGreaterThanOrEqual(clock[i - 1]!.p);
    }
  });

  it("reaches each stop when the act is at the stop's share of the walk", () => {
    for (const stop of arrival) {
      expect(shareAt(clock, stop.at)).toBeCloseTo(stop.at, 6);
      expect(actAt(clock, stop.at)).toBeCloseTo(stop.at, 6);
    }
  });

  it("rests a moment at every stop but the last", () => {
    for (const stop of arrival.slice(0, -1)) {
      expect(shareAt(clock, stop.at + 0.02)).toBeCloseTo(stop.at, 6);
    }
  });

  it("rests long enough to be seen: its full hold wherever the next stop leaves room", () => {
    expect(HOLD).toBeGreaterThanOrEqual(0.06);
    arrival.slice(0, -1).forEach((stop, k) => {
      const rest = Math.min(HOLD, (arrival[k + 1]!.at - stop.at) * 0.4);
      expect(shareAt(clock, stop.at + rest - 1e-6)).toBeCloseTo(stop.at, 6);
    });
  });

  it("refuses stops out of walking order", () => {
    expect(() => walkClock([{ at: 0.5 }, { at: 0.2 }])).toThrow(/walking order/);
  });

  it("handles a walk that starts at a stop (the team's round)", () => {
    const round = walkClock(walks.routes["housekeeping-round"].stops);
    expect(round[0]).toEqual({ u: 0, p: 0 });
    expect(shareAt(round, 0.01)).toBe(0);
    expect(actAt(round, 1)).toBe(1);
  });
});

describe("actRanges", () => {
  it("lights stop i at 45 + 50·at % in the home theatre, until the next stop", () => {
    const ranges = actRanges(arrival, [45, 95]);
    expect(ranges.map((r) => r.label)).toEqual(["Front door", "Check in", "Shoes off", "Shoes", "Pod H01"]);
    ranges.forEach((r, i) => {
      expect(r.from).toBeCloseTo(45 + 50 * arrival[i]!.at, 2);
      expect(r.range).toBe(`contain ${r.from}% contain ${r.to}%`);
      if (i > 0) expect(r.from).toBe(ranges[i - 1]!.to);
    });
    expect(ranges.at(-1)).toMatchObject({ from: 95, to: 100 });
  });

  it("takes another named range, and refuses a stretch outside 0–100%", () => {
    expect(actRanges(arrival, [0, 100], "cover")[0]!.range).toBe("cover 9.7% cover 32.6%");
    expect(() => actRanges(arrival, [60, 40])).toThrow();
    expect(() => actRanges(arrival, [10, 120])).toThrow();
  });
});

describe("keyframes", () => {
  it("writes a compact rule, sharing selectors between repeated frames", () => {
    expect(
      keyframes("k", [
        { at: 50, css: "opacity:1" },
        { at: 0, css: "opacity:0" },
        { at: 20, css: "opacity:0" },
      ]),
    ).toBe("@keyframes k{0%,20%{opacity:0}50%{opacity:1}}");
  });
});

describe("threadFrames", () => {
  const clock = walkClock(arrival);
  const ground = walks.routes.arrival.shares.ground as [number, number];
  const floor1 = walks.routes.arrival.shares.floor1 as [number, number];

  it("draws the ground floor's thread from nothing to all while the walk is downstairs", () => {
    const frames = threadFrames(clock, ground);
    expect(frames[0]).toEqual({ at: 0, css: "stroke-dashoffset:1" });
    expect(frames.at(-1)).toEqual({ at: 100, css: "stroke-dashoffset:0" });
    const atStairs = frames.find((f) => Math.abs(f.at - actAt(clock, ground[1]) * 100) < 0.01);
    expect(atStairs?.css).toBe("stroke-dashoffset:0");
  });

  it("leaves Floor 1's thread undrawn until the walk climbs, and rests at Shoes", () => {
    const frames = threadFrames(clock, floor1);
    const before = frames.filter((f) => f.at <= floor1[0] * 100 + 1e-6);
    expect(before.every((f) => f.css === "stroke-dashoffset:1")).toBe(true);
    const shoes = arrival[3]!.at;
    const atShoes = frames.filter((f) => f.at >= shoes * 100 - 1e-6 && f.at <= (shoes + 0.05) * 100);
    expect(new Set(atShoes.map((f) => f.css)).size).toBe(1);
    expect(frames.at(-1)?.css).toBe("stroke-dashoffset:0");
  });
});

describe("beadFrames and arriveFrames", () => {
  const clock = walkClock(arrival);
  const ground = walks.routes.arrival.shares.ground as [number, number];
  const floor1 = walks.routes.arrival.shares.floor1 as [number, number];

  it("hides the ground floor's bead once the walk climbs, and keeps the last one on H01", () => {
    const down = beadFrames(clock, ground, false);
    expect(down.filter((f) => f.at === 100).map((f) => f.css)).toContain("opacity:0");
    const up = beadFrames(clock, floor1, true);
    expect(up.filter((f) => f.at === 100).map((f) => f.css)).toEqual(expect.arrayContaining(["opacity:1"]));
    expect(up.filter((f) => f.at === 0).map((f) => f.css)).toEqual(expect.arrayContaining(["offset-distance:0%", "opacity:0"]));
  });

  it("settles a ring as the thread reaches its stop", () => {
    const frames = arriveFrames(clock, arrival[1]!.at, { wait: "opacity:0", ahead: "opacity:.5", rest: "opacity:1" });
    expect(frames[0]).toEqual({ at: 0, css: "opacity:0" });
    expect(frames.at(-1)).toEqual({ at: arrival[1]!.at * 100, css: "opacity:1" });
  });
});

describe("shareAlong", () => {
  it("finds where a point lies along a polyline", () => {
    expect(shareAlong("M0 0L10 0L10 10", [10, 5])).toEqual({ share: 0.75, distance: 0 });
    expect(shareAlong("M0 0L10 0", [5, 3]).share).toBe(0.5);
    expect(shareAlong("M-1.5 2L-1.5 -8", [0, -3]).share).toBe(0.5);
  });
});

describe("stageKeyframes", () => {
  const clock = {
    ats: [0.1, 0.4, 1],
    shares: { ground: [0, 0.6], floor1: [0.6, 1] } as Record<string, readonly [number, number]>,
    last: "floor1",
    lights: [0.1, 0.104, 0.55, 1],
  };

  it("writes a thread and a bead per floor, a ring per stop and one set per moment a light comes on", () => {
    const css = stageKeyframes("s-", clock);
    const names = [...css.matchAll(/@keyframes ([\w-]+)\{/g)].map((m) => m[1]);
    expect(names).toEqual(["s-t-ground", "s-b-ground", "s-t-floor1", "s-b-floor1", "s-r0", "s-r1", "s-r2", "s-l10", "s-l55", "s-l100"]);
  });

  it("warms a light and settles a ring over a stretch of the act, not in a blink", () => {
    expect(LIGHT_LEAD).toBeGreaterThanOrEqual(0.06);
    expect(RING_LEAD).toBeGreaterThanOrEqual(0.05);
    const css = stageKeyframes("s-", clock);
    const light = new RegExp(`@keyframes ${lightName("s-", 0.55)}\\{([^@]*)\\}`).exec(css)?.[1] ?? "";
    const offsets = [...light.matchAll(/([\d.]+)%/g)].map((m) => Number(m[1]));
    expect(Math.max(...offsets) - offsets.filter((o) => o > 0).sort((a, b) => a - b)[0]!).toBeCloseTo(LIGHT_LEAD * 100, 1);
  });

  it("names a light's keyframes as its disc does", () => {
    expect(lightName("s-", 0.104)).toBe("s-l10");
    expect(stageKeyframes("s-", clock)).toContain(`@keyframes ${lightName("s-", 0.55)}{`);
  });

  it("is deterministic and keeps the bead in sight only on the floor the walk ends on", () => {
    const css = stageKeyframes("s-", clock);
    expect(stageKeyframes("s-", clock)).toBe(css);
    const bead = (floor: string) => new RegExp(`@keyframes s-b-${floor}\\{([^@]*)\\}`).exec(css)?.[1] ?? "";
    expect(bead("floor1")).toMatch(/100%\{[^}]*opacity:1/);
    expect(bead("ground")).toMatch(/100%\{[^}]*opacity:0/);
  });
});
