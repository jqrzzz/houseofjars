/**
 * Builds a social piece from scripts/social/pieces/: one design in three formats, made the way the site's own
 * film is (scripts/film.ts), in Chromium, frame by frame, encoded with the system's ffmpeg (no new dependency).
 *
 *   npm run social -- house-rules                  # the film, the email GIF and the still cards
 *   npm run social -- house-rules --only gif       # one format: video, gif or still
 *   npm run social -- house-rules --check          # build, then check every output (fails on any problem)
 *
 * It serves the piece's pages from a small server on 127.0.0.1 (the drawings, icons and fonts straight from the
 * repo; no route is added to the site), opens them in Chromium at their output size and:
 *
 * - films the 9:16 video: 30 frames a second into film-frames/social/{slug}/video/ (ignored by git), each one a
 *   seek of every animation to the frame's time, then encodes social/{slug}/{slug}-9x16.mp4 (H.264, BT.709,
 *   silent) and its cover, frame 0;
 * - photographs the GIF's states at pixel ratios 1 and 2, encodes public/email/{slug}.gif and {slug}@2x.gif with
 *   one palette, sets each frame's delay (scripts/social/gif.ts), and writes {slug}.png, frame 1 as a still;
 * - photographs the still cards, Day and Evening, into social/{slug}/;
 * - writes social/{slug}/{slug}-post.txt: the caption, the alt texts and the email's link line.
 *
 * Review sheets go beside the frames: contact.png (the film at its key moments), safe-zones.png (the platforms'
 * overlays tinted over a frame), cards.png (the still cards side by side) and the GIF's frames 1, 6, 11 and 16.
 *
 * --check then holds the outputs to the piece's spec: every caption fully opaque for its reading window, all
 * text inside the safe zones, a seamless loop (the last frames equal frame 0, byte for byte), frames that come
 * out the same twice, no fallback fonts, no white text on orange, the video's format (ffprobe) and colour, and
 * the GIFs' sizes, frames, delays, loop and first frame.
 *
 * Settings: CHROMIUM_PATH (default /opt/pw-browsers/chromium), FFMPEG and FFPROBE (default /usr/bin/ffmpeg and
 * /usr/bin/ffprobe).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { register } from "node:module";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";
import sharp from "sharp";
import { readGif, setDelays } from "./social/gif";
import { opaqueWindows, readingProblems, reviewProblems, type Layer, type Piece } from "./social/piece";
import { houseRules } from "./social/pieces/house-rules";
import * as theatre from "./social/theatre";
import { FORMATS, type Format } from "./social/theatre";

// Components import their CSS Modules: hand them class maps (scripts/social/css-hook.mjs). theatre.ts imports
// ShadowFigure and WovenBand only when it builds its first page, after this.
register("./social/css-hook.mjs", import.meta.url);

const PIECES: Readonly<Record<string, Piece>> = { "house-rules": houseRules };

const executablePath = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const ffmpeg = process.env.FFMPEG ?? "/usr/bin/ffmpeg";
const ffprobe = process.env.FFPROBE ?? "/usr/bin/ffprobe";
const root = process.cwd();

function args() {
  const list = process.argv.slice(2);
  const named = (flag: string) => {
    const i = list.indexOf(flag);
    return i >= 0 ? list[i + 1] : undefined;
  };
  const name = list.find((a, i) => !a.startsWith("--") && list[i - 1] !== "--only");
  const piece = name ? PIECES[name] : undefined;
  if (!piece) throw new Error(`Name a piece: npm run social -- <piece> [--only video|gif|still] [--check]. Pieces: ${Object.keys(PIECES).join(", ")}.`);
  const only = named("--only");
  if (only !== undefined && !FORMATS.includes(only as Format)) throw new Error(`--only is ${FORMATS.join(", ")}.`);
  return { piece, formats: only ? [only as Format] : [...FORMATS], check: list.includes("--check") };
}

/** Where everything goes: committed outputs in social/{slug}/ and public/email/, review material in film-frames/. */
function places(piece: Piece) {
  const frames = join(root, "film-frames/social", piece.slug);
  return {
    social: join(root, "social", piece.slug),
    email: join(root, "public/email"),
    frames,
    video: join(frames, "video"),
    gif: (ratio: 1 | 2) => join(frames, "gif", `${ratio}x`),
  };
}

const run = (command: string, list: string[], cwd = root) => execFileSync(command, list, { cwd, stdio: ["ignore", "pipe", "pipe"] });
const ff = (list: string[], cwd = root) => run(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...list], cwd);
const kB = (path: string) => `${(statSync(path).size / 1024).toFixed(0)} kB`;
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const frameName = (i: number) => `${String(i).padStart(5, "0")}.png`;

// ---------------------------------------------------------------------------
// Serving: the piece's pages, and the repo's own drawings, icons and fonts, on 127.0.0.1 at a free port.

const TYPES: Readonly<Record<string, string>> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".html": "text/html; charset=utf-8",
};

const FONTS: Readonly<Record<string, string>> = {
  "/fonts/figtree.woff2": "node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2",
  "/fonts/noto-sans-lao.woff2": "node_modules/@fontsource-variable/noto-sans-lao/files/noto-sans-lao-lao-wght-normal.woff2",
};

/** A file under a folder of the repo, or undefined for a path that leaves it. */
function within(folder: string, rest: string): string | undefined {
  const base = join(root, folder);
  const path = normalize(join(base, rest));
  return path.startsWith(base + sep) ? path : undefined;
}

function fileFor(pathname: string): string | undefined {
  if (FONTS[pathname]) return join(root, FONTS[pathname]);
  if (pathname.startsWith("/art/") || pathname.startsWith("/brand/")) return within("public", pathname);
  if (pathname.startsWith("/icons/")) return within("brand/icons", pathname.slice("/icons/".length));
  return undefined;
}

async function serve(piece: Piece): Promise<{ server: Server; origin: string; missing: string[] }> {
  const missing: string[] = [];
  const pages = new Map<string, Promise<string>>();
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const fail = (status: number) => {
      missing.push(`${status} ${url.pathname}`);
      response.writeHead(status).end();
    };
    if (url.pathname === "/favicon.ico") return void response.writeHead(204).end();
    if (url.pathname === "/") {
      const format = url.searchParams.get("format") ?? "video";
      const theme = (url.searchParams.get("theme") ?? "day") as Layer;
      if (!FORMATS.includes(format as Format) || (theme !== "day" && theme !== "evening")) return fail(400);
      const key = `${format}:${theme}`;
      if (!pages.has(key)) pages.set(key, format === "video" ? theatre.videoPage(piece) : theatre.boardPage(piece, format as "gif" | "still", theme));
      pages.get(key)!.then(
        (html) => response.writeHead(200, { "content-type": TYPES[".html"]!, "cache-control": "no-store" }).end(html),
        (error: unknown) => {
          console.error(error);
          fail(500);
        },
      );
      return;
    }
    const file = fileFor(decodeURIComponent(url.pathname));
    if (!file || !existsSync(file)) return fail(404);
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("The server has no port.");
  return { server, origin: `http://127.0.0.1:${address.port}`, missing };
}

// ---------------------------------------------------------------------------
// Chromium

interface Opened {
  readonly page: Page;
  /** Closes the page, and fails if it had an error or asked for a file the server doesn't have since it opened. */
  close(): Promise<void>;
}

/**
 * Opens a page at its output size and waits until it is complete: the fonts loaded (Figtree 500, 600 and 700,
 * Noto Sans Lao 600; no fallback), every image decoded, no page error and no file missing. Pages are opened one
 * at a time, so whatever goes wrong before close() is this page's.
 */
async function open(browser: Browser, origin: string, missing: string[], query: string, size: { width: number; height: number }, ratio: number): Promise<Opened> {
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: ratio });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(`${origin}/?${query}`, { waitUntil: "load" });
  const fonts = await page.evaluate(`(async () => {
    const wanted = ['500 60px "Figtree"', '600 60px "Figtree"', '700 60px "Figtree"', '600 46px "Noto Sans Lao"'];
    await Promise.all(wanted.map((font) => document.fonts.load(font, font.includes("Lao") ? "ສະບາຍດີ" : "Aa")));
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode()));
    return wanted.filter((font) => !document.fonts.check(font, font.includes("Lao") ? "ສະບາຍດີ" : "Aa"));
  })()`);
  const unloaded = fonts as string[];
  if (unloaded.length) errors.push(`fonts not loaded: ${unloaded.join(", ")}`);
  if (missing.length) errors.push(...missing.splice(0));
  if (errors.length) throw new Error(`${query}: ${errors.join("; ")}`);
  return {
    page,
    close: async () => {
      await context.close();
      const late = [...errors, ...missing.splice(0)];
      if (late.length) throw new Error(`${query}, after it opened: ${late.join("; ")}`);
    },
  };
}

/** The film at time t: every animation paused at t (each is a whole-film track, born at 0), then two frames drawn. */
async function seek(page: Page, t: number) {
  await page.evaluate((time) => (window as unknown as { theatre: { seek(t: number): void } }).theatre.seek(time), t);
  await page.evaluate("new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))");
}

// ---------------------------------------------------------------------------
// The film

/** Each caption's opacity, in each layer: sampled every frame, to prove the timeline matches the reading budget. */
type Opacities = { layer: string; id: string; opacity: number }[];
const SAMPLE_OPACITY = `[...document.querySelectorAll("[data-caption]")].map((el) => ({
  layer: el.closest("[data-layer]").dataset.layer, id: el.dataset.caption, opacity: Number(getComputedStyle(el).opacity) }))`;

async function film(browser: Browser, server: { origin: string; missing: string[] }, piece: Piece) {
  const where = places(piece);
  rmSync(where.video, { recursive: true, force: true });
  mkdirSync(where.video, { recursive: true });
  mkdirSync(where.social, { recursive: true });
  const { fps, seconds } = piece.video;
  const total = Math.round(seconds * fps);
  const opened = await open(browser, server.origin, server.missing, "format=video", { width: 1080, height: 1920 }, 1);
  const { page } = opened;
  const opacities: Opacities[] = [];
  for (let i = 0; i < total; i++) {
    await seek(page, i / fps);
    opacities.push((await page.evaluate(SAMPLE_OPACITY)) as Opacities);
    writeFileSync(join(where.video, frameName(i)), await page.screenshot({ type: "png" }));
    if ((i + 1) % fps === 0) process.stdout.write(`  film ${i + 1}/${total} frames\r`);
  }
  process.stdout.write("\n");
  const safe = await safeZones(page, piece, join(where.frames, "safe-zones.png"));
  const plate = await platePatch(page, piece);
  await opened.close();

  const mp4 = join(where.social, `${piece.slug}-9x16.mp4`);
  ff(
    ["-framerate", String(fps), "-i", "%05d.png", "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.0"]
      .concat(["-preset", "slow", "-crf", "18", "-tune", "animation", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv"])
      .concat(["-movflags", "+faststart", "-an", mp4]),
    where.video,
  );
  const cover = join(where.social, `${piece.slug}-9x16-cover.png`);
  copyFileSync(join(where.video, frameName(0)), cover);
  await contactSheet(
    piece.video.review.contact.map((t) => ({ file: join(where.video, frameName(Math.min(total - 1, Math.round(t * fps)))), label: `${t.toFixed(2)} s` })),
    6,
    270,
    join(where.frames, "contact.png"),
  );
  console.log(`wrote    ${mp4}  ${kB(mp4)}\nwrote    ${cover}  ${kB(cover)}`);
  return { mp4, opacities, safe, plate };
}

/**
 * Where to sample jar orange in the encoded film: a 4 × 4 patch on the top margin of the plate on screen at the
 * piece's plate moment (the plate's centre is its icon's ink), as a frame number and the patch's top left.
 */
async function platePatch(page: Page, piece: Piece): Promise<{ frame: number; x: number; y: number }> {
  const { fps, review } = piece.video;
  const frame = Math.round(review.plate * fps);
  await seek(page, frame / fps);
  const box = (await page.evaluate(`(() => {
    const plate = [...document.querySelectorAll('[data-layer="day"] [data-caption] [data-plate]')]
      .find((el) => Number(getComputedStyle(el.closest("[data-caption]")).opacity) === 1);
    if (!plate) return null;
    const r = plate.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width };
  })()`)) as { x: number; y: number; width: number } | null;
  if (!box) throw new Error(`No plate is on screen at ${review.plate} s, where the piece samples its colour.`);
  return { frame, x: Math.round(box.x + box.width / 2) - 2, y: Math.round(box.y) + 7 };
}

interface Box {
  readonly what: string;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly text: boolean;
}

/**
 * The safe zones: at each caption's rest, every line of text and every plate must sit inside x 90–990, y 250–1500
 * (nothing near the top, the foot or the sides, where the apps put their own words), and no text may reach right
 * of x 930 between y 1100 and 1650 (Reels' and TikTok's buttons). Writes safe-zones.png: the piece's safe-zones
 * frame with the zones tinted and every measured box outlined.
 *
 * Both layers carry the same captions on the same tracks, so their words sit in the same places whichever layer
 * is uncovered: each layer is measured, and the two must agree.
 */
async function safeZones(page: Page, piece: Piece, overlay: string): Promise<string[]> {
  const problems: string[] = [];
  const measure = async (t: number) => {
    await seek(page, t);
    const layers = (await page.evaluate(`["day", "evening"].map((layer) => {
      const scope = document.querySelector('[data-layer="' + layer + '"]');
      const visible = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) if (Number(getComputedStyle(e).opacity) < 0.999) return false; return true; };
      const boxes = [];
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent.trim() || !visible(node.parentElement)) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (r.right <= 0 || r.left >= innerWidth || r.bottom <= 0 || r.top >= innerHeight) continue;
          boxes.push({ what: node.textContent.trim(), x0: r.left, y0: r.top, x1: r.right, y1: r.bottom, text: true });
        }
      }
      for (const plate of scope.querySelectorAll("[data-plate]")) {
        if (!visible(plate)) continue;
        const r = plate.getBoundingClientRect();
        boxes.push({ what: "plate " + plate.dataset.plate, x0: r.left, y0: r.top, x1: r.right, y1: r.bottom, text: false });
      }
      return boxes;
    })`)) as [Box[], Box[]];
    if (JSON.stringify(layers[0]) !== JSON.stringify(layers[1])) problems.push(`at ${t.toFixed(2)} s the Day and Evening layers set their words in different places.`);
    return layers[0];
  };
  const { fps, review } = piece.video;
  const rests = piece.video.captions.map((c) => ({ id: c.id, t: Math.round(((c.in + c.out) / 2) * fps) / fps }));
  for (const { id, t } of [...rests, { id: "safe-zones frame", t: review.safeZones }]) {
    const boxes = await measure(t);
    if (!boxes.length) problems.push(`${id} at ${t.toFixed(2)} s: nothing measured.`);
    for (const b of boxes) {
      const where = `${b.what} at ${t.toFixed(2)} s (${b.x0.toFixed(0)}–${b.x1.toFixed(0)}, ${b.y0.toFixed(0)}–${b.y1.toFixed(0)})`;
      if (b.x0 < 90 || b.x1 > 990 || b.y0 < 250 || b.y1 > 1500) problems.push(`${where} leaves x 90–990, y 250–1500.`);
      if (b.text && b.x1 > 930 && b.y1 > 1100 && b.y0 < 1650) problems.push(`${where} reaches under the apps' buttons (right of x 930, y 1100–1650).`);
    }
  }
  // The overlay: the safe-zones frame, the zones tinted, the measured boxes outlined.
  const boxes = await measure(review.safeZones);
  await page.evaluate(
    ({ boxes }) => {
      const layer = document.createElement("div");
      layer.id = "safe-overlay";
      layer.style.cssText = "position:absolute;inset:0;z-index:10;pointer-events:none";
      const zones = [
        [0, 0, 1080, 250],
        [0, 1500, 1080, 420],
        [0, 250, 90, 1250],
        [990, 250, 90, 1250],
      ];
      let html = zones.map(([x, y, w, h]) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:rgb(255 0 120/.28)"></div>`).join("");
      html += `<div style="position:absolute;left:950px;top:1100px;width:130px;height:550px;background:rgb(0 136 255/.22);outline:4px dashed #08f;outline-offset:-4px"></div>`;
      html += boxes
        .map((b) => `<div style="position:absolute;left:${b.x0}px;top:${b.y0}px;width:${b.x1 - b.x0}px;height:${b.y1 - b.y0}px;outline:3px solid ${b.text ? "#0a0" : "#06f"}"></div>`)
        .join("");
      layer.innerHTML = html;
      document.body.append(layer);
    },
    { boxes },
  );
  await page.screenshot({ path: overlay });
  await page.evaluate(() => document.getElementById("safe-overlay")?.remove());
  return problems;
}

/** A sheet of images in a grid, each scaled to `width` and labelled under it. */
async function contactSheet(items: readonly { file: string; label: string }[], columns: number, width: number, out: string) {
  const first = await sharp(items[0]!.file).metadata();
  const height = Math.round((width * first.height!) / first.width!);
  const gap = 16;
  const label = 36;
  const rows = Math.ceil(items.length / columns);
  const sheetWidth = columns * width + (columns + 1) * gap;
  const sheetHeight = rows * (height + label) + (rows + 1) * gap;
  const tiles = await Promise.all(
    items.map(async ({ file, label: text }, n) => {
      const left = gap + (n % columns) * (width + gap);
      const top = gap + Math.floor(n / columns) * (height + label + gap);
      const image = await sharp(file).resize(width, height).png().toBuffer();
      const caption = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${label}"><text x="0" y="26" font-family="sans-serif" font-size="22" fill="#171713">${text}</text></svg>`,
      );
      return [
        { input: image, left, top },
        { input: caption, left, top: top + height },
      ];
    }),
  );
  await sharp({ create: { width: sheetWidth, height: sheetHeight, channels: 3, background: "#e9e2d6" } })
    .composite(tiles.flat())
    .png()
    .toFile(out);
}

// ---------------------------------------------------------------------------
// The email GIF

async function gif(browser: Browser, server: { origin: string; missing: string[] }, piece: Piece) {
  const where = places(piece);
  mkdirSync(where.email, { recursive: true });
  const out: Record<1 | 2, string> = { 1: join(where.email, `${piece.slug}.gif`), 2: join(where.email, `${piece.slug}@2x.gif`) };
  const { width, height } = theatre.BOARD.gif;
  for (const ratio of [1, 2] as const) {
    const dir = where.gif(ratio);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const opened = await open(browser, server.origin, server.missing, "format=gif&theme=day", { width, height }, ratio);
    for (const [n, frame] of piece.gif.frames.entries()) {
      await opened.page.evaluate((wash) => (window as unknown as { theatre: { setWash(w: readonly number[]): void } }).theatre.setWash(wash), frame.wash);
      await seek(opened.page, 0);
      await opened.page.screenshot({ path: join(dir, `${String(n + 1).padStart(2, "0")}.png`) });
    }
    await opened.close();
    // One global palette for every frame, each frame only what changed, every delay 10 cs; then the real delays.
    const raw = join(dir, "encoded.gif");
    ff(
      ["-framerate", "10", "-i", "%02d.png", "-vf", "split[a][b];[a]palettegen=max_colors=256:stats_mode=full:reserve_transparent=1[p];[b][p]paletteuse=dither=none:diff_mode=rectangle"]
        .concat(["-loop", "0", raw]),
      dir,
    );
    writeFileSync(out[ratio], setDelays(readFileSync(raw), piece.gif.frames.map((f) => f.cs)));
    console.log(`wrote    ${out[ratio]}  ${kB(out[ratio])}`);
  }
  // Frame 1 as a still, for the tools that refuse animation: the 2x frame, paletted.
  const png = join(where.email, `${piece.slug}.png`);
  ff(["-i", join(where.gif(2), "01.png"), "-vf", "split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none", "-frames:v", "1", png]);
  console.log(`wrote    ${png}  ${kB(png)}`);
  // The shipped GIF's frames 1, 6, 11 and 16 (the rest and the three holds), decoded, for review.
  const picks = [1, 6, 11, 16];
  ff(["-i", out[2], "-vf", `select='${picks.map((n) => `eq(n\\,${n - 1})`).join("+")}'`, "-fps_mode", "passthrough", join(where.frames, "gif-decoded-%d.png")]);
  picks.forEach((n, i) => renameSync(join(where.frames, `gif-decoded-${i + 1}.png`), join(where.frames, `gif-frame-${String(n).padStart(2, "0")}.png`)));
  return out;
}

// ---------------------------------------------------------------------------
// The still cards

async function stills(browser: Browser, server: { origin: string; missing: string[] }, piece: Piece) {
  const where = places(piece);
  mkdirSync(where.social, { recursive: true });
  const { width, height } = theatre.BOARD.still;
  const files: string[] = [];
  for (const still of piece.stills) {
    const opened = await open(browser, server.origin, server.missing, `format=still&theme=${still.theme}`, { width, height }, 1);
    await seek(opened.page, 0);
    const file = join(where.social, still.file);
    await opened.page.screenshot({ path: file });
    await opened.close();
    files.push(file);
    console.log(`wrote    ${file}  ${kB(file)}`);
  }
  await contactSheet(
    files.map((file, i) => ({ file, label: piece.stills[i]!.theme })),
    files.length,
    540,
    join(where.frames, "cards.png"),
  );
  return files;
}

// ---------------------------------------------------------------------------
// Checks

/** An sRGB colour, as bytes, to CIE Lab (D65), for colour differences. */
function lab([r, g, b]: readonly [number, number, number]): [number, number, number] {
  const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const hexRgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const deltaE = (a: readonly [number, number, number], b: readonly [number, number, number]) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]!));

/** Page checks that need no time: fonts not falling back, and no white text on jar orange. */
async function pageChecks(page: Page, name: string): Promise<string[]> {
  const problems: string[] = [];
  const width = (await page.evaluate(`(() => {
    const probe = document.createElement("span");
    probe.textContent = "Three house rules";
    probe.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;font:700 84px Figtree;letter-spacing:-0.02em";
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  })()`)) as number;
  if (Math.abs(width - 649) > 2) problems.push(`${name}: "Three house rules" at 84 px is ${width.toFixed(1)} px wide, not 649 ± 2: a fallback font?`);
  const white = (await page.evaluate(`(() => {
    const rgb = (c) => (c.match(/[\\d.]+/g) || []).map(Number);
    const found = [];
    for (const el of document.querySelectorAll("body *")) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const [r, g, b] = rgb(getComputedStyle(el).color);
      let bg = null;
      for (let e = el; e; e = e.parentElement) {
        const c = rgb(getComputedStyle(e).backgroundColor);
        if (c.length >= 3 && (c.length < 4 || c[3] > 0)) { bg = c; break; }
      }
      const orange = bg && Math.abs(bg[0] - 231) < 12 && Math.abs(bg[1] - 110) < 12 && Math.abs(bg[2] - 67) < 12;
      if (orange && r > 230 && g > 230 && b > 220) found.push(el.textContent.trim().slice(0, 40));
    }
    return found;
  })()`)) as string[];
  for (const text of white) problems.push(`${name}: white text on jar orange: "${text}".`);
  return problems;
}

async function checkVideo(browser: Browser, server: { origin: string; missing: string[] }, piece: Piece, made: Awaited<ReturnType<typeof film>>): Promise<string[]> {
  const problems = [...made.safe];
  const where = places(piece);
  const { fps, seconds } = piece.video;
  const total = Math.round(seconds * fps);

  // Reading time, in the browser: each caption fully opaque, in both layers, on every frame of its window.
  for (const w of opaqueWindows(piece.video.captions)) {
    for (let i = Math.ceil(w.from * fps - 1e-6); i <= Math.min(total - 1, Math.floor(w.to * fps + 1e-6)); i++) {
      const samples = made.opacities[i]!.filter((s) => s.id === w.id);
      if (samples.length !== 2) problems.push(`caption ${w.id}: ${samples.length} layers sampled at frame ${i}, not 2.`);
      for (const sample of samples) {
        if (sample.opacity < 1) problems.push(`caption ${w.id} is at opacity ${sample.opacity.toFixed(3)} in the ${sample.layer} layer at frame ${i} (${(i / fps).toFixed(2)} s), inside its reading window.`);
      }
    }
  }

  // The loop: the last two frames are frame 0, byte for byte.
  const zero = readFileSync(join(where.video, frameName(0)));
  for (const i of [total - 2, total - 1]) if (!zero.equals(readFileSync(join(where.video, frameName(i))))) problems.push(`frame ${i} is not frame 0: the loop jumps.`);

  // Determinism: the same frames again, in a fresh page, to the same bytes.
  const again = await open(browser, server.origin, server.missing, "format=video", { width: 1080, height: 1920 }, 1);
  for (const i of [0, 72, 200, 330, 405]) {
    await seek(again.page, i / fps);
    const shot = await again.page.screenshot({ type: "png" });
    if (sha(shot) !== sha(readFileSync(join(where.video, frameName(i))))) {
      writeFileSync(join(where.frames, `again-${frameName(i)}`), shot);
      problems.push(`frame ${i} came out differently the second time (film-frames/social/${piece.slug}/again-${frameName(i)}).`);
    }
  }
  problems.push(...(await pageChecks(again.page, "film")));
  await again.close();

  // The file: ffprobe's account of it.
  const probe = JSON.parse(run(ffprobe, ["-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", made.mp4]).toString()) as {
    streams: Record<string, string | number>[];
    format: { duration: string; size: string };
  };
  const video = probe.streams.find((s) => s.codec_type === "video");
  if (!video) problems.push("the mp4 has no video stream.");
  else {
    const want: Record<string, string | number> = {
      codec_name: "h264",
      profile: "High",
      level: 40,
      width: 1080,
      height: 1920,
      r_frame_rate: "30/1",
      nb_read_frames: String(total),
      pix_fmt: "yuv420p",
      color_space: "bt709",
      color_transfer: "bt709",
      color_primaries: "bt709",
      color_range: "tv",
    };
    for (const [key, value] of Object.entries(want)) if (String(video[key]) !== String(value)) problems.push(`mp4 ${key} is ${video[key]}, not ${value}.`);
  }
  if (probe.streams.some((s) => s.codec_type === "audio")) problems.push("the mp4 has an audio stream; it must be silent.");
  if (Math.abs(Number(probe.format.duration) - seconds) > 0.0005) problems.push(`the mp4 is ${probe.format.duration} s, not ${seconds.toFixed(3)}.`);
  if (Number(probe.format.size) > 8 * 1024 * 1024) problems.push(`the mp4 is ${kB(made.mp4)}, over 8 MB.`);
  // Fast start: the index (moov) before the pictures (mdat), so a browser can play it while it downloads.
  const boxes = topLevelBoxes(readFileSync(made.mp4));
  if (boxes.indexOf("moov") < 0 || boxes.indexOf("moov") > boxes.indexOf("mdat")) problems.push(`the mp4's boxes run ${boxes.join(", ")}: moov must come before mdat (+faststart).`);

  // Colour: jar orange survives the encode, sampled on a plate's top margin at the piece's plate moment.
  const { frame, x, y } = made.plate;
  const raw = run(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", made.mp4, "-vf", `select=eq(n\\,${frame}),crop=4:4:${x}:${y},scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24`, "-frames:v", "1", "-f", "rawvideo", "-"]);
  const mean = [0, 1, 2].map((c) => [...raw].filter((_, i) => i % 3 === c).reduce((a, b) => a + b, 0) / (raw.length / 3)) as [number, number, number];
  const difference = deltaE(mean, hexRgb("#e76e43"));
  if (difference > 3) problems.push(`the plate at frame ${frame} (${x}, ${y}) decodes as rgb(${mean.map((v) => v.toFixed(0)).join(", ")}), ΔE ${difference.toFixed(1)} from jar orange (limit 3).`);
  console.log(`check    plate colour ΔE ${difference.toFixed(2)}; mp4 ${kB(made.mp4)}`);
  return problems;
}

/** The names of an MP4's top-level boxes, in order (ftyp, moov, free, mdat…). */
function topLevelBoxes(bytes: Buffer): string[] {
  const names: string[] = [];
  for (let at = 0; at + 8 <= bytes.length; ) {
    let size = bytes.readUInt32BE(at);
    names.push(bytes.toString("latin1", at + 4, at + 8));
    if (size === 1) size = Number(bytes.readBigUInt64BE(at + 8));
    else if (size === 0) size = bytes.length - at;
    if (size < 8) break;
    at += size;
  }
  return names;
}

/** A PNG's size and colour type from its header (IHDR): 3 is paletted. */
function pngHeader(bytes: Buffer): { width: number; height: number; colourType: number } {
  if (bytes.toString("latin1", 12, 16) !== "IHDR") throw new Error("not a PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colourType: bytes[25]! };
}

async function checkGif(browser: Browser, server: { origin: string; missing: string[] }, piece: Piece, out: Record<1 | 2, string>): Promise<string[]> {
  const problems: string[] = [];
  const where = places(piece);
  const want = piece.gif.frames.map((f) => f.cs);
  for (const ratio of [1, 2] as const) {
    const file = out[ratio];
    const info = readGif(readFileSync(file));
    const [w, h] = [theatre.BOARD.gif.width * ratio, theatre.BOARD.gif.height * ratio];
    if (info.width !== w || info.height !== h) problems.push(`${file}: ${info.width}×${info.height}, not ${w}×${h}.`);
    if (info.frames.length !== want.length) problems.push(`${file}: ${info.frames.length} frames, not ${want.length}.`);
    const delays = info.frames.map((f) => f.delay);
    if (delays.join() !== want.join()) problems.push(`${file}: delays ${delays.join(" ")} cs, not ${want.join(" ")}.`);
    // The same delays as ffmpeg's own GIF reader sees them, so the check doesn't rest on the walker that wrote them.
    const probed = (JSON.parse(run(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "frame=duration_time", "-of", "json", file]).toString()) as {
      frames: { duration_time: string }[];
    }).frames.map((f) => Math.round(Number(f.duration_time) * 100));
    if (probed.join() !== want.join()) problems.push(`${file}: ffprobe reads delays ${probed.join(" ")} cs, not ${want.join(" ")}.`);
    if (info.loop !== 0) problems.push(`${file}: loop count ${info.loop}, not 0 (forever).`);
    const size = statSync(file).size;
    if (ratio === 2 && size > 800 * 1024) problems.push(`${file}: ${kB(file)}, over 800 KB (see the fallback ladder in the spec: fewer wash steps, then the 1x file only).`);
    if (ratio === 1 && size > 1024 * 1024) problems.push(`${file}: ${kB(file)}, over 1 MB.`);
    else if (ratio === 1 && size > 800 * 1024) console.warn(`warning  ${file}: ${kB(file)}, over the 800 KB target.`);
    // Frame 1 as the email shows it (Outlook shows nothing else) against the page it was photographed from.
    const psnr = spawnSync(ffmpeg, ["-hide_banner", "-i", file, "-i", join(where.gif(ratio), "01.png"), "-filter_complex", "[0:v]select=eq(n\\,0),format=rgb24[a];[1:v]format=rgb24[b];[a][b]psnr", "-frames:v", "1", "-f", "null", "-"], { encoding: "utf8" });
    const average = /average:([\d.]+|inf)/.exec(psnr.stderr)?.[1];
    const db = average === "inf" ? Infinity : Number(average);
    if (!(db >= 35)) problems.push(`${file}: frame 1 is ${average ?? "?"} dB PSNR from the rendered rest frame, under 35.`);
    console.log(`check    ${file}: ${info.width}×${info.height}, ${info.frames.length} frames, ${(delays.reduce((a, b) => a + b, 0) / 100).toFixed(1)} s loop, ${kB(file)}, frame 1 at ${average} dB`);
  }
  // The still of frame 1, for the tools that refuse animation: the 2x size, paletted.
  const png = join(where.email, `${piece.slug}.png`);
  const header = pngHeader(readFileSync(png));
  const [pw, ph] = [theatre.BOARD.gif.width * 2, theatre.BOARD.gif.height * 2];
  if (header.width !== pw || header.height !== ph || header.colourType !== 3) {
    problems.push(`${png}: ${header.width}×${header.height}, colour type ${header.colourType}; not ${pw}×${ph}, paletted (3).`);
  }
  // Type: never under 30 px for the body or 40 px for the headlines (the email shrinks to 62% on a phone).
  const opened = await open(browser, server.origin, server.missing, "format=gif&theme=day", { width: theatre.BOARD.gif.width, height: theatre.BOARD.gif.height }, 1);
  const sizes = (await opened.page.evaluate(`[...document.querySelectorAll("[data-role]")].map((el) => ({ role: el.dataset.role, size: parseFloat(getComputedStyle(el).fontSize), text: el.textContent }))`)) as { role: string; size: number; text: string }[];
  for (const s of sizes) {
    if (s.role === "body" && s.size < 30) problems.push(`GIF body "${s.text}" is ${s.size} px, under 30.`);
    if (s.role === "headline" && s.size < 40) problems.push(`GIF headline "${s.text}" is ${s.size} px, under 40.`);
  }
  problems.push(...(await pageChecks(opened.page, "GIF")));
  await opened.close();
  return problems;
}

async function checkStills(browser: Browser, server: { origin: string; missing: string[] }, piece: Piece): Promise<string[]> {
  const problems: string[] = [];
  for (const still of piece.stills) {
    const opened = await open(browser, server.origin, server.missing, `format=still&theme=${still.theme}`, { width: theatre.BOARD.still.width, height: theatre.BOARD.still.height }, 1);
    problems.push(...(await pageChecks(opened.page, still.file)));
    await opened.close();
  }
  return problems;
}

// ---------------------------------------------------------------------------

async function main() {
  const { piece, formats, check } = args();
  const problems = [...readingProblems(piece), ...reviewProblems(piece)];
  if (problems.length) throw new Error(`The piece's captions don't add up:\n  ${problems.join("\n  ")}`);
  const where = places(piece);
  mkdirSync(where.frames, { recursive: true });
  mkdirSync(where.social, { recursive: true });
  const post = join(where.social, `${piece.slug}-post.txt`);
  writeFileSync(post, piece.post);
  console.log(`wrote    ${post}`);

  const server = await serve(piece);
  // Every animation runs on the main thread, where a paused one is exactly at its currentTime: one the compositor
  // ran could drift a few milliseconds, and the same frame would not come out the same twice.
  const browser = await chromium.launch({ executablePath, args: ["--disable-threaded-animation"] });
  try {
    if (formats.includes("video")) {
      const made = await film(browser, server, piece);
      if (check) problems.push(...(await checkVideo(browser, server, piece, made)));
    }
    if (formats.includes("gif")) {
      const out = await gif(browser, server, piece);
      if (check) problems.push(...(await checkGif(browser, server, piece, out)));
    }
    if (formats.includes("still")) {
      await stills(browser, server, piece);
      if (check) problems.push(...(await checkStills(browser, server, piece)));
    }
  } finally {
    await browser.close();
    server.server.close();
  }
  console.log(`review   ${resolve(where.frames)}`);
  if (check) {
    if (problems.length) throw new Error(`${problems.length} problem${problems.length === 1 ? "" : "s"}:\n  ${problems.join("\n  ")}`);
    console.log(`check    all passed (${formats.join(", ")})`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
