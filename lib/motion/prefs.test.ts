import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyMotion, MOTION_EVENT, MOTION_KEY, motionAllowed, parseMotion, readMotion, setMotion } from "./prefs";

/** A stand-in <html>, window, storage and media query: Vitest runs in Node, with no DOM. */
function stage({ attribute = null as string | null, reduced = false, storageThrows = false } = {}) {
  const attributes = new Map<string, string>(attribute ? [["data-motion", attribute]] : []);
  const classes = new Set<string>(["splash"]);
  const stored = new Map<string, string>();
  const events: string[] = [];
  const blocked = () => {
    throw new Error("blocked");
  };
  vi.stubGlobal("document", {
    documentElement: {
      getAttribute: (name: string) => attributes.get(name) ?? null,
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
      classList: { remove: (name: string) => classes.delete(name) },
    },
  });
  vi.stubGlobal("window", { dispatchEvent: (event: Event) => events.push(event.type) });
  vi.stubGlobal("localStorage", {
    setItem: storageThrows ? blocked : (key: string, value: string) => stored.set(key, value),
    removeItem: storageThrows ? blocked : (key: string) => stored.delete(key),
  });
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduced && query === "(prefers-reduced-motion: reduce)" }));
  return { attributes, classes, stored, events };
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("reading the choice", () => {
  it("reads only an exact Still; anything else is Full", () => {
    expect(parseMotion("still")).toBe("still");
    for (const other of ["full", "STILL", "", null, undefined, 1, "<script>"]) expect(parseMotion(other)).toBe("full");
  });

  it("reads the choice the boot script left on <html>", () => {
    stage({ attribute: "still" });
    expect(readMotion()).toBe("still");
    stage();
    expect(readMotion()).toBe("full");
  });

  it("says Full and motion not allowed on the server, where there is no page", () => {
    vi.stubGlobal("document", undefined);
    expect(readMotion()).toBe("full");
    expect(motionAllowed()).toBe(false);
  });
});

describe("motionAllowed", () => {
  it("is true only when the device doesn't ask for reduced motion and the guest hasn't chosen Still", () => {
    stage();
    expect(motionAllowed()).toBe(true);
    stage({ attribute: "still" });
    expect(motionAllowed()).toBe(false);
    stage({ reduced: true });
    expect(motionAllowed()).toBe(false);
    stage({ reduced: true, attribute: "still" });
    expect(motionAllowed()).toBe(false);
  });
});

describe("setMotion", () => {
  it("remembers Still, marks <html>, lifts any splash, and tells the page", () => {
    const page = stage();
    setMotion("still");
    expect(page.stored.get(MOTION_KEY)).toBe("still");
    expect(page.attributes.get("data-motion")).toBe("still");
    expect(page.classes.has("splash")).toBe(false);
    expect(page.events).toEqual([MOTION_EVENT]);
    expect(readMotion()).toBe("still");
    expect(motionAllowed()).toBe(false);
  });

  it("forgets the choice for Full, so the default holds", () => {
    const page = stage({ attribute: "still" });
    page.stored.set(MOTION_KEY, "still");
    setMotion("full");
    expect(page.stored.has(MOTION_KEY)).toBe(false);
    expect(page.attributes.has("data-motion")).toBe(false);
    expect(page.events).toEqual([MOTION_EVENT]);
    expect(motionAllowed()).toBe(true);
  });

  it("still applies the choice to this page when storage is blocked", () => {
    const page = stage({ storageThrows: true });
    expect(() => setMotion("still")).not.toThrow();
    expect(page.attributes.get("data-motion")).toBe("still");
    expect(page.events).toEqual([MOTION_EVENT]);
  });

  it("applies another tab's choice without storing it again", () => {
    const page = stage();
    applyMotion("still");
    expect(page.stored.size).toBe(0);
    expect(page.attributes.get("data-motion")).toBe("still");
  });
});
