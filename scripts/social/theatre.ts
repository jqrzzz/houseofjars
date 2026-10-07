/**
 * The pages `npm run social` films and photographs: a piece (scripts/social/pieces/) set in the lantern theatre.
 * Three formats from one design: the 9:16 film ("video"), and the board shared by the email GIF ("gif") and the
 * still card ("still").
 *
 * Nothing is forked from the site. The colours are app/globals.css's own tokens, read when the page is built and
 * set on .day and .evening scopes; the easings are its easing tokens; the arch is the mark's outline
 * (components/brand/mark-shape.ts); the drawings are public/art/ and their Evening twins; Shadow and the woven
 * band are the real ShadowFigure and WovenBand components with their CSS Modules (scripts/social/css-modules.ts).
 *
 * The film's frame is built twice from one template, a Day layer under an Evening one; the theme comes only from
 * the scope class, and the wipes uncover one layer over the other, so no frame is ever a grey cross-fade. Its
 * tracks become one Web Animation each over the whole film (fill: both), so any frame is a seek: pause every
 * animation and set its currentTime (window.theatre.seek).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drawings, type DrawingName } from "../../components/art/drawings";
import { ARCH_OUTLINE, MARK_PATH, MARK_VIEWBOX } from "../../components/brand/mark-shape";
import { INK } from "../art-paper/lib";
import { loadCssModule } from "./css-modules";
import type { Board, Caption, Crop, Easing, Layer, Piece, Scene, TextBlock, Track } from "./piece";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

export const FORMATS = ["video", "gif", "still"] as const;
export type Format = (typeof FORMATS)[number];

// ---------------------------------------------------------------------------
// Tokens

/** The declarations inside the first block that opens with `selector {`, braces balanced. */
function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`app/globals.css has no "${selector} {" block.`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(css.indexOf("{", start) + 1, i);
  }
  throw new Error(`app/globals.css: "${selector}" never closes.`);
}

/** The custom properties a block declares, in order, comments dropped. */
function customProperties(declarations: string): [string, string][] {
  const text = declarations.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim().replace(/\s+/g, " ")]);
}

export interface Tokens {
  /** Day: the first :root block. */
  readonly day: readonly [string, string][];
  /** Evening: the :root[data-theme="dark"] block. */
  readonly evening: readonly [string, string][];
}

export function readTokens(css = read("app/globals.css")): Tokens {
  return { day: customProperties(block(css, ":root")), evening: customProperties(block(css, ':root[data-theme="dark"]')) };
}

/** The easing tokens, resolved: Web Animations need the curves themselves, not var(). */
export function easings(tokens: Tokens): Record<Easing, string> {
  const find = (name: string) => {
    const value = tokens.day.find(([key]) => key === name)?.[1];
    if (!value) throw new Error(`app/globals.css has no ${name}.`);
    return value;
  };
  return {
    linear: "linear",
    lamp: find("--ease-lamp"),
    "in-out": find("--ease-in-out"),
    out: find("--ease-out"),
    sway: find("--ease-sway"),
    paper: find("--ease-paper"),
  };
}

/**
 * The site's tokens on .day and .evening scopes, and the composition's roles on top of them. :root carries Day
 * too, for the parts that sit outside both layers (the wipe's hem).
 */
function themeCss(tokens: Tokens): string {
  const decls = (list: readonly [string, string][]) => list.map(([k, v]) => `${k}:${v};`).join("");
  return [
    `:root,.day{${decls(tokens.day)}}`,
    `.evening{${decls(tokens.evening)}}`,
    // Roles: the wall, the tag's paper, words, the times, the drawings' ink line, the floor, the curtain.
    `.day,.evening{--fg:var(--text);--fg-muted:var(--text-soft);--fg-brand:var(--accent-text);--tag-paper:var(--paper-near);` +
      `--edge-dx:calc(var(--edge-x) * var(--k));--edge-dy:calc(var(--edge-y) * var(--k));color:var(--fg)}`,
    `.day{--wall:var(--paper-far);--ground:var(--rice);--stage-ground:var(--rice);--times:var(--accent-text);` +
      `--silhouette:${INK.day};--floor:var(--teak);--curtain-paper:color-mix(in oklab, var(--teak-deep) 88%, var(--rice))}`,
    `.evening{--wall:var(--night);--ground:var(--night);--stage-ground:var(--night);--times:var(--lamplight);` +
      `--silhouette:${INK.evening};--floor:var(--teak-night);--curtain-paper:color-mix(in oklab, var(--teak-deep) 88%, var(--night))}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Shapes

const round = (v: number) => Number(v.toFixed(2));

/**
 * The mark's arch outline (ARCH_OUTLINE, a unit box over the mark's 600 × 900 drawing) as a window w wide and h
 * tall: the crown keeps the mark's own proportions (250/600 of the width), and the pillars run down to h.
 */
export function archPath(w: number, h: number, dx = 0, dy = 0): string {
  const X = (v: number) => round(v * w + dx);
  // A unit of y in the mark is 900/600 of its width; y = 1 is the foot of the pillars, here at h.
  const Y = (v: number) => round((v === 1 ? h : v * 1.5 * w) + dy);
  return ARCH_OUTLINE.replace(/([MCV])([^MCVZ]*)/g, (_, command: string, args: string) => {
    const n = args.trim().split(/[\s,]+/).map(Number);
    return command + (command === "V" ? n.map(Y) : n.map((v, i) => (i % 2 ? Y(v) : X(v)))).join(" ");
  });
}

/** A stepped lamplight glow: concentric fills at a low opacity each, never a gradient. */
function rings(cx: number, cy: number, radii: readonly number[], opacity = 0.07, ry?: (r: number) => number): string {
  return radii
    .map((r) => (ry ? `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${round(ry(r))}"` : `<circle cx="${cx}" cy="${cy}" r="${r}"`) + ` style="fill:var(--lamplight)" opacity="${opacity}"/>`)
    .join("");
}

/**
 * An arch's rim: the wall's cut edge seen inside the window (--paper-edge, 4 × the edge, clipped to the window
 * and set back up and left) under the ink silhouette. Ids are the layer's name and an index: the same page
 * always has the same ids.
 */
function rim(w: number, h: number, k: number, id: string): string {
  const d = archPath(w, h);
  const e = 1.5 * k;
  return (
    `<svg class="rim" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">` +
    `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>` +
    `<g clip-path="url(#${id})"><path d="${archPath(w, h + 40)}" transform="translate(${-e} ${-e})" style="fill:none;stroke:var(--paper-edge);stroke-width:${4 * e}px"/></g>` +
    `<path d="${d}" style="fill:none;stroke:var(--silhouette);stroke-width:${e}px;stroke-linejoin:round"/></svg>`
  );
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const px = (v: number) => `${round(v)}px`;
const icon = (name: string) => `<img src="/icons/${name}.svg" alt="">`;
const markSvg = (style: string) => `<svg class="mark" viewBox="${MARK_VIEWBOX}" style="${style}" aria-hidden="true"><path d="${MARK_PATH}"/></svg>`;

/** A drawing's own viewBox (house.svg starts at 24, 86): crops are in its units. */
function viewBox(src: string): [number, number, number, number] {
  const found = /viewBox="([^"]+)"/.exec(read(join("public", src)));
  if (!found) throw new Error(`${src} has no viewBox.`);
  return found[1]!.split(/\s+/).map(Number) as [number, number, number, number];
}

const drawingSrc = (name: DrawingName, theme: Layer) => (theme === "evening" ? drawings[name].evening : drawings[name].src);

// ---------------------------------------------------------------------------
// The site's components

interface Parts {
  /** ShadowFigure, full figure; `prefix` keeps its ids apart from the other layer's. */
  shadow(prefix: string): string;
  /** WovenBand, diamond. */
  band(): string;
  css: string;
}

let parts: Promise<Parts> | undefined;

/**
 * ShadowFigure and WovenBand rendered with react-dom/server. Imported only here and only once scripts/social.ts
 * has registered the CSS Module hook, so their `import styles from "./….module.css"` resolves.
 */
function components(): Promise<Parts> {
  parts ??= (async () => {
    const [{ createElement }, { renderToStaticMarkup }, { ShadowFigure }, { WovenBand }] = await Promise.all([
      import("react"),
      import("react-dom/server"),
      import("../../components/shadow/ShadowFigure"),
      import("../../components/brand/WovenBand"),
    ]);
    const css = ["components/shadow/ShadowFigure.module.css", "components/brand/WovenBand.module.css"].map((p) => loadCssModule(join(root, p)).css).join("\n");
    return {
      shadow: (prefix) => renderToStaticMarkup(createElement(ShadowFigure, { variant: "full" }), { identifierPrefix: prefix }),
      band: () => renderToStaticMarkup(createElement(WovenBand, { pattern: "diamond" })),
      css,
    };
  })();
  return parts;
}

// ---------------------------------------------------------------------------
// Pages

/** What the page script needs: the film's tracks with their selectors and easings resolved. */
interface Timeline {
  readonly seconds: number;
  readonly tracks: readonly { selector: string; property: Track["property"]; keys: [number, string, string][] }[];
}

function timeline(piece: Piece, curves: Record<Easing, string>): Timeline {
  return {
    seconds: piece.video.seconds,
    tracks: piece.video.tracks.map((track) => ({
      selector: `${track.layer ? `[data-layer="${track.layer}"] ` : ""}[data-part~="${track.part}"]`,
      property: track.property,
      keys: track.keys.map(([t, v, e]) => [t, String(v), curves[e ?? "linear"]]),
    })),
  };
}

/**
 * The page's own script, as a string (a function compiled by tsx would carry its helpers into the page). It
 * builds each track as one Web Animation over the whole film, every element starting at its frame-0 value, and
 * gives the recorder window.theatre: seek(t) for the film, setWash([a, b, c]) for the GIF's states.
 */
const PAGE_SCRIPT = `(() => {
  const data = JSON.parse(document.getElementById("timeline").textContent);
  const T = data.seconds;
  for (const track of data.tracks) {
    const els = document.querySelectorAll(track.selector);
    if (!els.length) throw new Error("No element for " + track.selector);
    const keys = track.keys;
    const frame = (offset, value, easing) => ({ offset, [track.property]: value, easing });
    const frames = [];
    if (keys[0][0] > 0) frames.push(frame(0, keys[0][1], "linear"));
    for (const [t, value, easing] of keys) frames.push(frame(Math.min(1, t / T), value, easing));
    if (keys[keys.length - 1][0] < T) frames.push(frame(1, keys[keys.length - 1][1], "linear"));
    for (const el of els) {
      el.style[track.property] = keys[0][1];
      el.animate(frames, { duration: T * 1000, fill: "both" });
    }
  }
  window.theatre = {
    seconds: T,
    seek(t) {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = t * 1000;
      }
    },
    setWash(wash) {
      document.querySelectorAll("[data-wash]").forEach((el) => { el.style.opacity = String(wash[Number(el.dataset.wash)] ?? 0); });
    },
  };
})();`;

function page(title: string, format: Format, k: number, css: string, body: string, data: Timeline): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escape(title)}</title>
<style>
${css}
</style>
</head>
<body class="${format}" style="--k:${k}">
${body}
<script type="application/json" id="timeline">${json}</script>
<script>${PAGE_SCRIPT}</script>
</body>
</html>`;
}

async function styles(): Promise<string> {
  const { css } = await components();
  return [themeCss(readTokens()), read("scripts/social/theatre.css"), css].join("\n");
}

// --- the film

const K_VIDEO = 2.5;
const ARCH = { width: 860, height: 900 } as const;

function flat(scene: Scene, theme: Layer): string {
  const [x, y, w, h] = scene.box;
  const img = (src: string, extra = "") => `<img src="${src}" alt="" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)}"${extra}>`;
  if (scene.lamp) {
    // The lamp, unlit (its Day drawing under a shade), with its lit Evening twin and its bloom over it.
    const [bx, by, size] = scene.lamp.bloom;
    const r = size / 2;
    return (
      `<div class="flat" data-part="${scene.id}">` +
      img(drawings[scene.drawing].src) +
      `<div class="shade" style="opacity:${scene.lamp.shade}"></div>` +
      img(drawings[scene.drawing].evening, ` data-part="${scene.id}-lit"`) +
      `<svg class="abs" data-part="bloom" viewBox="0 0 ${size} ${size}" style="left:${px(bx)};top:${px(by)};width:${px(size)};height:${px(size)}" aria-hidden="true">` +
      rings(r, r, [r, 0.8 * r, 0.6 * r, 0.4 * r]) +
      rings(r, r, [round(0.22 * r)], 0.1) +
      `</svg></div>`
    );
  }
  return `<div class="flat" data-part="${scene.id}">${img(drawingSrc(scene.drawing, theme))}<div class="shade" data-part="${scene.id}-shade"></div></div>`;
}

function curtain(piece: Piece, band: string): string {
  const { url, greeting } = piece.video.lockup;
  return (
    `<div class="curtain" data-part="curtain">` +
    `<div class="paper"></div>` +
    // Halo: centre (430, 435), radii 300 / 225 / 150 / 75.
    `<svg class="abs" data-part="halo" viewBox="0 0 600 600" style="left:130px;top:135px;width:600px;height:600px" aria-hidden="true">${rings(300, 300, [300, 225, 150, 75])}</svg>` +
    markSvg("left:320px;top:140px;width:220px;height:330px") +
    `<p class="lockup url">${escape(url)}</p>` +
    `<p class="lockup greeting" lang="lo">${escape(greeting)}</p>` +
    `<div class="hem">${band}<span class="points"></span></div>` +
    `</div>`
  );
}

function textBlock(block: TextBlock): string {
  const tag = block.style === "title" ? "h1" : block.style === "headline" ? "h2" : "p";
  const lines = block.lines.map((line) => `<span class="line">${escape(line)}</span>`).join("");
  return `<${tag} class="${block.style} abs" style="left:${px(block.at[0])};top:${px(block.at[1])}">${lines}</${tag}>`;
}

function caption(c: Caption, shadow: string): string {
  return (
    `<div class="caption" data-part="caption-${c.id}" data-caption="${c.id}">` +
    c.blocks.map(textBlock).join("") +
    (c.plate ? `<div class="plate" data-plate="${c.plate}">${icon(c.plate)}</div>` : "") +
    (c.shadow ? `<div class="shadow-figure abs">${shadow}</div>` : "") +
    `</div>`
  );
}

function videoLayer(piece: Piece, theme: Layer, p: Parts): string {
  const { width, height } = ARCH;
  const window = archPath(width, height);
  const scenes = [...piece.video.scenes].reverse().map((s) => flat(s, theme)).join("");
  // The floor's lamplight pool, by Evening: centre (540, 1670), rx 420, ry 90.
  const pool =
    theme === "evening"
      ? `<svg class="abs" data-part="pool" viewBox="0 0 840 180" style="left:120px;top:1580px;width:840px;height:180px" aria-hidden="true">${rings(420, 90, [420, 315, 210, 105], 0.07, (r) => (r * 90) / 420)}</svg>`
      : "";
  return (
    `<div class="layer ${theme}" data-layer="${theme}"${theme === "evening" ? ` data-part="evening-layer"` : ""}>` +
    `<div class="wall fibre"></div>` +
    `<div class="floor fibre"><span class="seam" style="top:60px"></span><span class="seam" style="top:150px"></span></div>` +
    pool +
    `<div class="arch"><div class="window" style="clip-path:path('${window}')">${scenes}${curtain(piece, p.band())}</div>${rim(width, height, K_VIDEO, `${theme}-rim-0`)}</div>` +
    `<div class="card tag abs" data-part="tag">` +
    piece.video.captions.map((c) => caption(c, c.shadow ? p.shadow(`${theme}-shadow-`) : "")).join("") +
    `<span class="pin"></span></div>` +
    `</div>`
  );
}

/** The 9:16 film's page: 1080 × 1920 at a pixel ratio of 1. */
export async function videoPage(piece: Piece): Promise<string> {
  const p = await components();
  const body = videoLayer(piece, "day", p) + videoLayer(piece, "evening", p) + `<div class="wipe-hem" data-part="wipe-hem"></div>`;
  return page(`${piece.board.title} · film`, "video", K_VIDEO, await styles(), body, timeline(piece, easings(readTokens())));
}

// --- the board

interface BoardLayout {
  readonly width: number;
  readonly height: number;
  readonly k: number;
  readonly pad: number;
  readonly eyebrow: { readonly size: number; readonly top: number };
  readonly title: { readonly size: number; readonly top: number };
  readonly shadow: readonly [x: number, y: number, w: number, h: number];
  readonly stage: { readonly width: number; readonly height: number; readonly tops: readonly number[] };
  readonly plate: { readonly size: number; readonly over: number };
  readonly text: { readonly x: number; readonly width: number };
  readonly type: { readonly headline: number; readonly body: number; readonly times: number; readonly gap: number };
  /** The GIF's lamplight wash: a band per row, touching, never overlapping. */
  readonly wash?: { readonly tops: readonly number[]; readonly height: number };
  readonly footer: { readonly top: number; readonly size: number; readonly lineHeight: number; readonly mark?: readonly [w: number, h: number, gap: number] };
  /** The still card's one woven band, along its foot. */
  readonly band?: { readonly top: number; readonly height: number };
}

export const BOARD: Readonly<Record<"gif" | "still", BoardLayout>> = {
  gif: {
    width: 600,
    height: 792,
    k: 1,
    pad: 28,
    eyebrow: { size: 26, top: 28 },
    title: { size: 52, top: 60 },
    shadow: [488, 20, 84, 116],
    stage: { width: 136, height: 170, tops: [143, 333, 523] },
    plate: { size: 44, over: 8 },
    text: { x: 186, width: 386 },
    type: { headline: 40, body: 30, times: 38, gap: 4 },
    wash: { tops: [133, 323, 513], height: 190 },
    footer: { top: 721, size: 30, lineHeight: 38 },
  },
  still: {
    width: 1080,
    height: 1350,
    k: 2.5,
    pad: 66,
    eyebrow: { size: 38, top: 60 },
    title: { size: 92, top: 108 },
    shadow: [864, 30, 150, 207],
    stage: { width: 220, height: 275, tops: [262, 571, 880] },
    plate: { size: 84, over: 14 },
    text: { x: 330, width: 684 },
    type: { headline: 64, body: 42, times: 60, gap: 10 },
    footer: { top: 1192, size: 40, lineHeight: 60, mark: [40, 60, 20] },
    band: { top: 1290, height: 60 },
  },
};

/**
 * How much a crop is scaled to fill a stage. The crop must have the stage's shape (4:5): one that didn't would be
 * cut off along its height without a word, so it fails here instead.
 */
export function cropScale(crop: Crop, stage: { readonly width: number; readonly height: number }): number {
  if (Math.abs(crop.width / crop.height - stage.width / stage.height) > 0.005) {
    throw new Error(`A crop of ${crop.width} × ${crop.height} is not the stage's shape, ${stage.width} × ${stage.height}.`);
  }
  return stage.width / crop.width;
}

function boardRows(board: Board, format: "gif" | "still", theme: Layer, L: BoardLayout): string {
  const { width: sw, height: sh } = L.stage;
  return board.rows
    .map((row, i) => {
      const top = L.stage.tops[i]!;
      const scope: Layer = row.evening ? "evening" : theme;
      const src = drawingSrc(row.drawing, scope);
      const [vx, vy, vw, vh] = viewBox(src);
      const s = cropScale(row.crop, L.stage);
      const img = `<img src="${src}" alt="" style="left:${px(-(row.crop.x - vx) * s)};top:${px(-(row.crop.y - vy) * s)};width:${px(vw * s)};height:${px(vh * s)}">`;
      const p = L.plate;
      const stage =
        `<div class="stage ${scope}" style="left:${px(L.pad)};top:${px(top)};width:${px(sw)};height:${px(sh)}">` +
        `<div class="window abs" style="inset:0;overflow:hidden;background:var(--stage-ground);clip-path:path('${archPath(sw, sh)}')">${img}</div>` +
        rim(sw, sh, L.k, `board-rim-${i}`) +
        `<div class="plate edged" data-plate="${row.icon}" style="left:${px(sw - p.size + p.over)};top:${px(sh - p.size + p.over)};width:${px(p.size)};height:${px(p.size)}">${icon(row.icon)}</div>` +
        `</div>`;
      const gap = `margin-top:${px(L.type.gap)}`;
      const body = format === "gif" ? row.body.map(escape).join("<br>") : escape(row.body.join(" "));
      const text =
        `<div class="text" style="left:${px(L.text.x)};width:${px(L.text.width)};top:${px(top)};height:${px(sh)}">` +
        `<h2 class="headline" data-role="headline" style="font-size:${px(L.type.headline)}">${escape(row.headline)}</h2>` +
        (row.times ? `<p class="times" data-role="times" style="font-size:${px(L.type.times)};${gap}">${escape(row.times)}</p>` : "") +
        `<p class="body" data-role="body" style="font-size:${px(L.type.body)};${gap}">${body}</p>` +
        `</div>`;
      const wash = L.wash ? `<div class="wash" data-wash="${i}" style="top:${px(L.wash.tops[i]!)};height:${px(L.wash.height)};opacity:0"></div>` : "";
      return wash + stage + text;
    })
    .join("");
}

/** The board: the email GIF's page (600 × 792 CSS px, filmed at pixel ratios 1 and 2) or the still card's (1080 × 1350). */
export async function boardPage(piece: Piece, format: "gif" | "still", theme: Layer): Promise<string> {
  const p = await components();
  const L = BOARD[format];
  const { board } = piece;
  const [shx, shy, shw, shh] = L.shadow;
  const f = L.footer;
  const mark = f.mark ? markSvg(`width:${px(f.mark[0])};height:${px(f.mark[1])};margin-right:${px(f.mark[2])};flex:none`) : "";
  const body =
    `<div class="board ${theme}" style="width:${px(L.width)};height:${px(L.height)}">` +
    `<p class="eyebrow abs" style="left:${px(L.pad)};top:${px(L.eyebrow.top)};font-size:${px(L.eyebrow.size)}">${escape(board.eyebrow)}</p>` +
    `<h1 class="title abs" style="left:${px(L.pad)};top:${px(L.title.top)};font-size:${px(L.title.size)}">${escape(board.title)}</h1>` +
    `<div class="shadow-figure abs" style="left:${px(shx)};top:${px(shy)};width:${px(shw)};height:${px(shh)}">${p.shadow("board-shadow-")}</div>` +
    boardRows(board, format, theme, L) +
    `<p class="sign-off abs" style="left:${px(L.pad)};top:${px(f.top)};font-size:${px(f.size)};line-height:${px(f.lineHeight)}">${mark}` +
    `<span class="thanks">${escape(board.signOff.thanks)}</span>&nbsp;<span class="dot">·</span>&nbsp;<span class="url">${escape(board.signOff.url)}</span></p>` +
    (L.band ? `<div class="band abs" style="left:0;right:0;top:${px(L.band.top)};height:${px(L.band.height)}">${p.band()}</div>` : "") +
    `</div>`;
  return page(`${board.title} · ${format}`, format, L.k, await styles(), body, { seconds: 1, tracks: [] });
}
