/**
 * Writes each drawing's Evening twin: public/art/evening/{name}.svg is the
 * drawing in public/art/ with its night colours made unconditional. An image
 * can only read the device's colour scheme, so the twin lets the site's own
 * Evening choice relight the drawing (components/art/Drawing.tsx shows one
 * twin or the other). Run it after changing a drawing; the drift test in
 * components/art/evening.test.ts fails while a committed twin differs.
 *
 *   npx tsx scripts/art-evening.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drawings } from "../components/art/drawings";

const NIGHT = "@media (prefers-color-scheme:dark){";

/** The drawing with the rules of its night block applied always, after the Day rules they override. */
export function eveningTwin(svg: string): string {
  const start = svg.indexOf(NIGHT);
  if (start < 0) throw new Error("The drawing has no night colours (@media (prefers-color-scheme:dark)).");
  let depth = 1;
  let end = start + NIGHT.length;
  while (end < svg.length && depth > 0) {
    const char = svg[end++];
    if (char === "{") depth++;
    else if (char === "}") depth--;
  }
  if (depth > 0) throw new Error("The drawing's night block is not closed.");
  return svg.slice(0, start) + svg.slice(start + NIGHT.length, end - 1) + svg.slice(end);
}

function main() {
  const root = process.cwd();
  for (const [name, drawing] of Object.entries(drawings)) {
    const twin = eveningTwin(readFileSync(join(root, "public", drawing.src), "utf8"));
    const out = join(root, "public", drawing.evening);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, twin);
    console.log(`wrote    public${drawing.evening.padEnd(26)} ${(Buffer.byteLength(twin) / 1024).toFixed(1).padStart(5)} kB  (${name})`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
