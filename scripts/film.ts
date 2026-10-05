/**
 * Records the site's short films frame by frame from a production build, and encodes them with the system's
 * ffmpeg (no new dependency). The site has no film mode: this script drives Chromium the way a reader scrolls.
 *
 *   npm run build && npm run start -- -p 3000         # in one terminal
 *   BASE_URL=http://localhost:3000 npm run film        # in another: the arrival film, 9:16
 *   npm run film -- arrival-square                     # the same walk, 1:1
 *   npm run film -- lights-on --theme day              # Day turning to Evening
 *   npm run film -- arrival --seconds 3 --out /tmp/x   # a short test, kept out of the repo
 *
 * For each frame (30 a second) it scrolls to the frame's position, pauses every time-based animation in
 * document.getAnimations() and sets its currentTime to the frame's time (scroll-driven ones follow the scroll,
 * so they come out exact), waits two animation frames and takes a screenshot into film-frames/{film}/ (ignored
 * by git). Then it writes {film}.webm (VP9), {film}.mp4 (H.264), {film}-share.mp4 (under 1 MB, for the team to
 * send on WhatsApp), {film}-poster.webp (the rest frame) and {film}.en.vtt (captions from the arrival walk's
 * steps, as the model words them) to public/film/, or to --out.
 *
 * It films the home page's house story (#the-house-story) from the moment it fills the screen to its end;
 * until that section exists, it films the home page's first few screens instead. List a film in
 * components/film/films.ts once its files are committed, and the site shows it.
 *
 * Settings: CHROMIUM_PATH (default /opt/pw-browsers/chromium), BASE_URL (default http://localhost:3000),
 * FFMPEG (default /usr/bin/ffmpeg).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright-core";
import { houseOfJars } from "../lib/house/house-of-jars";
import type { RouteStop } from "../lib/house/types";

interface Recording {
  readonly title: string;
  readonly seconds: number;
  /** The page's CSS size and pixel ratio: the frames are viewport × ratio. */
  readonly viewport: { readonly width: number; readonly height: number };
  readonly ratio: number;
  /** The encoded size for the site (720p), and for the WhatsApp cut. */
  readonly size: readonly [number, number];
  readonly shareSize: readonly [number, number];
  /** Switch from Day to Evening at this second (the "Lights on" film). */
  readonly evening?: number;
  /** Hold on the story's rest frame instead of scrolling through it. */
  readonly hold?: boolean;
  readonly captions: boolean;
}

const RECORDINGS: Readonly<Record<string, Recording>> = {
  arrival: {
    title: "From the terrace to your pod",
    seconds: 20,
    viewport: { width: 432, height: 768 },
    ratio: 2.5,
    size: [720, 1280],
    shareSize: [480, 854],
    captions: true,
  },
  "arrival-square": {
    title: "From the terrace to your pod",
    seconds: 20,
    viewport: { width: 640, height: 640 },
    ratio: 2,
    size: [720, 720],
    shareSize: [480, 480],
    captions: true,
  },
  "lights-on": {
    title: "Lights on",
    seconds: 8,
    viewport: { width: 432, height: 768 },
    ratio: 2.5,
    size: [720, 1280],
    shareSize: [480, 854],
    evening: 2.5,
    hold: true,
    captions: false,
  },
};

const FPS = 30;
const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const executablePath = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const ffmpeg = process.env.FFMPEG ?? "/usr/bin/ffmpeg";

function args() {
  const list = process.argv.slice(2);
  const named = (flag: string) => {
    const i = list.indexOf(flag);
    return i >= 0 ? list[i + 1] : undefined;
  };
  const film = list.find((a, i) => !a.startsWith("--") && !list[i - 1]?.startsWith("--")) ?? "arrival";
  const recording = RECORDINGS[film];
  if (!recording) throw new Error(`No film "${film}". Films: ${Object.keys(RECORDINGS).join(", ")}.`);
  const seconds = Number(named("--seconds") ?? recording.seconds);
  if (!(seconds > 0)) throw new Error("--seconds must be a positive number.");
  const theme = named("--theme") ?? "day";
  if (theme !== "day" && theme !== "evening") throw new Error("--theme is day or evening.");
  return {
    film,
    recording,
    seconds,
    theme: theme as "day" | "evening",
    out: resolve(named("--out") ?? "public/film"),
    frames: resolve(named("--frames") ?? join("film-frames", film)),
  };
}

// ---------------------------------------------------------------------------
// Captions: the arrival walk's steps, timed as the house story lights them (step i at 45% + 50% × its share of
// the walk, through the story's scroll).

/** Each stop's share of the walk, 0 to 1: from public/house/walks.json when it exists, else measured along the model's route. */
function arrivalStops(): { label: string; does: string; at: number }[] {
  const walks = join(process.cwd(), "public/house/walks.json");
  if (existsSync(walks)) {
    try {
      const data = JSON.parse(readFileSync(walks, "utf8")) as Record<string, { stops?: { label: string; does?: string; at: number }[] }>;
      const stops = data.arrival?.stops;
      if (stops?.every((s) => typeof s.at === "number" && s.does)) return stops.map((s) => ({ label: s.label, does: s.does!, at: s.at }));
    } catch {
      // Fall back to the model below.
    }
  }
  const route = houseOfJars.routes.find((r) => r.id === "arrival");
  if (!route?.stops) throw new Error("The house model has no arrival walk.");
  const height = (floor: string) => houseOfJars.floors.find((f) => f.id === floor)?.z ?? 0;
  const points = route.segments.flatMap((seg) => seg.points.map((p) => ({ floor: seg.floor, x: p[0], y: p[1], z: height(seg.floor) + (p[2] ?? 0) })));
  const along: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    along.push(along[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }
  const total = along.at(-1)!;
  const share = (stop: RouteStop) => {
    let best = { d: Infinity, at: 0 };
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      if (a.floor !== stop.floor || b.floor !== stop.floor) continue;
      const [dx, dy] = [b.x - a.x, b.y - a.y];
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((stop.at[0] - a.x) * dx + (stop.at[1] - a.y) * dy) / len2));
      const d = Math.hypot(a.x + t * dx - stop.at[0], a.y + t * dy - stop.at[1]);
      if (d < best.d) best = { d, at: (along[i - 1]! + t * (along[i]! - along[i - 1]!)) / total };
    }
    return best.at;
  };
  return route.stops.filter((s) => s.does).map((s) => ({ label: s.label, does: s.does!, at: share(s) }));
}

const stamp = (seconds: number) => {
  const ms = Math.round(seconds * 1000);
  const hh = String(Math.floor(ms / 3_600_000)).padStart(2, "0");
  const mm = String(Math.floor(ms / 60_000) % 60).padStart(2, "0");
  const ss = String(Math.floor(ms / 1000) % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}.${String(ms % 1000).padStart(3, "0")}`;
};

/** WebVTT for the walk's steps, given when (in film seconds) the scroll reaches each share of the story. */
function captions(timeAt: (progress: number) => number, seconds: number): string {
  const stops = arrivalStops();
  const starts = stops.map((s) => timeAt(0.45 + 0.5 * s.at));
  // Each step shows until the next one lights, so no two cues overlap.
  const cues = stops.map((s, i) => {
    const from = Math.min(starts[i]!, seconds - 0.1);
    const to = Math.max(from + 0.1, Math.min(i + 1 < stops.length ? starts[i + 1]! : seconds, seconds));
    return `${i + 1}\n${stamp(from)} --> ${stamp(to)}\n${s.label}: ${s.does}\n`;
  });
  return `WEBVTT\n\n${cues.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Recording

/** Scroll progress at a film time: a short hold on the first frame, an eased scroll, a longer hold on the rest frame. */
function progressAt(t: number, seconds: number): number {
  const hold = Math.min(0.75, seconds * 0.1);
  const rest = Math.min(1.5, seconds * 0.15);
  const x = Math.max(0, Math.min(1, (t - hold) / Math.max(seconds - hold - rest, 1e-6)));
  return x * x * (3 - 2 * x);
}

/** The inverse, for captions: the first film time at which the scroll reaches a progress. */
function timeAtProgress(p: number, seconds: number): number {
  for (let i = 0; i <= seconds * FPS; i++) if (progressAt(i / FPS, seconds) >= p) return i / FPS;
  return seconds;
}

async function stage(page: Page): Promise<{ from: number; to: number; story: boolean }> {
  return page.evaluate(() => {
    const story = document.getElementById("the-house-story");
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    if (story) {
      const top = story.getBoundingClientRect().top + window.scrollY;
      return { from: Math.max(0, top), to: Math.min(max, top + story.offsetHeight - vh), story: true };
    }
    return { from: 0, to: Math.min(max, 4 * vh), story: false };
  });
}

async function frame(page: Page, y: number, t: number, evening: boolean | null) {
  await page.evaluate(
    ({ y, t, evening }) => {
      const root = document.documentElement;
      if (evening !== null) root.setAttribute("data-theme", evening ? "dark" : "light");
      window.scrollTo({ top: y, behavior: "instant" });
      // Time-based animations play in film time: each from the frame it first appeared in.
      const w = window as unknown as { __filmBorn?: WeakMap<Animation, number> };
      const born = (w.__filmBorn ??= new WeakMap());
      for (const animation of document.getAnimations()) {
        if (animation.timeline !== document.timeline) continue;
        if (!born.has(animation)) born.set(animation, t);
        animation.pause();
        animation.currentTime = (t - born.get(animation)!) * 1000;
      }
    },
    { y, t, evening },
  );
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
}

function encode(input: string, out: string, film: string, rec: Recording, seconds: number) {
  const run = (...a: string[]) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...a], { stdio: "inherit" });
  const frames = ["-framerate", String(FPS), "-i", join(input, "%05d.png")];
  const scale = (size: readonly [number, number]) => ["-vf", `scale=${size[0]}:${size[1]}:flags=lanczos`];
  run(...frames, ...scale(rec.size), "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-row-mt", "1", "-pix_fmt", "yuv420p", "-an", join(out, `${film}.webm`));
  run(...frames, ...scale(rec.size), "-c:v", "libx264", "-crf", "23", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", join(out, `${film}.mp4`));
  // The cut for WhatsApp: a bitrate that keeps the whole film under 1 MB.
  const kbps = Math.floor((0.92 * 8 * 1000) / seconds);
  run(...frames, ...scale(rec.shareSize), "-c:v", "libx264", "-b:v", `${kbps}k`, "-maxrate", `${Math.floor(kbps * 1.4)}k`, "-bufsize", `${kbps * 2}k`, "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", join(out, `${film}-share.mp4`));
  const last = readdirSync(input).filter((f) => f.endsWith(".png")).sort().at(-1)!;
  run("-i", join(input, last), ...scale(rec.size), "-c:v", "libwebp", "-quality", "80", join(out, `${film}-poster.webp`));
}

async function main() {
  const { film, recording: rec, seconds, theme, out, frames } = args();
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  mkdirSync(out, { recursive: true });

  const browser = await chromium.launch({ executablePath });
  const context = await browser.newContext({
    viewport: rec.viewport,
    deviceScaleFactor: rec.ratio,
    colorScheme: theme === "evening" ? "dark" : "light",
    reducedMotion: "no-preference",
  });
  // No splash, the chosen theme, and no header or Ask Shadow dock over the film. Written as a string: a function
  // compiled by tsx would carry its helpers into the page.
  const hide = '[data-site-header],div:has(> button[aria-label^="Ask Shadow"]){visibility:hidden!important}html{scroll-behavior:auto!important}';
  await context.addInitScript(`(() => {
    try { sessionStorage.setItem("hoj-splash", "1"); localStorage.setItem("hoj-theme", ${JSON.stringify(theme === "evening" ? "dark" : "light")}); } catch {}
    const style = document.createElement("style");
    style.textContent = ${JSON.stringify(hide)};
    const add = () => (document.head || document.documentElement).appendChild(style);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
  })();`);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const { from, to, story } = await stage(page);
  console.log(`${film}: ${story ? "the house story" : "no #the-house-story yet, so the home page's first screens"}, scroll ${from}–${to} px`);

  const total = Math.max(1, Math.round(seconds * FPS));
  let lit: boolean | null = null;
  for (let i = 0; i < total; i++) {
    const t = i / FPS;
    const y = rec.hold ? to : Math.round(from + (to - from) * progressAt(t, seconds));
    const evening = rec.evening === undefined ? null : t >= rec.evening;
    // The pictures that follow the device's colours switch with the site.
    if (evening !== null && evening !== lit) await page.emulateMedia({ colorScheme: evening ? "dark" : "light" });
    lit = evening;
    await frame(page, y, t, evening);
    await page.screenshot({ path: join(frames, `${String(i + 1).padStart(5, "0")}.png`) });
    if ((i + 1) % FPS === 0) process.stdout.write(`  ${i + 1}/${total} frames\r`);
  }
  await browser.close();
  if (errors.length) console.warn(`page errors while filming:\n  ${errors.join("\n  ")}`);

  encode(frames, out, film, rec, seconds);
  if (rec.captions) writeFileSync(join(out, `${film}.en.vtt`), captions((p) => timeAtProgress(p, seconds), seconds));
  for (const file of readdirSync(out).filter((f) => f.startsWith(`${film}.`) || f.startsWith(`${film}-`))) {
    console.log(`wrote    ${join(out, file)}  ${(statSync(join(out, file)).size / 1024).toFixed(0)} kB`);
  }
  console.log(`\nList it in components/film/films.ts once committed: { id: "${film}", title: "${rec.title}", width: ${rec.size[0]}, height: ${rec.size[1]} }`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
