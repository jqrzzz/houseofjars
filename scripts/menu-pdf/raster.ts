import { createServer } from "node:http";
import { join } from "node:path";
import type { Browser } from "playwright-core";
import sharp from "sharp";
import { EDITIONS, type Edition } from "../../lib/menu/print-spec";
import type { PdfProblem } from "./pdf-checks";

/*
 * The finished PDF as a reader sees it: Chromium's own PDF viewer (PDFium)
 * draws its pages at 150 dpi, so the engine (npm run menu:pdf) can check what
 * only pixels show, at the paper's edges, and save a picture of each page to
 * review (film-frames/menu/, which git ignores):
 *
 * - the office edition's front keeps its white mat: no jar orange in the outer
 *   7 mm, and jar orange all round 8.5–9.5 mm in, where the field begins at 8;
 * - the print shop's front is jar orange on its outermost rows and columns, so
 *   the orange reaches past the cut on every side;
 * - the back of both has no jar orange within 3 mm of an edge.
 *
 * The viewer is served the file from 127.0.0.1 and opened at zoom 156.25 with
 * a device scale of 1, where one pixel is 0.48 pt (150 dpi). At a device scale
 * above 1 the headless viewer scales the page twice, so the zoom does it.
 * It needs the full Chromium: the headless shell has no PDF viewer.
 */

const DPI = 150;
const ZOOM = (DPI / 96) * 100;
const PX_PER_MM = DPI / 25.4;

/** Room for both pages one above the other, the larger edition's included, with the viewer's margins. */
const VIEWPORT = { width: 1500, height: 3900 };

/** Jar orange, as PDFium paints it, give or take a little. */
const ORANGE = [231, 110, 67] as const;
const orange = (data: Buffer, i: number) => ORANGE.every((c, k) => Math.abs(data[i + k]! - c) <= 12);

export interface Raster {
  readonly problems: PdfProblem[];
  /** The PNG of each page, in `dir`: {edition}-{n}.png. */
  readonly pages: string[];
}

interface Found {
  readonly x0: number;
  readonly x1: number;
  readonly rows: [number, number][];
}

/** The pages in the viewer's picture: the paper (red channel over 150) against its dark ground. */
function findPages(data: Buffer, width: number, height: number, channels: number): Found | null {
  const paper = (x: number, y: number) => data[(y * width + x) * channels]! > 150;
  const columns = [];
  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let y = 0; y < height; y += 8) if (paper(x, y)) count++;
    if (count > 40) columns.push(x);
  }
  if (!columns.length) return null;
  const [x0, x1] = [columns[0]!, columns.at(-1)!];
  // Down a column just inside the paper's left edge, where no word ever reaches: each run of paper is a page.
  const rows: [number, number][] = [];
  for (let y = 0; y < height; y++) {
    if (!paper(x0 + 3, y)) continue;
    const last = rows.at(-1);
    if (last && last[1] === y - 1) last[1] = y;
    else rows.push([y, y]);
  }
  return { x0, x1, rows };
}

/** Rasterises the finished PDF, saves each page as a PNG in `dir` and checks its edges. */
export async function rasterise(browser: Browser, bytes: Uint8Array, edition: Edition, dir: string): Promise<Raster> {
  const { file, pageMm } = EDITIONS[edition];
  const problems: PdfProblem[] = [];
  const add = (text: string, page?: number) => problems.push({ ...(page ? { page } : {}), kind: "file", text });
  const server = createServer((request, response) => {
    if (request.url?.split("#")[0] !== `/${file}`) return void response.writeHead(404).end();
    response.writeHead(200, { "content-type": "application/pdf", "content-length": bytes.length, "cache-control": "no-store" }).end(Buffer.from(bytes));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("The PDF server has no port.");
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${address.port}/${file}#toolbar=0&navpanes=0&zoom=${ZOOM}`, { waitUntil: "load" });
    // The size each page should come out at: its edition's, within the fraction of a point Chromium rounds it by.
    const want = { width: pageMm.width * PX_PER_MM, height: pageMm.height * PX_PER_MM };
    let shot: Buffer | undefined;
    let found: Found | null = null;
    let raw: { data: Buffer; info: { width: number; height: number; channels: number } } | undefined;
    // Until two pictures in a row match, with both pages drawn: the viewer paints them in tiles.
    for (let tries = 0; tries < 80; tries++) {
      await page.waitForTimeout(250);
      const next = await page.screenshot({ type: "png" });
      if (shot && next.equals(shot)) {
        raw = await sharp(next).raw().toBuffer({ resolveWithObject: true });
        found = findPages(raw.data, raw.info.width, raw.info.height, raw.info.channels);
        const sized = found?.rows.filter(([a, b]) => Math.abs(b - a + 1 - want.height) <= 4) ?? [];
        if (found && sized.length === 2 && Math.abs(found.x1 - found.x0 + 1 - want.width) <= 4) {
          found = { ...found, rows: sized };
          break;
        }
      }
      shot = next;
      found = null;
    }
    if (!found || !raw || !shot) {
      add(`Chromium's PDF viewer showed no two pages of ${want.width.toFixed(0)} × ${want.height.toFixed(0)} px at ${DPI} dpi in 20 s: is CHROMIUM_PATH a full Chromium? The headless shell has no PDF viewer.`);
      return { problems, pages: [] };
    }

    const { data, info } = raw;
    const pages: string[] = [];
    for (const [index, [top, bottom]] of found.rows.entries()) {
      const n = index + 1;
      const box = { left: found.x0, top, width: found.x1 - found.x0 + 1, height: bottom - top + 1 };
      const path = join(dir, `${edition}-${n}.png`);
      await sharp(shot).extract(box).png().toFile(path);
      pages.push(path);
      // The page's pixels that pass `test` (a place on the page), and how many of them are jar orange.
      const share = (test: (x: number, y: number) => boolean) => {
        let [all, hits] = [0, 0];
        for (let y = 0; y < box.height; y++) {
          for (let x = 0; x < box.width; x++) {
            if (!test(x, y)) continue;
            all++;
            if (orange(data, ((box.top + y) * info.width + box.left + x) * info.channels)) hits++;
          }
        }
        return { all, hits };
      };
      const inset = (x: number, y: number) => Math.min(x, y, box.width - 1 - x, box.height - 1 - y);
      if (n === 1 && edition === "office") {
        const mat = share((x, y) => inset(x, y) < 7 * PX_PER_MM);
        if (mat.hits) add(`${mat.hits} jar-orange pixels in the outer 7 mm: the white mat is gone.`, n);
        const band = share((x, y) => inset(x, y) >= 8.5 * PX_PER_MM && inset(x, y) < 9.5 * PX_PER_MM);
        if (band.hits < band.all) add(`the band 8.5–9.5 mm in is ${((100 * band.hits) / band.all).toFixed(2)}% jar orange, not all of it: the orange field doesn't begin at 8 mm.`, n);
      } else if (n === 1) {
        const edges: [string, (x: number, y: number) => boolean][] = [
          ["top row", (_, y) => y === 0],
          ["bottom row", (_, y) => y === box.height - 1],
          ["left column", (x) => x === 0],
          ["right column", (x) => x === box.width - 1],
        ];
        for (const [name, test] of edges) {
          const edge = share(test);
          if (edge.hits < 0.99 * edge.all) add(`its ${name} is ${((100 * edge.hits) / edge.all).toFixed(2)}% jar orange, under 99%: the orange doesn't reach the page's edge.`, n);
        }
      } else {
        const rim = share((x, y) => inset(x, y) < 3 * PX_PER_MM);
        if (rim.hits) add(`${rim.hits} jar-orange pixels within 3 mm of the page's edge: the back is white to its edges.`, n);
      }
    }
    return { problems, pages };
  } finally {
    await context.close();
    server.close();
  }
}

/**
 * The review sheet that sets the new card beside the old: the office edition's front and back, each next to the
 * team's photograph of the card on the tables today (photos/menus/), all at one height.
 */
export async function compareSheet(front: string, back: string, out: string, root = process.cwd()) {
  const height = 1200;
  const gap = 32;
  const label = 44;
  const items = [
    { file: front, text: "New front (office PDF)" },
    { file: join(root, "photos/menus/breakfast-menu-staying-guests.jpg"), text: "Today's front" },
    { file: back, text: "New back (office PDF)" },
    { file: join(root, "photos/menus/cafe-menu.jpg"), text: "Today's back" },
  ];
  const tiles = await Promise.all(
    items.map(async ({ file, text }) => {
      const image = await sharp(file).resize({ height }).png().toBuffer({ resolveWithObject: true });
      const caption = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${image.info.width}" height="${label}"><text x="0" y="30" font-family="sans-serif" font-size="24" fill="#171713">${text}</text></svg>`,
      );
      return { image: image.data, caption, width: image.info.width };
    }),
  );
  const width = tiles.reduce((sum, tile) => sum + tile.width, 0) + gap * (tiles.length + 1);
  let left = gap;
  const layers = tiles.flatMap((tile) => {
    const at = left;
    left += tile.width + gap;
    return [
      { input: tile.image, left: at, top: gap },
      { input: tile.caption, left: at, top: gap + height + 8 },
    ];
  });
  await sharp({ create: { width, height: height + label + gap * 2, channels: 3, background: "#e9e2d6" } })
    .composite(layers)
    .png()
    .toFile(out);
}
