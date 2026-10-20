// One-off asset export: turns the Shadow mascot master PNG (from the Shadow
// Check-in repo, 1024x1536) into a WebP master for the home page's "Ask
// Shadow" section. next/image then serves it as AVIF or WebP at the size each
// screen needs. (Elsewhere Shadow is drawn in SVG: components/shadow/.)
//
// It then cuts Shadow from that master, whole and trimmed to his own outline
// (the master keeps a 10px clear margin), in two sizes, each at 1x and twice
// that for sharp screens: the dock's, at the height he floats at in the corner
// of wider screens (4.5rem, 72px), and the figure's (120px), for the chat
// window's welcome, the 404 and the game's nudge. Tiny files, so the site
// shows them as a plain <img> with a srcSet (components/concierge/mascot.ts,
// components/shadow/ShadowMascot.tsx). The cuts can be made again from the
// committed master alone, without the PNG.
//
// Usage: node scripts/export-mascot.mjs /path/to/shadow.png
//        node scripts/export-mascot.mjs --dock     (the dock sizes only)
//        node scripts/export-mascot.mjs --figure   (the figure sizes only)
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/export-mascot.mjs /path/to/shadow.png | --dock");
  process.exit(1);
}

const outDir = new URL("../public/shadow/", import.meta.url);
await mkdir(outDir, { recursive: true });

if (!source.startsWith("--")) {
  // Crops are in the master's 1024x1536 pixel space.
  const variants = [
    { name: "shadow", crop: { left: 160, top: 176, width: 720, height: 1056 }, width: 800 },
  ];

  for (const { name, crop, width } of variants) {
    const file = new URL(`${name}-${width}.webp`, outDir).pathname;
    await sharp(source).extract(crop).resize({ width }).webp({ quality: 86, effort: 6, alphaQuality: 90 }).toFile(file);
    console.log(`wrote ${file}`);
  }
}

// Shadow from the 800px master: trimmed to the pixels he covers, then sized by height.
const master = new URL("shadow-800.webp", outDir).pathname;
const trimmed = await sharp(master).trim({ threshold: 0 }).toBuffer();
const cuts = [
  { name: "shadow-dock", height: 72, when: "--dock" },
  { name: "shadow-figure", height: 120, when: "--figure" },
];
for (const { name, height, when } of cuts) {
  if (source.startsWith("--") && source !== when) continue;
  // The 2x file is exactly twice the 1x, so both fill the same box (a stretch of under half a pixel).
  const { info: one } = await sharp(trimmed).resize({ height }).toBuffer({ resolveWithObject: true });
  for (const scale of [1, 2]) {
    const resized = sharp(trimmed).resize({ width: one.width * scale, height: height * scale, fit: "fill", kernel: "lanczos3" });
    const file = new URL(`${name}-${one.width * scale}.webp`, outDir).pathname;
    // A little more quality at 1x, where every pixel of his eyes and bow tie shows.
    await resized.webp({ quality: scale === 1 ? 88 : 82, alphaQuality: 85, effort: 6, smartSubsample: true }).toFile(file);
    console.log(`wrote ${file} (${one.width * scale}x${height * scale}, ${(await stat(file)).size} bytes)`);
  }
}
