// One-off asset export: turns the Shadow mascot master PNG (from the Shadow
// Check-in repo, 1024x1536) into a WebP master for the home page's "Ask
// Shadow" section. next/image then serves it as AVIF or WebP at the size each
// screen needs. (Elsewhere Shadow is drawn in SVG: components/shadow/.)
// Usage: node scripts/export-mascot.mjs /path/to/shadow.png
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/export-mascot.mjs /path/to/shadow.png");
  process.exit(1);
}

const outDir = new URL("../public/shadow/", import.meta.url);
await mkdir(outDir, { recursive: true });

// Crops are in the master's 1024x1536 pixel space.
const variants = [
  { name: "shadow", crop: { left: 160, top: 176, width: 720, height: 1056 }, width: 800 },
];

for (const { name, crop, width } of variants) {
  const file = new URL(`${name}-${width}.webp`, outDir).pathname;
  await sharp(source).extract(crop).resize({ width }).webp({ quality: 86, effort: 6, alphaQuality: 90 }).toFile(file);
  console.log(`wrote ${file}`);
}
