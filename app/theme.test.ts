import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { breakfast, times } from "@/content/stay";
import { MOTION_KEY } from "@/lib/motion/prefs";
import { bootScript, SPLASH_KEY, SPLASH_MS, THEME_KEY, themeColor, vtPhaseStarts } from "@/lib/theme";

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

/** Runs the boot script against a stand-in page, storage and clock. */
function boot({
  theme,
  motion,
  seen = false,
  calm = false,
  storageThrows = false,
  localThrows = storageThrows,
  sessionThrows = storageThrows,
  now = Date.UTC(2026, 9, 5, 5, 0),
}: {
  theme?: string;
  motion?: string;
  seen?: boolean;
  calm?: boolean;
  storageThrows?: boolean;
  localThrows?: boolean;
  sessionThrows?: boolean;
  now?: number;
}) {
  const attributes = new Map<string, string>();
  const classes = new Set<string>();
  const timers: { run: () => void; ms: number }[] = [];
  const session = new Map<string, string>(seen ? [[SPLASH_KEY, "1"]] : []);
  const blocked = () => {
    throw new Error("blocked");
  };
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) },
    },
  };
  const saved: Record<string, string | undefined> = { [THEME_KEY]: theme, [MOTION_KEY]: motion };
  const localStorage = { getItem: localThrows ? blocked : (key: string) => saved[key] ?? null };
  const sessionStorage = {
    getItem: sessionThrows ? blocked : (key: string) => session.get(key) ?? null,
    setItem: sessionThrows ? blocked : (key: string, value: string) => session.set(key, value),
  };
  const matchMedia = (query: string) => ({ matches: calm && query.includes("reduce") });
  const clock = { now: () => now };
  const setTimeout = (run: () => void, ms: number) => timers.push({ run, ms });
  new Function("document", "localStorage", "sessionStorage", "matchMedia", "Date", "setTimeout", bootScript)(
    document,
    localStorage,
    sessionStorage,
    matchMedia,
    clock,
    setTimeout,
  );
  return {
    theme: attributes.get("data-theme"),
    motion: attributes.get("data-motion"),
    phase: attributes.get("data-vt-phase"),
    splash: classes.has("splash"),
    seen: session.has(SPLASH_KEY),
    timers,
    classes,
  };
}

/** A moment given in Vientiane time (UTC+7) on a day in October 2026, as the clock's milliseconds. */
const vientiane = (hours: number, minutes = 0, day = 5) => Date.UTC(2026, 9, day, hours - 7, minutes);

describe("the boot script", () => {
  it("applies a saved Day or Evening and ignores anything else", () => {
    expect(boot({ theme: "dark" }).theme).toBe("dark");
    expect(boot({ theme: "light" }).theme).toBe("light");
    expect(boot({ theme: "<script>" }).theme).toBeUndefined();
    expect(boot({}).theme).toBeUndefined();
  });

  it("applies a saved Still before the first paint, and treats anything else as Full", () => {
    expect(MOTION_KEY).toBe("hoj-motion");
    expect(boot({ motion: "still" }).motion).toBe("still");
    expect(boot({ motion: "full" }).motion).toBeUndefined();
    expect(boot({ motion: "<script>" }).motion).toBeUndefined();
    expect(boot({}).motion).toBeUndefined();
    expect(boot({ theme: "dark", motion: "still" })).toMatchObject({ theme: "dark", motion: "still" });
  });

  it("shows the splash once per visit, and never to a guest who prefers reduced motion", () => {
    expect(boot({}).splash).toBe(true);
    expect(boot({ seen: true }).splash).toBe(false);
    expect(boot({ calm: true }).splash).toBe(false);
  });

  it("shows no splash under Still, and counts the visit as begun", () => {
    const still = boot({ motion: "still" });
    expect(still.splash).toBe(false);
    expect(still.timers).toHaveLength(0);
    expect(still.seen).toBe(true);
  });

  it("takes the splash class off after 9600 ms, once the curtain and the hero's lamps have finished", () => {
    const first = boot({});
    expect(SPLASH_MS).toBe(9600);
    expect(first.timers.map((timer) => timer.ms)).toEqual([9600]);
    first.timers[0]!.run();
    expect(first.classes.has("splash")).toBe(false);
  });

  it("does nothing, without failing, when storage is blocked", () => {
    expect(boot({ storageThrows: true })).toMatchObject({ theme: undefined, motion: undefined, splash: false });
    expect(boot({ storageThrows: true }).phase).toBeDefined();
  });

  it("keeps each storage failure to itself", () => {
    // localStorage blocked: no saved theme or Still, but the splash still works from sessionStorage.
    expect(boot({ theme: "dark", motion: "still", localThrows: true })).toMatchObject({ theme: undefined, motion: undefined, splash: true });
    // sessionStorage blocked: the saved theme and Still apply; no splash.
    expect(boot({ theme: "dark", motion: "still", sessionThrows: true })).toMatchObject({ theme: "dark", motion: "still", splash: false });
    expect(boot({ theme: "light", sessionThrows: true })).toMatchObject({ theme: "light", splash: false });
  });

  it("takes each phase's start from content/stay", () => {
    const quiet = times.quietHours!.value.split("–");
    const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
    expect(vtPhaseStarts).toEqual({
      quiet: minutes(quiet[0]!),
      morning: minutes(quiet[1]!),
      day: minutes(breakfast.hours.value.split("–")[1]!),
      arrivals: minutes(times.checkIn.value),
    });
    expect(vtPhaseStarts).toEqual({ quiet: 21 * 60, morning: 7 * 60, day: 10 * 60 + 30, arrivals: 14 * 60 });
  });

  it("names the house's phase from Vientiane time (UTC+7, no daylight saving), wherever the guest is", () => {
    const at = (hours: number, minutes = 0, day = 5) => boot({ now: vientiane(hours, minutes, day) }).phase;
    expect(at(0, 0)).toBe("quiet");
    expect(at(6, 59)).toBe("quiet");
    expect(at(7, 0)).toBe("morning");
    expect(at(10, 29)).toBe("morning");
    expect(at(10, 30)).toBe("day");
    expect(at(13, 59)).toBe("day");
    expect(at(14, 0)).toBe("arrivals");
    expect(at(20, 59)).toBe("arrivals");
    expect(at(21, 0)).toBe("quiet");
    expect(at(23, 59)).toBe("quiet");
    // Midnight UTC is 07:00 in Vientiane: the date line between them changes nothing.
    expect(boot({ now: Date.UTC(2026, 9, 6, 0, 0) }).phase).toBe("morning");
    // Laos has no daylight saving: the same Vientiane hour in January and July gives the same phase.
    expect(boot({ now: Date.UTC(2026, 0, 15, 7, 0) }).phase).toBe("arrivals");
    expect(boot({ now: Date.UTC(2026, 6, 15, 7, 0) }).phase).toBe("arrivals");
    // Seconds don't round a minute up early.
    expect(boot({ now: vientiane(13, 59) + 59_999 }).phase).toBe("day");
  });

  it("stays small: it runs before every first paint", () => {
    expect(bootScript.length).toBeLessThan(1000);
  });
});

describe("the client side of the theme and motion", () => {
  // lib/theme.ts reads content/stay to build the boot script. A client file that imported it would carry the house's
  // content files in every page's JavaScript, so client files take their names from theme-keys.ts and lib/motion/prefs.ts.
  const clientFiles = [
    "components/layout/theme-store.ts",
    "components/layout/ThemeSwitch.tsx",
    "components/layout/MobileMenu.tsx",
    "components/layout/NavLinks.tsx",
    "components/motion/MotionChoice.tsx",
    "components/motion/StageLife.tsx",
    "lib/motion/hooks.ts",
    "lib/motion/prefs.ts",
    "components/layout/theme-keys.ts",
  ];

  it.each(clientFiles)("%s never imports lib/theme or the content files", (file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    expect(source).not.toMatch(/from ["']@\/lib\/theme["']/);
    expect(source).not.toMatch(/from ["'](?:@\/content|\.\.\/\.\.\/content)\//);
  });

  it("re-exports the theme's names from lib/theme for server code", () => {
    expect(THEME_KEY).toBe("hoj-theme");
    expect(themeColor).toEqual({ light: "#fbf6ee", dark: "#20150c" });
  });
});
