/*
 * Builds the drawings in public/art (and their Evening twins) in the cut-paper style, with the pod's
 * plain variant (no callouts): npm run art:paper (or npx tsx scripts/art-paper/build.ts pod cafe … for some
 * of them). The output is byte-stable: every jitter is seeded by name. docs/DESIGN.md §2.1 describes the style.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { eveningTwin } from "../art-evening";
import type { Art } from "./lib";

const only = process.argv.slice(2);
const names = [
  "pod",
  "pod-plain",
  "cafe",
  "shower",
  "luggage",
  "door",
  "plain",
  "house",
  "tuktuk",
  "riverside",
  "train",
  "bus",
  "arch",
  "bridge",
  // The house's photographs, redrawn (content/photos.ts).
  "dorm-corridor",
  "dorm-fan",
  "pod-curtain",
  "pod-ladder",
  "locker",
  "entrance",
  "wall-of-jars",
  "stairs-jar",
  "wall-lamp",
];
const root = join(dirname(fileURLToPath(import.meta.url)), "../../public/art");
mkdirSync(join(root, "evening"), { recursive: true });
for (const name of names) {
  if (only.length && !only.includes(name)) continue;
  let mod: { default: () => Art };
  try {
    mod = await import(`./d/${name}.ts`);
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_MODULE_NOT_FOUND") continue;
    throw e;
  }
  const svg = mod.default().toString();
  writeFileSync(join(root, `${name}.svg`), svg);
  writeFileSync(join(root, "evening", `${name}.svg`), eveningTwin(svg));
  console.log(name.padEnd(10), (svg.length / 1024).toFixed(1), "kB");
}
