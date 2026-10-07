/**
 * "Three house rules": the first social piece. A 16-second silent film for Reels, TikTok and WhatsApp Status,
 * a looping GIF for the "Before arrival" email and a 4:5 still card (Day and Evening), all one design: drawings
 * in an arch cut into a paper wall, a paper tag pinned under it, and the Splash curtain at the open and the close.
 *
 * Every word on screen is in `copy`, and every fact in it is read from content/ (the quiet hours from
 * content/stay.ts, the rules' wording through lib/house/rules.ts, the address from lib/site.ts), so the piece
 * cannot drift from the website. house-rules.test.ts holds the facts to the content and keeps out the words the
 * piece must never say. Build it with `npm run social -- house-rules`.
 */
import { identity } from "../../../content/identity";
import { times } from "../../../content/stay";
import { placedHouseRules } from "../../../lib/house/rules";
import { siteUrl } from "../../../lib/site";
import { captionTracks, type Caption, type GifFrame, type Key, type Piece, type Track } from "../piece";
import { BOARD, readTokens } from "../theatre";

const slug = "house-rules";

const rule = (id: string) => {
  const found = placedHouseRules().find((r) => r.id === id);
  if (!found) throw new Error(`No house rule "${id}" in lib/house/rules.ts.`);
  return found;
};

const quietHours = times.quietHours?.value;
if (!quietHours) throw new Error("content/stay.ts has no quiet hours: the piece needs times.quietHours.");

/** The site's address as people type it: the host without "www." (https://www.houseofjars.la → houseofjars.la). */
const address = new URL(siteUrl).host.replace(/^www\./, "");

/** Every string the piece shows or says. */
export const copy = {
  /** The Splash curtain's lockup: the address in place of the Splash's name line, then its Lao greeting (components/brand/Splash.tsx). */
  lockup: { url: address, greeting: "ສະບາຍດີ" },
  eyebrow: identity.name.value,
  title: "Three house rules",
  titleLines: ["Three", "house rules"],
  shoes: { headline: "No shoes upstairs", lines: ["No shoes", "upstairs"], body: "Off at the foot of the stairs." },
  smoking: {
    headline: "No smoking inside",
    lines: ["No smoking", "inside"],
    // A forced break after the comma, with "not on it." held together by a no-break space.
    body: ["Smoke past the terrace,", "not on\u00a0it."],
  },
  quiet: { headline: "Quiet hours", times: quietHours, rule: rule("quiet").rule },
  sleep: "Sleep well",
  signOff: { thanks: "Thank you", url: address },
  /** Under the GIF in the "Before arrival" email, linking to the full list. */
  emailSnippet: `All the house rules: ${address}/house-rules`,
  emailLink: `${siteUrl}/house-rules`,
} as const;

const plain = (text: string) => text.replace(/\u00a0/g, " ");
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** Alt text for the film. */
export const videoAlt =
  `A short film: three house rules at ${copy.eyebrow}. ` +
  `${copy.shoes.headline}: ${lowerFirst(copy.shoes.body)} ` +
  `${copy.smoking.headline}: ${lowerFirst(plain(copy.smoking.body.join(" ")))} ` +
  `${copy.quiet.headline} ${copy.quiet.times}. ${copy.sleep}.`;

/** Alt text for the GIF and the still card. */
export const boardAlt =
  `${copy.title} at ${copy.eyebrow}. ` +
  `${copy.shoes.headline}: ${lowerFirst(copy.shoes.body)} ` +
  `${copy.smoking.headline}: ${lowerFirst(plain(copy.smoking.body.join(" ")))} ` +
  `${copy.quiet.headline} ${copy.quiet.times}: ${lowerFirst(copy.quiet.rule)} ${copy.signOff.thanks}.`;

const attribute = (text: string) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * The GIF as the "Before arrival" email embeds it: the @2x file at its CSS size (without width and height, Outlook
 * for Windows and some webmail show it 1200 px wide), with the board's alt text. It sits in a cell of the page's
 * rice, the link line under it.
 */
export const emailGif = {
  img:
    `<img src="${siteUrl}/email/${slug}@2x.gif" width="${BOARD.gif.width}" height="${BOARD.gif.height}" alt="${attribute(boardAlt)}" ` +
    `style="display:block;width:100%;max-width:${BOARD.gif.width}px;height:auto;border:0">`,
  cell: new Map(readTokens().day).get("--rice")!,
};

/** The caption for Instagram, TikTok and WhatsApp: the rules in the house's own words, with their reasons. */
export function postCaption(): string {
  const shoes = rule("no-shoes-upstairs");
  const noSmoking = rule("no-smoking");
  const smokeOut = rule("smoke-past-the-terrace");
  const quiet = rule("quiet");
  return [
    "Three house rules for a calm night.",
    "",
    `1. ${shoes.rule} ${shoes.why}`,
    `2. ${noSmoking.rule} ${smokeOut.rule} ${smokeOut.why}`,
    `3. ${copy.quiet.headline} ${copy.quiet.times}. ${quiet.rule} ${quiet.why}`,
    "",
    copy.emailSnippet,
  ].join("\n");
}

/** social/house-rules/house-rules-post.txt: everything that goes beside the piece. */
export function postText(): string {
  return [
    "POST CAPTION (Instagram, TikTok, WhatsApp)",
    "",
    postCaption(),
    "",
    "VIDEO ALT TEXT",
    "",
    videoAlt,
    "",
    "GIF AND STILL CARD ALT TEXT",
    "",
    boardAlt,
    "",
    `EMAIL SNIPPET ("Before arrival" email: the GIF in a cell with background ${emailGif.cell}, then the link line under it, linking to ${copy.emailLink})`,
    "",
    emailGif.img,
    "",
    copy.emailSnippet,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// The film: 16.000 s at 30 fps. Times are the spec's beat sheet.

const captions: Caption[] = [
  {
    id: "title",
    blocks: [{ style: "title", lines: copy.titleLines, at: [60, 110] }],
    in: 0,
    out: 2.1,
    shadow: true,
    // Back for the last frames, which equal the first: the loop carries it on at 0.
    reprise: { from: 15.5, in: 15.62 },
  },
  {
    id: "rule-1",
    blocks: [
      { style: "headline", lines: copy.shoes.lines, at: [60, 70] },
      { style: "body", lines: [copy.shoes.body], at: [60, 330] },
    ],
    in: 2.4,
    out: 6.85,
    plate: "shoes-off",
  },
  {
    id: "rule-2",
    blocks: [
      { style: "headline", lines: copy.smoking.lines, at: [60, 52] },
      { style: "body", lines: copy.smoking.body, at: [60, 308] },
    ],
    in: 7.15,
    out: 11.6,
    plate: "no-smoking",
  },
  {
    id: "rule-3",
    blocks: [
      { style: "headline", lines: [copy.quiet.headline], at: [60, 72] },
      { style: "times", lines: [copy.quiet.times], at: [60, 216] },
    ],
    in: 11.9,
    out: 15.38,
    fade: { out: 0.12 },
    plate: "quiet-hours",
  },
  {
    id: "sleep",
    blocks: [{ style: "aside", lines: [copy.sleep], at: [60, 368] }],
    in: 13.3,
    out: 15.38,
    fade: { in: 0.3, out: 0.12 },
    joins: "rule-3",
  },
];

/** The tag swings about its pin at each change of words: the site's --dur-hinge, 680 ms. */
const swing = (s: number): Key[] => [
  [s, "rotate(0deg)", "in-out"],
  [s + 0.15, "rotate(-2.5deg)", "paper"],
  [s + 0.68, "rotate(0deg)"],
];

const s1: Key[] = [
  [0, "translate(0px, 30px)"],
  [1.2, "translate(0px, 30px)", "paper"],
  [2.4, "translate(0px, 0px)", "sway"],
  [6.4, "translate(0px, -12px)"],
  [6.75, "translate(0px, -12px)", "in-out"],
  [7.45, "translate(-900px, -12px)"],
];
const s1Shade: Key[] = [
  [6.4, 0, "lamp"],
  [6.85, 0.3],
];
const s2: Key[] = [
  [0, "translate(26px, 0px)"],
  [7.1, "translate(26px, 0px)", "paper"],
  [8.1, "translate(0px, 0px)", "sway"],
  [11.4, "translate(-24px, 0px)"],
  [11.55, "translate(-24px, 0px)", "in-out"],
  [12.25, "translate(-964px, 0px)"],
];
const s2Shade: Key[] = [
  [0, 0.3],
  [6.85, 0.3, "lamp"],
  [7.55, 0],
  [11.2, 0, "lamp"],
  [11.65, 0.3],
];

/**
 * The Day layer is hidden from the dusk until the return to morning, so at 13.00 its flats go back to where frame
 * 0 has them: the hem's diamond points then show S1, as at the start, and the last frames equal the first.
 */
const RESET = 13;

const tracks: Track[] = [
  {
    part: "curtain",
    property: "transform",
    keys: [
      [0, "translateY(0px)"],
      [1.1, "translateY(0px)", "in-out"],
      [2.25, "translateY(-1000px)"],
      [13.7, "translateY(-1000px)", "in-out"],
      [14.82, "translateY(0px)"],
    ],
  },
  // Light before movement: the lamp behind the curtain warms before it rises. Evening's halo is always lit.
  { part: "halo", layer: "day", property: "opacity", keys: [[0, 0, "lamp"], [0.9, 1], [12, 1], [12, 0]] },
  { part: "halo", layer: "evening", property: "opacity", keys: [[0, 1]] },
  { part: "s1", layer: "evening", property: "transform", keys: s1 },
  { part: "s1", layer: "day", property: "transform", keys: [...s1, [RESET, "translate(-900px, -12px)"], [RESET, "translate(0px, 30px)"]] },
  { part: "s1-shade", layer: "evening", property: "opacity", keys: s1Shade },
  { part: "s1-shade", layer: "day", property: "opacity", keys: [...s1Shade, [RESET, 0.3], [RESET, 0]] },
  { part: "s2", layer: "evening", property: "transform", keys: s2 },
  { part: "s2", layer: "day", property: "transform", keys: [...s2, [RESET, "translate(-964px, 0px)"], [RESET, "translate(26px, 0px)"]] },
  { part: "s2-shade", property: "opacity", keys: s2Shade },
  // The quiet lamp lights, then blooms, then pools on the floor.
  { part: "s3-lit", property: "opacity", keys: [[12, 0, "lamp"], [12.9, 1]] },
  { part: "bloom", property: "opacity", keys: [[12.3, 0, "lamp"], [13.3, 1]] },
  { part: "pool", layer: "evening", property: "opacity", keys: [[12.4, 0, "lamp"], [13.4, 1]] },
  { part: "tag", property: "transform", keys: [2.1, 6.85, 11.6].flatMap(swing) },
  ...captionTracks(captions),
  { part: "caption-sleep", property: "transform", keys: [[13, "translateY(10px)", "out"], [13.3, "translateY(0px)"]] },
  // Dusk (left to right) during rule 2's last second, and the return to morning that makes the loop seamless. The
  // morning has half a second for the whole width, so it takes the gentlest curve: ease-lamp would jump 260 px a frame.
  {
    part: "evening-layer",
    property: "clipPath",
    keys: [
      [0, "inset(0px 1080px 0px 0px)"],
      [10.5, "inset(0px 1080px 0px 0px)", "lamp"],
      [11.5, "inset(0px 0px 0px 0px)"],
      [15.38, "inset(0px 0px 0px 0px)", "sway"],
      [15.93, "inset(0px 0px 0px 1080px)"],
    ],
  },
  {
    part: "wipe-hem",
    property: "transform",
    keys: [
      [0, "translateX(-18px)"],
      [10.5, "translateX(-18px)", "lamp"],
      [11.5, "translateX(1080px)"],
      [12, "translateX(1080px)"],
      [12, "translateX(-18px)"],
      [15.38, "translateX(-18px)", "sway"],
      [15.93, "translateX(1080px)"],
    ],
  },
];

/** The GIF's lamplight wash: it rests, then travels row 1 → 2 → 3 in steps of 0.4 s, holding on each row. */
function washFrames(): GifFrame[] {
  const steps = [0.2, 0.4, 0.6, 0.8];
  const frames: GifFrame[] = [{ wash: [0, 0, 0], cs: 300 }];
  frames.push(...steps.map((v): GifFrame => ({ wash: [v, 0, 0], cs: 10 })));
  frames.push({ wash: [1, 0, 0], cs: 120 });
  frames.push(...steps.map((v): GifFrame => ({ wash: [1 - v, v, 0], cs: 10 })));
  frames.push({ wash: [0, 1, 0], cs: 120 });
  frames.push(...steps.map((v): GifFrame => ({ wash: [0, 1 - v, v], cs: 10 })));
  frames.push({ wash: [0, 0, 1], cs: 120 });
  frames.push(...steps.map((v): GifFrame => ({ wash: [0, 0, 1 - v], cs: 10 })));
  // Round the wash to tenths, so 1 − 0.8 is 0.2 and frames 7–10 match the table exactly.
  const tenth = (w: number) => Math.round(w * 10) / 10;
  return frames.map(({ wash: [a, b, c], cs }) => ({ wash: [tenth(a), tenth(b), tenth(c)], cs }));
}

export const houseRules: Piece = {
  slug,
  video: {
    seconds: 16,
    fps: 30,
    lockup: copy.lockup,
    // Front to back. Image boxes are arch-local px.
    scenes: [
      // The house in section, viewBox x 134–465 and y 96–442 at 2.6×: pods upstairs, the stairs, the front desk and café below.
      { id: "s1", drawing: "house", box: [-286, -26, 1601.6, 926] },
      // The terrace and its sign: the whole sign and its lettering in view.
      { id: "s2", drawing: "entrance", box: [-20, -70, 920, 1150] },
      { id: "s3", drawing: "wall-lamp", box: [0, -110, 860, 1075], lamp: { shade: 0.55, bloom: [70, 230, 520] } },
    ],
    captions,
    tracks,
    // The contact sheet's moments (the cover, each rule at rest, the dusk, the lamp, the close, the loop), the safe
    // zones over the quiet tag with "Sleep well", and the plate's colour on rule 1.
    review: { contact: [0, 0.9, 2.6, 5, 7.3, 9.5, 11, 12.5, 13.6, 15, 15.7, 15.97], safeZones: 13.6, plate: 5 },
  },
  board: {
    eyebrow: copy.eyebrow,
    title: copy.title,
    rows: [
      { drawing: "house", crop: { x: 150, y: 96, width: 262, height: 327.5 }, icon: "shoes-off", headline: copy.shoes.headline, body: [copy.shoes.body] },
      { drawing: "entrance", crop: { x: 0, y: 0, width: 480, height: 600 }, icon: "no-smoking", headline: copy.smoking.headline, body: copy.smoking.body },
      {
        drawing: "wall-lamp",
        crop: { x: 0, y: 0, width: 480, height: 600 },
        evening: true,
        icon: "quiet-hours",
        headline: copy.quiet.headline,
        times: copy.quiet.times,
        body: [copy.quiet.rule],
      },
    ],
    signOff: copy.signOff,
  },
  gif: { frames: washFrames() },
  stills: [
    { theme: "day", file: "house-rules-card.png" },
    { theme: "evening", file: "house-rules-card-evening.png" },
  ],
  post: postText(),
};
