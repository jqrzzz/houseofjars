/**
 * Writes the board for "Find your pod" to public/game/find-your-pod.json from the house model, its placed rules
 * and content/stay.ts (lib/game/build-graph.ts). Run it after changing any of them, or the plans the game is
 * played on; a unit test fails while the committed board differs from a fresh build.
 *
 *   npm run house:game
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { gameJson } from "../lib/game/build-graph";

const dir = join(process.cwd(), "public/game");
mkdirSync(dir, { recursive: true });
const json = gameJson();
writeFileSync(join(dir, "find-your-pod.json"), json);
const kb = (n: number) => (n / 1024).toFixed(1);
console.log(`wrote    public/game/find-your-pod.json  ${kb(Buffer.byteLength(json))} kB (${kb(gzipSync(json).length)} kB gzip)`);
