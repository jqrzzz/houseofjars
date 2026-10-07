// One-off asset export: turns the Shadow mascot master PNG (from the Shadow
// Check-in repo, 1024x1536) into a WebP master for the home page's "Ask
// Shadow" section. next/image then serves it as AVIF or WebP at the size each
// screen needs. (Elsewhere Shadow is drawn in SVG: components/shadow/.)
//
// It then cuts the dock's Shadow from that master: the whole figure, trimmed
// to his own outline (the master keeps a 10px clear margin), at the height he
// floats at in the corner of wider screens (4.5rem, 72px) and twice that for
// sharp screens. Tiny files, so the dock shows them as a plain <img> with a
// srcSet (components/concierge/mascot.ts, ConciergeLauncher). The dock sizes
// can be made again from the committed master alone, without the PNG.
//
// Usage: node scripts/export-mascot.mjs /path/to/shadow.png
//        node scripts/export-mascot.mjs --dock   (the dock sizes only)
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/export-mascot.mjs /path/to/shadow.png | --dock");
  process.exit(1);
}

const outDir = new URL("../public/shadow/", import.meta.url);
await mkdir(outDir, { recursive: true });

if (source !== "--dock") {
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

// The dock's Shadow, from the 800px master: trimmed to the pixels he covers, then sized by height.
const master = new URL("shadow-800.webp", outDir).pathname;
const trimmed = await sharp(master).trim({ threshold: 0 }).toBuffer();
for (const height of [72, 144]) {
  const resized = sharp(trimmed).resize({ height, kernel: "lanczos3" });
  const { info } = await resized.clone().toBuffer({ resolveWithObject: true });
  const file = new URL(`shadow-dock-${info.width}.webp`, outDir).pathname;
  // A little more quality at 1x, where every pixel of his eyes and bow tie shows.
  await resized.webp({ quality: height === 72 ? 88 : 82, alphaQuality: 85, effort: 6, smartSubsample: true }).toFile(file);
  console.log(`wrote ${file} (${info.width}x${info.height}, ${(await stat(file)).size} bytes)`);
}
