/**
 * The shape of a social piece: one design in three formats (a 9:16 film, an email GIF and a 4:5 still card),
 * written as data so `npm run social` can build any of them the same way. A piece names its words, its drawings,
 * its film's tracks and its GIF's frames; scripts/social/theatre.ts turns that into pages and scripts/social.ts
 * films and checks them. Later pieces (a check-out card, a door-lock card) are new files of this shape in
 * scripts/social/pieces/.
 *
 * Everything here is pure, so the reading-time rules can be tested without a browser.
 */
import type { DrawingName } from "../../components/art/drawings";

/** The house's easing tokens (app/globals.css), by name; "linear" is the browser's own. */
export type Easing = "linear" | "lamp" | "in-out" | "out" | "sway" | "paper";

/** A key of a film track: at film time t (seconds) the property has this value, eased to the next key. */
export type Key = readonly [t: number, value: string | number, easing?: Easing];

/** The two scopes every film frame is built in: Day below, Evening above (revealed by the wipes). */
export type Layer = "day" | "evening";

/**
 * One property of one part over the whole film. A part is an element's data-part name. Tracks apply to both
 * layers unless `layer` names one; parts outside the layers (the wipe's hem, the Evening layer itself) ignore it.
 */
export interface Track {
  readonly part: string;
  readonly layer?: Layer;
  readonly property: "transform" | "opacity" | "clipPath";
  readonly keys: readonly Key[];
}

/** The brand icons a plate can carry (brand/icons/{name}.svg). */
export type IconName = "shoes-off" | "no-smoking" | "quiet-hours";

/** How a run of words is set on the film's caption tag. */
export type TextStyle = "title" | "headline" | "body" | "times" | "aside";

/** A block of words on the tag: its lines (each one line on screen) and its line box's top left, tag-local px. */
export interface TextBlock {
  readonly style: TextStyle;
  readonly lines: readonly string[];
  readonly at: readonly [x: number, y: number];
}

/**
 * One caption of the film: the words on the tag from `in` to `out`, fully opaque for that whole window. It fades
 * in over `fade.in` seconds before `in` (none when `in` is 0, the cover) and out over `fade.out` after `out`.
 * A caption that `joins` another arrives later on the same tag and leaves with it. A `reprise` brings it back
 * at the end of the film, fully on from `reprise.in` until the loop starts it again at 0.
 */
export interface Caption {
  readonly id: string;
  readonly blocks: readonly TextBlock[];
  readonly in: number;
  readonly out: number;
  readonly fade?: { readonly in?: number; readonly out?: number };
  readonly plate?: IconName;
  readonly shadow?: boolean;
  readonly joins?: string;
  readonly reprise?: { readonly from: number; readonly in: number };
}

/** A flat in the film's arch: a drawing in an 860 × 900 box, at its image box (arch-local px). */
export interface Scene {
  readonly id: string;
  readonly drawing: DrawingName;
  readonly box: readonly [x: number, y: number, width: number, height: number];
  /** A lamp scene: the Day drawing under a shade, its Evening twin stacked on top (lit by a track), and a bloom. */
  readonly lamp?: { readonly shade: number; readonly bloom: readonly [x: number, y: number, size: number] };
}

/** A crop of a drawing, in the drawing's own viewBox units. */
export interface Crop {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One row of the board (the GIF and the still card): a small stage, its plate, and the rule beside it. */
export interface BoardRow {
  readonly drawing: DrawingName;
  readonly crop: Crop;
  /** Always the Evening twin with the Evening rim, whatever the board's theme (the night rule at night). */
  readonly evening?: boolean;
  readonly icon: IconName;
  readonly headline: string;
  readonly times?: string;
  /** The body's lines: forced breaks in the GIF's narrow column, one line on the still card. */
  readonly body: readonly string[];
}

export interface Board {
  readonly eyebrow: string;
  readonly title: string;
  readonly rows: readonly BoardRow[];
  readonly signOff: { readonly thanks: string; readonly url: string };
}

/** A GIF frame: the lamplight wash on each row (0 to 1) and how long the frame shows, in centiseconds. */
export interface GifFrame {
  readonly wash: readonly [number, number, number];
  readonly cs: number;
}

export interface Piece {
  /** File names start with it: social/{slug}/, public/email/{slug}.gif. */
  readonly slug: string;
  readonly video: {
    readonly seconds: number;
    readonly fps: number;
    readonly lockup: { readonly url: string; readonly greeting: string };
    readonly scenes: readonly Scene[];
    readonly captions: readonly Caption[];
    readonly tracks: readonly Track[];
    /**
     * The film's own moments for review and checks, in seconds: the contact sheet's frames, the frame the safe
     * zones are drawn over, and the one whose plate is sampled for jar orange (it must fall in a plated caption).
     */
    readonly review: { readonly contact: readonly number[]; readonly safeZones: number; readonly plate: number };
  };
  readonly board: Board;
  readonly gif: { readonly frames: readonly GifFrame[] };
  readonly stills: readonly { readonly theme: Layer; readonly file: string }[];
  /** The words that go beside the piece, not on it: social/{slug}/{slug}-post.txt. */
  readonly post: string;
}

// ---------------------------------------------------------------------------
// Reading time

/**
 * Words, as the reading-time rule counts them: split on whitespace and on the en dash, then strip punctuation.
 * So "21:00–07:00" is two words and "houseofjars.la" one.
 */
export function countWords(text: string): number {
  return text
    .split(/[\s–]+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean).length;
}

/** Seconds a caption needs fully on screen: a word a third of a second, plus a second to find it. */
export const secondsToRead = (words: number) => words / 3 + 1;

export const captionLines = (caption: Caption) => caption.blocks.flatMap((block) => block.lines);
export const captionWords = (caption: Caption) => countWords(captionLines(caption).join(" "));

/** Each caption's reading budget: what it needs and what it has, both in seconds, while fully opaque. */
export function readingBudget(captions: readonly Caption[]): { id: string; words: number; needs: number; has: number }[] {
  const budget = captions.map((caption) => {
    const words = captionWords(caption);
    return { id: caption.id, words, needs: secondsToRead(words), has: caption.out - caption.in };
  });
  // A caption that joins another is read with it: the tag's words together, from the first one's arrival.
  for (const caption of captions) {
    const host = caption.joins ? captions.find((c) => c.id === caption.joins) : undefined;
    if (!host) continue;
    const words = captionWords(host) + captionWords(caption);
    budget.push({ id: `${host.id}+${caption.id}`, words, needs: secondsToRead(words), has: Math.min(host.out, caption.out) - host.in });
  }
  return budget;
}

/** Problems with a film's captions: too little time to read one, a join to nothing, a window outside the film. */
export function readingProblems(piece: Piece): string[] {
  const { captions, seconds, fps } = piece.video;
  const problems: string[] = [];
  if (Math.round(seconds * fps) !== seconds * fps) problems.push(`${seconds} s is not a whole number of frames at ${fps} fps.`);
  for (const caption of captions) {
    if (caption.joins && !captions.some((c) => c.id === caption.joins)) problems.push(`${caption.id} joins "${caption.joins}", which is not a caption.`);
    if (caption.in < 0 || caption.out > seconds || caption.out <= caption.in) problems.push(`${caption.id}: ${caption.in}–${caption.out} s is not a window in the film.`);
  }
  for (const row of readingBudget(captions)) {
    if (row.has + 1e-9 < row.needs) {
      problems.push(`${row.id}: ${row.words} words need ${row.needs.toFixed(2)} s fully on screen, and have ${row.has.toFixed(2)} s.`);
    }
  }
  return problems;
}

/** Problems with the film's review moments: a time outside the film, or a plate sampled where no plate is fully on. */
export function reviewProblems(piece: Piece): string[] {
  const { captions, seconds, review } = piece.video;
  const problems: string[] = [];
  for (const t of [...review.contact, review.safeZones, review.plate]) {
    if (t < 0 || t >= seconds) problems.push(`review time ${t} s is outside the film (0–${seconds} s).`);
  }
  if (!captions.some((c) => c.plate && c.in <= review.plate && review.plate <= c.out)) {
    problems.push(`the plate's colour is sampled at ${review.plate} s, when no caption with a plate is fully on screen.`);
  }
  return problems;
}

const FADE = 0.15;

/**
 * The opacity track of each caption, from its window: so the film's timeline and the reading budget come from
 * the same numbers and cannot disagree. Text fades use the out easing.
 */
export function captionTracks(captions: readonly Caption[]): Track[] {
  return captions.map((caption) => {
    const keys: Key[] = [];
    if (caption.in > 0) keys.push([caption.in - (caption.fade?.in ?? FADE), 0, "out"]);
    keys.push([caption.in, 1]);
    keys.push([caption.out, 1, "out"], [caption.out + (caption.fade?.out ?? FADE), 0]);
    if (caption.reprise) keys.push([caption.reprise.from, 0, "out"], [caption.reprise.in, 1]);
    return { part: `caption-${caption.id}`, property: "opacity", keys };
  });
}

/** The window in which a caption must be fully opaque in the film, for the browser's check of every frame. */
export function opaqueWindows(captions: readonly Caption[]): { id: string; from: number; to: number }[] {
  return captions.flatMap((caption) => [
    { id: caption.id, from: caption.in, to: caption.out },
    ...(caption.reprise ? [{ id: caption.id, from: caption.reprise.in, to: Number.POSITIVE_INFINITY }] : []),
  ]);
}
