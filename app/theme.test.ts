import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bootScript, SPLASH_KEY, THEME_KEY } from "@/lib/theme";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

/** The declarations inside the first rule whose selector is exactly `selector`. */
function declarations(selector: string): string[] {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} is in globals.css`).toBeGreaterThan(-1);
  const body = css.slice(start + selector.length + 2, css.indexOf("}", start));
  return body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean);
}

describe("Day and Evening", () => {
  it("sets the same Evening tokens for the device's dark setting and for a guest who chose Evening", () => {
    const byDevice = declarations(':root:not([data-theme="light"])');
    const byChoice = declarations(':root[data-theme="dark"]');
    expect(byDevice.length).toBeGreaterThan(20);
    expect(byChoice).toEqual(byDevice);
    expect(byChoice).toContain("color-scheme: dark");
  });

  it("gives every Evening token a Day value first, so no colour exists in one theme only", () => {
    const day = declarations(":root").map((line) => line.split(":")[0]);
    for (const line of declarations(':root[data-theme="dark"]')) {
      const name = line.split(":")[0]!;
      if (name.startsWith("--")) expect(day, `${name} has a Day value`).toContain(name);
    }
  });

  it("leaves the device to decide when a guest chose Day", () => {
    expect(declarations(':root[data-theme="light"]')).toEqual(["color-scheme: light"]);
  });
});

/** Runs the boot script against a stand-in page and storage. */
function boot({ theme, seen = false, calm = false, storageThrows = false }: { theme?: string; seen?: boolean; calm?: boolean; storageThrows?: boolean }) {
  const attributes = new Map<string, string>();
  const classes = new Set<string>();
  const session = new Map<string, string>(seen ? [[SPLASH_KEY, "1"]] : []);
  const blocked = () => {
    throw new Error("blocked");
  };
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      classList: { add: (name: string) => classes.add(name) },
    },
  };
  const localStorage = { getItem: storageThrows ? blocked : (key: string) => (key === THEME_KEY ? (theme ?? null) : null) };
  const sessionStorage = {
    getItem: storageThrows ? blocked : (key: string) => session.get(key) ?? null,
    setItem: storageThrows ? blocked : (key: string, value: string) => session.set(key, value),
  };
  const matchMedia = (query: string) => ({ matches: calm && query.includes("reduce") });
  new Function("document", "localStorage", "sessionStorage", "matchMedia", bootScript)(document, localStorage, sessionStorage, matchMedia);
  return { theme: attributes.get("data-theme"), splash: classes.has("splash") };
}

describe("the boot script", () => {
  it("applies a saved Day or Evening and ignores anything else", () => {
    expect(boot({ theme: "dark" }).theme).toBe("dark");
    expect(boot({ theme: "light" }).theme).toBe("light");
    expect(boot({ theme: "<script>" }).theme).toBeUndefined();
    expect(boot({}).theme).toBeUndefined();
  });

  it("shows the splash once per visit, and never to a guest who prefers reduced motion", () => {
    expect(boot({}).splash).toBe(true);
    expect(boot({ seen: true }).splash).toBe(false);
    expect(boot({ calm: true }).splash).toBe(false);
  });

  it("does nothing, without failing, when storage is blocked", () => {
    expect(boot({ storageThrows: true })).toEqual({ theme: undefined, splash: false });
  });
});
