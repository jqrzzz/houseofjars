/**
 * Draws the House Model's pictures into public/house/ from the model in
 * lib/house/house-of-jars.ts, and writes the house in words, with the house
 * rules placed, to docs/house-context.md. Run it after changing the model or
 * the rules; unit tests fail while the committed files differ from a fresh
 * render.
 *
 *   npm run house:render
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describeHouse } from "../lib/house/context";
import { HOUSE_RENDERS } from "../lib/house/render";

const dir = join(process.cwd(), "public/house");
mkdirSync(dir, { recursive: true });

const wanted = new Set(HOUSE_RENDERS.map((r) => r.file));
for (const file of readdirSync(dir)) {
  if (file.endsWith(".svg") && !wanted.has(file)) {
    rmSync(join(dir, file));
    console.log(`removed  public/house/${file}`);
  }
}
for (const { file, render } of HOUSE_RENDERS) {
  const svg = render();
  writeFileSync(join(dir, file), svg);
  console.log(`wrote    public/house/${file.padEnd(24)} ${(Buffer.byteLength(svg) / 1024).toFixed(0).padStart(4)} kB`);
}

const context = describeHouse();
writeFileSync(join(process.cwd(), "docs/house-context.md"), context);
console.log(`wrote    docs/house-context.md${" ".repeat(9)} ${(Buffer.byteLength(context) / 1024).toFixed(0).padStart(4)} kB`);
