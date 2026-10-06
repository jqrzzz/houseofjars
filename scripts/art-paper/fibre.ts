// public/art/paper-fibre.svg: a 72×72 tile of short hairlines at 6% ink, for HTML stages.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rngFor, n } from "./lib";
const rand = rngFor("paper-fibre");
const S = 72;
let d = "";
for (let i = 0; i < 52; i++) {
  const x = rand() * S;
  const y = rand() * S;
  const len = 4 + rand() * 3;
  const ang = rand() * Math.PI;
  const dx = Math.cos(ang) * len;
  const dy = Math.sin(ang) * len;
  // Keep each hairline inside the tile so the seams never cut one.
  const x0 = Math.min(Math.max(x, 1), S - 1 - Math.max(dx, 0)) - Math.min(dx, 0);
  const y0 = Math.min(Math.max(y, 1), S - 1 - dy);
  d += `M${n(Math.min(x0, S - 1))} ${n(y0)}l${n(dx)} ${n(dy)}`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><path d="${d}" fill="none" stroke="#4a2f1b" stroke-opacity=".06" stroke-linecap="round"/></svg>`;
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/art/paper-fibre.svg"), svg);
console.log(svg.length, "bytes");
