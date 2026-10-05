import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { insideRect, intersects } from "./geometry";
import { houseOfJars as model } from "./house-of-jars";
import type { Area, Box3, Fixture, FixtureType, FloorId, Rect } from "./types";

const TOLERANCE = 0.05;
const area = (id: string) => model.areas.find((a) => a.id === id)!;
const rects = (a: Area): readonly Rect[] => [a.rect, ...(a.more ?? [])];
const floor = (id: FloorId) => model.floors.find((f) => f.id === id)!;
const count = (type: FixtureType, where: (f: Fixture) => boolean = () => true) => model.fixtures.filter((f) => f.type === type && where(f)).length;
const inArea = (id: string) => (f: Fixture) => f.area === id;

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
      ["floor1", "Floor 1", 1],
      ["floor2", "Floor 2", 2],
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

  it("lets no two solid fixtures on a floor share volume, unless one is mounted on the other", () => {
    const solid = model.fixtures.filter((f) => !f.flat);
    const clashes: string[] = [];
    for (let i = 0; i < solid.length; i++)
      for (let j = i + 1; j < solid.length; j++) {
        const a = solid[i]!;
        const b = solid[j]!;
        if (a.floor !== b.floor || a.mountedOn === b.id || b.mountedOn === a.id) continue;
        if (intersects(a.box, b.box)) clashes.push(`${a.id} x ${b.id}`);
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
          for (const f of solid) if (crosses(p, q, f.box)) hits.push(`${route.id}: ${p.join(",")} -> ${q.join(",")} crosses ${f.id}`);
        }
      }
    expect(hits).toEqual([]);
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

  it("marks what was not seen as unconfirmed: all of Floor 2, which pod of each stack is upper, where most locker stacks stand", () => {
    expect(floor("floor2").confirmed).toBe(false);
    expect(floor("floor2").note).toBeTruthy();
    for (const a of model.areas.filter((x) => x.floor === "floor2")) expect(a.confirmed, a.id).toBe(false);
    // Floor 2's two small windows are seen from the street (f1-01); everything else up there is a copy of Floor 1.
    for (const f of model.fixtures.filter((x) => x.floor === "floor2")) expect(f.confirmed, f.id).toBe(f.type === "window" ? undefined : false);
    // The numbers and the stacks are from the owner's bed register; which pod of each stack is the upper one, and
    // where most locker stacks stand, are open.
    for (const f of model.fixtures.filter((x) => x.type === "pod")) {
      expect(f.confirmed, f.id).toBe(false);
      expect(f.note, f.id).toMatch(/bed register\. Not confirmed: which pod of each stack is the upper one/);
    }
    for (const f of model.fixtures.filter((x) => x.type === "locker")) expect(f.note, f.id).toMatch(/is assumed\.$/);
    // Floor 1's dorm itself is seen (and drawn from the register); Floor 2's is a copy.
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
          if (intersects(f.box, zone)) blocked.push(`${f.id} in ${wall.id}`);
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
      expect(pods.filter((p) => p.variant?.includes("lower"))).toHaveLength(7);
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

  it("has 30 shoe cubbies (5 across, 6 high) on Floor 1 only", () => {
    const cubbies = model.fixtures.filter((f) => f.type === "shoe-cubbies");
    expect(cubbies).toHaveLength(1);
    expect(cubbies[0]!.floor).toBe("floor1");
    expect(cubbies[0]!.grid).toEqual({ cols: 5, rows: 6 });
    expect(cubbies[0]!.grid!.cols * cubbies[0]!.grid!.rows).toBe(30);
  });

  it("has the back of the ground floor from the photos: the U-shaped stairs, the store under them, the staff room and the kitchen", () => {
    // One U-shaped stair: a flight toward the left wall, a landing, a flight back up to Floor 1.
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

  it("puts the door on the left of the front and the big window to its right", () => {
    const door = model.fixtures.find((f) => f.id === "door-front")!;
    const window = model.fixtures.find((f) => f.id === "window-front")!;
    expect(door.box.x1).toBeLessThanOrEqual(window.box.x0);
    expect(window.grid).toEqual({ cols: 4, rows: 3 });
  });
});
