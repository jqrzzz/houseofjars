import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convexOverlap, footprint, insideRect, intersects, isConvexCcw } from "./geometry";
import { houseOfJars as model } from "./house-of-jars";
import { placedRules } from "./rules";
import type { Area, Box3, Fixture, FixtureType, FloorId, Rect } from "./types";

const TOLERANCE = 0.05;
const area = (id: string) => model.areas.find((a) => a.id === id)!;
const rects = (a: Area): readonly Rect[] => [a.rect, ...(a.more ?? [])];
const floor = (id: FloorId) => model.floors.find((f) => f.id === id)!;
const count = (type: FixtureType, where: (f: Fixture) => boolean = () => true) => model.fixtures.filter((f) => f.type === type && where(f)).length;
const inArea = (id: string) => (f: Fixture) => f.area === id;
/** Whether two fixtures share volume: their boxes, or, where one has an outline, its prism. */
const fixturesClash = (a: { box: Box3; outline?: Fixture["outline"] }, b: { box: Box3; outline?: Fixture["outline"] }) =>
  a.outline || b.outline ? intersects(a.box, b.box) && convexOverlap(footprint(a), footprint(b)) : intersects(a.box, b.box);

describe("the House of Jars model: integrity", () => {
  it("gives every area, fixture, wall and route its own id", () => {
    for (const list of [model.areas, model.fixtures, model.walls, model.routes]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size, ids.find((id, i) => ids.indexOf(id) !== i)).toBe(ids.length);
    }
    const areaAndFixture = [...model.areas.map((a) => `area-${a.id}`), ...model.fixtures.map((f) => `fx-${f.id}`)];
    expect(new Set(areaAndFixture).size).toBe(areaAndFixture.length);
  });

  it("keeps the owner's names for the floors, bottom to top", () => {
    expect(model.floors.map((f) => [f.id, f.name, f.level])).toEqual([
      ["ground", "Ground floor", 0],
      ["floor1", "1st floor", 1],
      ["floor2", "2nd floor", 2],
    ]);
    // Each floor sits on a slab above the ceiling below.
    for (let i = 1; i < model.floors.length; i++) expect(model.floors[i]!.z).toBeCloseTo(model.floors[i - 1]!.ceiling + model.slab, 6);
  });

  it("puts every area inside the building, and the outside ones on the terrace", () => {
    const building = { x0: 0, x1: model.width, y0: 0, y1: model.depth };
    for (const a of model.areas) {
      expect(model.floors.some((f) => f.id === a.floor), a.id).toBe(true);
      for (const r of rects(a)) expect(insideRect(r, a.kind === "outside" ? model.terrace : building, 1e-9), a.id).toBe(true);
      if (a.parent) expect(insideRect(a.rect, area(a.parent).rect, 1e-9), a.id).toBe(true);
    }
  });

  it("gives every area of the owner's walk a model area", () => {
    const walk = new Set(model.areas.map((a) => a.walkId));
    for (const id of model.walkAreaIds) expect(walk.has(id), id).toBe(true);
    // The walk's seed in the repo knows a subset of those ids; all must be covered.
    const seed = JSON.parse(readFileSync(join(process.cwd(), ".claude/skills/place-walk/seed-house-of-jars.json"), "utf8")) as { areas: Record<string, unknown> };
    for (const id of Object.keys(seed.areas)) expect(walk.has(id), id).toBe(true);
  });

  it("puts every fixture inside its area (within 5 cm), and those on the facade on the facade", () => {
    for (const f of model.fixtures) {
      const a = area(f.area);
      expect(a, `${f.id} -> ${f.area}`).toBeDefined();
      expect(a.floor, f.id).toBe(f.floor);
      if (f.mount === "facade") {
        expect(f.box.x0 >= -model.wall - TOLERANCE && f.box.x1 <= model.width + model.wall + TOLERANCE, f.id).toBe(true);
        expect(f.box.y0 >= -0.6 && f.box.y1 <= TOLERANCE, f.id).toBe(true);
        continue;
      }
      expect(
        rects(a).some((r) => insideRect(f.box, r, TOLERANCE)),
        `${f.id} in ${f.area}`,
      ).toBe(true);
    }
  });

  it("leaves an opening in each upper floor's slab wherever the stairs below come within 2 m of it", () => {
    for (const fl of model.floors) {
      const below = model.floors.find((f) => f.level === fl.level - 1);
      const flights = model.fixtures.filter((f) => f.type === "stairs" && f.floor === below?.id);
      if (flights.length === 0) {
        expect(fl.opening, fl.id).toBeUndefined();
        continue;
      }
      // The underside of this floor's slab, measured from the floor below.
      const slab = fl.z - below!.z - model.slab;
      for (const s of flights) {
        const from = s.climb?.from ?? s.box.z0;
        const to = s.climb?.to ?? fl.z - below!.z;
        const dir = s.faces ?? "+y";
        const alongX = dir === "+x" || dir === "-x";
        const [lo, hi] = alongX ? [s.box.x0, s.box.x1] : [s.box.y0, s.box.y1];
        for (let t = 0; t <= 1 + 1e-9; t += 0.05) {
          // The step height a share t of the way up, and where along the run that is.
          const h = from + (to - from) * t;
          if (slab - h >= 2.0) continue;
          const at = dir === "+x" || dir === "+y" ? lo + (hi - lo) * t : hi - (hi - lo) * t;
          const slice = alongX ? { x0: at, x1: at, y0: s.box.y0, y1: s.box.y1 } : { x0: s.box.x0, x1: s.box.x1, y0: at, y1: at };
          expect(fl.opening && insideRect(slice, fl.opening, 1e-9), `${s.id} at ${at.toFixed(2)} under ${fl.id}`).toBe(true);
        }
      }
    }
  });

  it("keeps every fixture between its floor and its ceiling", () => {
    for (const f of model.fixtures) {
      const fl = floor(f.floor);
      expect(f.box.z0, f.id).toBeGreaterThanOrEqual(-1e-9);
      expect(f.box.z1, f.id).toBeLessThanOrEqual(fl.ceiling - fl.z + 1e-9);
    }
  });

  it("gives a fixture that is not a box a convex outline, counter-clockwise, that fills its box's plan", () => {
    const shaped = model.fixtures.filter((f) => f.outline);
    expect(shaped.map((f) => f.id)).toEqual(["bar"]);
    for (const f of shaped) {
      expect(isConvexCcw(f.outline!), f.id).toBe(true);
      const xs = f.outline!.map((p) => p[0]);
      const ys = f.outline!.map((p) => p[1]);
      expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], f.id).toEqual([f.box.x0, f.box.x1, f.box.y0, f.box.y1]);
    }
  });

  it("lets no two solid fixtures on a floor share volume, unless one is mounted on the other (an outline counts, not its box)", () => {
    const solid = model.fixtures.filter((f) => !f.flat);
    const clashes: string[] = [];
    for (let i = 0; i < solid.length; i++)
      for (let j = i + 1; j < solid.length; j++) {
        const a = solid[i]!;
        const b = solid[j]!;
        if (a.floor !== b.floor || a.mountedOn === b.id || b.mountedOn === a.id) continue;
        if (fixturesClash(a, b)) clashes.push(`${a.id} x ${b.id}`);
      }
    expect(clashes).toEqual([]);
  });

  it("mounts fixtures only on fixtures of the same floor that they actually touch", () => {
    for (const f of model.fixtures.filter((x) => x.mountedOn)) {
      const host = model.fixtures.find((x) => x.id === f.mountedOn);
      expect(host, f.id).toBeDefined();
      expect(host!.floor, f.id).toBe(f.floor);
      expect(intersects(f.box, host!.box, -1e-9), f.id).toBe(true);
    }
  });

  it("walks every route around the furniture: no flat stretch crosses a solid fixture standing on the floor", () => {
    // Liang-Barsky: does the segment p-q pass through the rectangle?
    const crosses = (p: readonly number[], q: readonly number[], r: Rect) => {
      let t0 = 0;
      let t1 = 1;
      const dx = q[0]! - p[0]!;
      const dy = q[1]! - p[1]!;
      for (const [pp, qq] of [
        [-dx, p[0]! - r.x0],
        [dx, r.x1 - p[0]!],
        [-dy, p[1]! - r.y0],
        [dy, r.y1 - p[1]!],
      ] as const) {
        if (Math.abs(pp) < 1e-12) {
          if (qq <= 0) return false;
        } else {
          const t = qq / pp;
          if (pp < 0) t0 = Math.max(t0, t);
          else t1 = Math.min(t1, t);
          if (t0 >= t1) return false;
        }
      }
      return true;
    };
    const hits: string[] = [];
    for (const route of model.routes)
      for (const s of route.segments) {
        const solid = model.fixtures.filter((f) => f.floor === s.floor && !f.flat && f.box.z0 < 0.3 && !["stairs", "door"].includes(f.type) && f.mount !== "facade");
        for (let i = 1; i < s.points.length; i++) {
          const p = s.points[i - 1]!;
          const q = s.points[i]!;
          if (p.length > 2 || q.length > 2) continue; // climbing a flight
          for (const f of solid)
            if (f.outline ? convexOverlap(f.outline, [[p[0]!, p[1]!], [q[0]!, q[1]!]]) : crosses(p, q, f.box)) hits.push(`${route.id}: ${p.join(",")} -> ${q.join(",")} crosses ${f.id}`);
        }
      }
    expect(hits).toEqual([]);
  });

  it("walks guests and the team through the house step by step: each step in a real area on its floor, with real rules", () => {
    const ruleIds = new Set(placedRules.map((r) => r.id));
    for (const r of model.routes) {
      expect(["guest", "staff"], r.id).toContain(r.who);
      const floors = new Set(r.segments.map((s) => s.floor));
      expect(r.stops?.length, r.id).toBeGreaterThan(0);
      for (const stop of r.stops ?? []) {
        const where = `${r.id} / ${stop.label}`;
        expect(floors.has(stop.floor), where).toBe(true);
        expect(area(stop.area!)?.floor, where).toBe(stop.floor);
        expect(stop.does, where).toMatch(/\.$/);
        for (const id of stop.rules ?? []) expect(ruleIds.has(id), `${where}: ${id}`).toBe(true);
      }
    }
    // The guest's day: arriving, breakfast, leaving early, a smoke, water, the bathroom; the team's hourly round.
    expect(model.routes.map((r) => r.id)).toEqual(["arrival", "breakfast", "leaving-early", "smoke", "water", "bathroom-women", "housekeeping-round"]);
    // The arrival ends at pod H01's ladder, and the round reaches every bathroom and dorm.
    const arrival = model.routes.find((r) => r.id === "arrival")!.segments.at(-1)!.points.at(-1)!;
    const h01 = model.fixtures.find((f) => f.id === "pod-H01")!.box;
    expect(Math.hypot(Math.max(h01.x0 - arrival[0], 0), Math.max(h01.y0 - arrival[1], 0, arrival[1] - h01.y1))).toBeLessThan(0.5);
    const round = model.routes.find((r) => r.id === "housekeeping-round")!;
    expect(round.who).toBe("staff");
    expect(round.stops!.map((s) => s.area)).toEqual(expect.arrayContaining(["toilet-ground", "bath-women", "bath-men", "dorm-h", "dorm-j", "cafe"]));
    // The smoke ends by the jar, past the terrace's seats.
    const smoke = model.routes.find((r) => r.id === "smoke")!.segments[0]!.points.at(-1)!;
    const jar = model.fixtures.find((f) => f.id === "jar-butts")!.box;
    expect(Math.hypot(smoke[0] - (jar.x0 + jar.x1) / 2, smoke[1] - (jar.y0 + jar.y1) / 2)).toBeLessThan(0.5);
  });

  it("runs every route over floors that exist, inside the house or on the terrace", () => {
    for (const r of model.routes) {
      expect(r.segments.length, r.id).toBeGreaterThan(0);
      for (const s of r.segments) {
        expect(model.floors.some((f) => f.id === s.floor), r.id).toBe(true);
        for (const [x, y] of s.points) {
          // Inside, on the terrace, or through the facade's thickness at a door.
          const inside = (x >= 0 && x <= model.width && y >= -model.wall && y <= model.depth) || insideRect({ x0: x, x1: x, y0: y, y1: y }, model.terrace);
          expect(inside, `${r.id} ${x},${y}`).toBe(true);
        }
      }
    }
  });

  it("marks what was not seen as unconfirmed: all of the 2nd floor, where most locker stacks stand", () => {
    expect(floor("floor2").confirmed).toBe(false);
    expect(floor("floor2").note).toBeTruthy();
    for (const a of model.areas.filter((x) => x.floor === "floor2")) expect(a.confirmed, a.id).toBe(false);
    // The 2nd floor's two small windows are seen from the street (f1-01); everything else up there is a copy of the 1st floor.
    for (const f of model.fixtures.filter((x) => x.floor === "floor2")) expect(f.confirmed, f.id).toBe(f.type === "window" ? undefined : false);
    // The numbers, stacks and top bunks are from the owner's bed register, confirmed by the owner on both sides.
    for (const f of model.fixtures.filter((x) => x.type === "pod" && x.floor === "floor1")) {
      expect(f.confirmed, f.id).toBeUndefined();
      expect(f.note, f.id).toMatch(/the top bunk is 1 and beneath it 2"; down the left, 09 over 08/);
    }
    for (const f of model.fixtures.filter((x) => x.type === "locker")) expect(f.note, f.id).toMatch(/is assumed\.$/);
    // The 1st floor's dorm itself is seen (and drawn from the register); the 2nd floor's is a copy.
    expect(area("dorm-h").confirmed).toBeUndefined();
    expect(model.walls.find((w) => w.id === "floor1-dorm-partition")!.confirmed).toBeUndefined();
    // The owner described the toilet's inside and said the kitchen is part of the staff room, with no wall between.
    for (const id of ["toilet-ground", "sink-toilet"]) expect(model.fixtures.find((f) => f.id === id)!.confirmed, id).toBeUndefined();
    expect(model.walls.find((w) => w.id === "toilet-wall")!.confirmed).toBeUndefined();
    expect(model.walls.find((w) => w.id === "kitchen-wall")).toBeUndefined();
    for (const thing of [...model.floors, ...model.areas, ...model.fixtures, ...model.walls]) {
      if (thing.confirmed === false) expect(thing.note, thing.id).toBeTruthy();
    }
  });

  it("keeps the corridor's doors clear: nothing stands in a door opening", () => {
    // A box standing in a doorway, or within 30 cm of it on either side, blocks the door. (The shop
    // window's opening reaches the floor too, but is filled by the window and its low panel.)
    const blocked: string[] = [];
    for (const wall of model.walls) {
      const alongX = wall.box.x1 - wall.box.x0 >= wall.box.y1 - wall.box.y0;
      for (const o of wall.openings ?? []) {
        if ((o.z0 ?? 0) > 0.01 || o.to - o.from > 1.5) continue; // a window, not a door
        const zone: Box3 = alongX
          ? { x0: o.from, x1: o.to, y0: wall.box.y0 - 0.3, y1: wall.box.y1 + 0.3, z0: 0, z1: 1.5 }
          : { x0: wall.box.x0 - 0.3, x1: wall.box.x1 + 0.3, y0: o.from, y1: o.to, z0: 0, z1: 1.5 };
        for (const f of model.fixtures) {
          if (f.floor !== wall.floor || f.flat || ["door", "door-leaf", "stairs"].includes(f.type) || f.mount === "facade") continue;
          if (fixturesClash(f, { box: zone })) blocked.push(`${f.id} in ${wall.id}`);
        }
      }
    }
    expect(blocked).toEqual([]);
  });
});

describe("the House of Jars model: counts from the walk", () => {
  it("has 14 pods and 14 lockers per dorm, numbered as on the bed register: no 4, 13 or 14", () => {
    for (const [dorm, letter] of [
      ["dorm-h", "H"],
      ["dorm-j", "J"],
    ] as const) {
      const numbers = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17].map((n) => `${letter}${String(n).padStart(2, "0")}`);
      const pods = model.fixtures.filter((f) => f.type === "pod" && f.area === dorm);
      const lockers = model.fixtures.filter((f) => f.type === "locker" && f.area === dorm);
      expect(pods.map((p) => p.label).sort()).toEqual(numbers);
      expect(lockers.map((l) => l.label).sort()).toEqual(numbers);
      // Seven stacks of two, as the register pairs them; the last lies across, just inside the door.
      const stacks = new Map<string, string[]>();
      for (const p of pods) stacks.set(`${p.box.x0},${p.box.y0}`, [...(stacks.get(`${p.box.x0},${p.box.y0}`) ?? []), p.label!]);
      const pairs = [[1, 2], [3, 5], [6, 7], [8, 9], [10, 11], [12, 15], [16, 17]].map((pair) => pair.map((n) => `${letter}${String(n).padStart(2, "0")}`).join("/"));
      expect([...stacks.values()].map((s) => s.sort().join("/")).sort()).toEqual(pairs.sort());
      // The top bunk of each stack, as the register draws it.
      const top = [1, 3, 6, 9, 11, 15, 17].map((n) => `${letter}${String(n).padStart(2, "0")}`);
      expect(pods.filter((p) => p.variant?.includes("upper")).map((p) => p.label).sort()).toEqual(top);
      expect(pods.filter((p) => p.faces === "-y").map((p) => p.label).sort()).toEqual([`${letter}16`, `${letter}17`]);
    }
    expect(model.customs?.[0]).toMatch(/skip the numbers 4, 13 and 14/);
  });

  it("has the women's bathroom of the walk (and the same in the men's)", () => {
    for (const bath of ["bath-women", "bath-men"]) {
      expect(count("toilet", inArea(bath)), bath).toBe(3);
      expect(count("toilet-stall", inArea(bath)), bath).toBe(3);
      expect(count("shower", inArea(bath)), bath).toBe(2);
      expect(count("basin", inArea(bath)), bath).toBe(2);
      expect(count("hand-dryer", inArea(bath)), bath).toBe(1);
      expect(count("hair-dryer", inArea(bath)), bath).toBe(1);
      expect(count("mirror", inArea(bath)), bath).toBe(2);
    }
  });

  it("has the café of the walk", () => {
    const cafe = inArea("cafe");
    expect(count("bar", cafe)).toBe(1);
    expect(count("table", cafe)).toBe(5);
    expect(count("chair", cafe)).toBe(10);
    expect(count("table-tall-round", cafe)).toBe(2);
    expect(count("stool-bar", cafe)).toBe(3);
    expect(count("stool-low", cafe)).toBe(2);
    expect(count("window-ledge", cafe)).toBe(1);
    expect(count("bench-seat", cafe)).toBe(1);
    expect(count("jar-big", cafe)).toBe(1);
    expect(count("ac-indoor", cafe)).toBe(2);
    expect(count("fridge-drinks", cafe)).toBe(1);
    expect(count("dehumidifier", cafe)).toBe(1);
    expect(count("shelves", inArea("desk"))).toBe(1);
    expect(count("counter", inArea("desk"))).toBe(1);
    // The front desk's printer (a-desk), on its stand by the drinks fridge.
    expect(count("printer")).toBe(1);
  });

  it("has one toilet on the ground floor, two extinguishers and two clay jars at the corridor's end, and the terrace's bench and two small tables", () => {
    expect(count("toilet", (f) => f.floor === "ground")).toBe(1);
    expect(count("toilet", inArea("toilet-ground"))).toBe(1);
    expect(count("extinguisher", inArea("corridor"))).toBe(2);
    expect(count("extinguisher")).toBe(2);
    expect(count("jar-clay", inArea("corridor"))).toBe(2);
    // And the one on the stairs (a-stairs1).
    expect(count("jar-clay", inArea("stairs-ground"))).toBe(1);
    expect(count("bench", inArea("terrace"))).toBe(1);
    expect(count("table-small-round", inArea("terrace"))).toBe(2);
    expect(count("post", inArea("terrace"))).toBe(2);
  });

  it("has three outdoor AC units on the facade: two stacked on the left, one on the right", () => {
    const units = model.fixtures.filter((f) => f.type === "ac-outdoor");
    expect(units).toHaveLength(3);
    for (const u of units) expect(u.mount).toBe("facade");
    expect(units.filter((u) => u.box.x1 <= model.width / 2)).toHaveLength(2);
    expect(units.filter((u) => u.box.x0 >= model.width / 2)).toHaveLength(1);
  });

  it("has 30 shoe cubbies (5 across, 6 high) on the 1st floor only", () => {
    const cubbies = model.fixtures.filter((f) => f.type === "shoe-cubbies");
    expect(cubbies).toHaveLength(1);
    expect(cubbies[0]!.floor).toBe("floor1");
    expect(cubbies[0]!.grid).toEqual({ cols: 5, rows: 6 });
    expect(cubbies[0]!.grid!.cols * cubbies[0]!.grid!.rows).toBe(30);
  });

  it("has the back of the ground floor from the photos: the U-shaped stairs, the store under them, the staff room and the kitchen", () => {
    // One U-shaped stair: a flight toward the left wall, a landing, a flight back up to the 1st floor.
    const stairs = model.fixtures.filter((f) => f.type === "stairs" && f.floor === "ground");
    expect(stairs.map((f) => [f.id, f.faces ?? null])).toEqual([
      ["stairs-up", "-x"],
      ["stairs-landing", null],
      ["stairs-up-2", "+x"],
    ]);
    expect(stairs[2]!.climb!.to).toBeCloseTo(floor("floor1").z, 6);
    // The store's two doors in the stairs' teak front: a small Staff Only door and a pair.
    expect(model.fixtures.filter((f) => f.area === "store-stairs").map((f) => f.variant ?? f.label)).toEqual(["Staff Only", "double"]);
    // The toilet is on the left, behind the stairs; the corridor runs along the right wall.
    expect(area("toilet-ground").rect.x0).toBe(0);
    expect(area("corridor").rect.x1).toBe(model.width);
    expect(count("water-dispenser", inArea("water"))).toBe(1);
    expect(count("staff-lockers", inArea("staff-kitchen"))).toBe(1);
    expect(count("fuse-box", inArea("staff-kitchen"))).toBe(1);
    expect(count("water-tank", inArea("staff-kitchen"))).toBe(1);
    expect(count("fridge", inArea("kitchen"))).toBe(1);
    expect(count("sink", inArea("kitchen"))).toBe(1);
    // As the owner told it: the Staff Only door against the right wall, the toilet straight across from its door,
    // the second basin in the corridor, and the clay jars along the right wall.
    const staffDoor = model.walls.find((w) => w.id === "back-partition")!.openings![0]!;
    expect(staffDoor.to).toBeGreaterThan(model.width - 0.15);
    const toiletDoor = model.walls.find((w) => w.id === "toilet-wall")!.openings![0]!;
    const toilet = model.fixtures.find((f) => f.id === "toilet-ground")!;
    expect(toilet.faces).toBe("+x");
    expect((toilet.box.y0 + toilet.box.y1) / 2).toBeCloseTo((toiletDoor.from + toiletDoor.to) / 2, 6);
    expect(model.fixtures.find((f) => f.id === "basin-corridor")!.area).toBe("corridor");
    for (const jar of model.fixtures.filter((f) => f.type === "jar-clay" && f.area === "corridor")) expect(jar.box.x1).toBeGreaterThan(model.width - 0.2);
  });

  it("lays out both bathrooms as the owner told it: the door by the right wall, the sinks on the right, then a corridor with 2 showers in front and 3 toilets behind", () => {
    for (const [bath, floorId] of [
      ["bath-women", "floor1"],
      ["bath-men", "floor2"],
    ] as const) {
      const of = (type: FixtureType) => model.fixtures.filter((f) => f.type === type && f.area === bath);
      const showers = of("shower");
      const stalls = of("toilet-stall");
      const toilets = of("toilet");
      expect([showers.length, stalls.length, toilets.length], bath).toEqual([2, 3, 3]);
      // The door, in the front wall (to the landing), within a metre of the right wall.
      const front = model.walls.find((w) => w.floor === floorId && w.id.endsWith("-bath-partition"))!;
      const door = front.openings![0]!;
      expect(front.openings, bath).toHaveLength(1);
      expect(model.width - door.to, bath).toBeLessThan(1.0);
      expect(door.from, bath).toBeGreaterThan(model.width / 2);
      // The sinks on the right wall, on your right as you walk in, clear of the door's swing.
      const vanity = of("vanity")[0]!;
      expect(vanity.box.x1, bath).toBe(model.width);
      expect(of("basin").every((b) => b.mountedOn === vanity.id), bath).toBe(true);
      const leaf = of("door-leaf")[0]!.box;
      const reach = door.to - door.from;
      expect(Math.hypot(vanity.box.x0 - leaf.x0, vanity.box.y0 - front.box.y1), bath).toBeGreaterThan(reach);
      // The showers side by side along the front, opening onto the corridor behind them.
      expect(new Set(showers.map((s) => s.box.y0)).size, bath).toBe(1);
      expect(showers.every((s) => s.faces === "+y" && s.box.y0 >= front.box.y1 - 1e-9 && s.box.x1 <= door.from), bath).toBe(true);
      // The toilets in their stalls against the back wall, doors onto the corridor; the showers in front of them.
      expect(stalls.every((s) => s.faces === "-y" && s.box.y1 === model.depth), bath).toBe(true);
      expect(toilets.every((t) => stalls.some((s) => s.id === t.mountedOn)), bath).toBe(true);
      const corridor = { y0: Math.max(...showers.map((s) => s.box.y1)), y1: Math.min(...stalls.map((s) => s.box.y0)) };
      expect(corridor.y1 - corridor.y0, bath).toBeGreaterThanOrEqual(0.9);
      // The corridor runs from the way in (left of the sinks) to the left wall, clear of everything on the floor.
      const inCorridor = model.fixtures.filter((f) => f.area === bath && f.box.z0 < 1.5 && f.box.y0 < corridor.y1 && f.box.y1 > corridor.y0 && f.box.x0 < vanity.box.x0);
      expect(inCorridor.map((f) => f.id), bath).toEqual([]);
    }
    // Both walks into the bathrooms go in through the door, and the team's round walks the corridor.
    const bathDoor = model.walls.find((w) => w.id === "floor1-bath-partition")!.openings![0]!;
    for (const route of model.routes.filter((r) => r.stops?.some((s) => s.area === "bath-women"))) {
      const pts = route.segments.find((s) => s.floor === "floor1")!.points;
      const through = pts.some((p, i) => {
        const q = pts[i + 1];
        if (!q || (p[1] - 12.65) * (q[1] - 12.65) > 0) return false;
        const x = p[0] + ((q[0] - p[0]) * (12.65 - p[1])) / (q[1] - p[1] || 1);
        return x > bathDoor.from && x < bathDoor.to;
      });
      expect(through, route.id).toBe(true);
    }
  });

  it("has the built-in bar at the counter's street end: a little higher, angled then straight to the left wall, with the 3 high stools along it", () => {
    const bar = model.fixtures.find((f) => f.type === "bar")!;
    const counter = model.fixtures.find((f) => f.id === "counter")!;
    expect(bar.note).toMatch(/^The owner, 7 October 2026: a built-in bar/);
    // A little higher than the counter.
    expect(bar.box.z1 - counter.box.z1).toBeGreaterThan(0.05);
    expect(bar.box.z1 - counter.box.z1).toBeLessThanOrEqual(0.2);
    const outline = bar.outline!;
    // It meets the left wall, and its back runs from the wall to the counter's café side along the counter's street
    // end: no gap there, so the staff aisle behind the counter is closed at that end.
    expect(outline.filter((p) => p[0] === 0)).toHaveLength(2);
    const back = outline.filter((p) => p[1] === counter.box.y0).map((p) => p[0]);
    expect([Math.min(...back), Math.max(...back)]).toEqual([0, counter.box.x1]);
    expect(bar.box.y1).toBe(counter.box.y0);
    // Its face toward the café: straight from the wall, then at an angle up to the counter's corner.
    const face = outline.filter((p) => p[1] < counter.box.y0);
    expect(face.length).toBe(2);
    const [wallEnd, bend] = [...face].sort((a, b) => a[0] - b[0]) as [readonly [number, number], readonly [number, number]];
    expect(wallEnd[1]).toBe(bend[1]);
    expect(bend[0]).toBeGreaterThan(0.3);
    expect(bend[0]).toBeLessThan(counter.box.x1);
    // The three high stools stand in front of it, on the café side: each near its face, and none along the counter.
    const stools = model.fixtures.filter((f) => f.type === "stool-bar");
    expect(stools).toHaveLength(3);
    const toFace = (x: number, y: number) => {
      // The signed distance to the angled face (positive on the café side) or, left of the bend, to the straight one.
      if (x <= bend[0]) return bend[1] - y;
      const dx = counter.box.x1 - bend[0];
      const dy = counter.box.y0 - bend[1];
      return ((x - bend[0]) * dy - (y - bend[1]) * dx) / Math.hypot(dx, dy);
    };
    for (const s of stools) {
      const cx = (s.box.x0 + s.box.x1) / 2;
      const cy = (s.box.y0 + s.box.y1) / 2;
      expect(toFace(cx, cy), s.id).toBeGreaterThan(0.18);
      expect(toFace(cx, cy), s.id).toBeLessThan(0.45);
      expect(s.box.y1, s.id).toBeLessThan(counter.box.y0);
      expect(convexOverlap(outline, footprint(s)), s.id).toBe(false);
    }
  });

  it("has two paintings on the 2nd floor's landing, where the 1st floor has its shoe cubbies, and no cubbies; everyone's shoes go in the 1st floor's", () => {
    const cubbies = model.fixtures.find((f) => f.type === "shoe-cubbies")!;
    expect(cubbies.note).toMatch(/All guests, Dorm J's too, leave their shoes here \(the owner, 7 October 2026\)/);
    expect(model.fixtures.filter((f) => f.area === "landing-2" && f.type === "shoe-cubbies")).toEqual([]);
    const paintings = model.fixtures.filter((f) => f.area === "landing-2" && f.type === "picture-frame");
    expect(paintings).toHaveLength(2);
    for (const p of paintings) {
      expect(p.variant, p.id).toBe("painting");
      expect(p.mount, p.id).toBe("right-wall");
      expect(p.box.x1, p.id).toBe(model.width);
      expect(p.box.y0 >= cubbies.box.y0 && p.box.y1 <= cubbies.box.y1, p.id).toBe(true);
      expect(p.note, p.id).toContain("The owner, 7 October 2026: no shoe cubbies on this landing, just a wall with two paintings.");
    }
  });

  it("puts the door on the left of the front and the big window to its right", () => {
    const door = model.fixtures.find((f) => f.id === "door-front")!;
    const window = model.fixtures.find((f) => f.id === "window-front")!;
    expect(door.box.x1).toBeLessThanOrEqual(window.box.x0);
    expect(window.grid).toEqual({ cols: 4, rows: 3 });
  });
});
