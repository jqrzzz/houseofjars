import { describe, expect, it } from "vitest";
import { houseOfJars } from "./house-of-jars";

const stops = houseOfJars.routes.flatMap((route) => (route.stops ?? []).map((stop) => ({ route, stop, at: `${route.id}: ${stop.label}` })));

/* The walks are published as they are: on /the-house, in public/house/walks.json and in docs/house-context.md. */
describe("the house's walks, as guests read them", () => {
  it("tell nothing of the photographs the team takes on its round", () => {
    for (const { stop, at } of stops) expect(stop.does ?? "", at).not.toMatch(/photo/i);
  });

  it("say nothing firm about the 2nd floor: no guest walk goes there, and no stop places anything on it", () => {
    for (const { route, stop, at } of stops) {
      if (route.who === "guest") expect(stop.floor, at).not.toBe("floor2");
      expect(stop.does ?? "", at).not.toMatch(/2nd floor|\bmen[’']s\b/);
    }
  });

  it("write apostrophes curly, as the rest of the site does", () => {
    for (const route of houseOfJars.routes) {
      const words = [route.name, route.when ?? "", ...(route.stops ?? []).flatMap((s) => [s.label, s.does ?? ""])];
      for (const text of words) expect(text, route.id).not.toContain("'");
    }
  });

  it("never open a stop by repeating its label, which the list and the films show in front of it", () => {
    for (const { stop, at } of stops) expect((stop.does ?? "").toLowerCase().startsWith(stop.label.toLowerCase()), at).toBe(false);
  });

  it("speak of the night staff as a team, as content/ does: they open the door", () => {
    for (const { stop, at } of stops) expect(stop.does ?? "", at).not.toMatch(/night staff opens/);
  });
});
