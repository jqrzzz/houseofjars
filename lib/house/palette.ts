/**
 * The colours of the House Model, in the house's illustration style
 * (public/art/house.svg is the source of truth: ink #4a2f1b by day and
 * #dccdb6 by night, cream, teak, jar orange, lamplight).
 *
 * Every material has a day and an Evening base colour and three tones each:
 * the top (the base), the face toward the viewer's left (a little darker) and
 * the face toward the right (darker still), as if lit from the upper left.
 * The tones are mixed from the base so that changing one colour here changes
 * the whole drawing; a material can set its tones by hand instead.
 *
 * Classes are short (a material code and a tone digit: "wd1" is the
 * left-facing tone of wood) and every rule is scoped under the SVG's own
 * class, so several drawings can sit inline on one page.
 */
import type { AreaKind, Outfit, Theme } from "./types";

export type Tone = 0 | 1 | 2;

export interface Material {
  /** Two or three letters, the class prefix. */
  readonly code: string;
  readonly day: string;
  readonly evening: string;
  /** Hand-set tones (top, left, right), when mixing from the base is not right (lit glass at night). */
  readonly dayTones?: readonly [string, string, string];
  readonly eveningTones?: readonly [string, string, string];
}

/** Ink and the lines' night colour, from public/art/house.svg. */
export const INK = { day: "#4a2f1b", evening: "#dccdb6" } as const;

export const materials = {
  // From public/art/house.svg.
  cream: { code: "cr", day: "#fbf6ee", evening: "#2c1e13" },
  paper: { code: "pa", day: "#fffaf2", evening: "#3a2b1f" },
  stone: { code: "st", day: "#e7dac6", evening: "#34281d" },
  wood: { code: "wd", day: "#b97440", evening: "#7d4526" },
  woodDark: { code: "wk", day: "#8f532c", evening: "#5e3219" },
  brown: { code: "br", day: "#6f4d35", evening: "#8a6444" },
  jar: { code: "ja", day: "#e76e43", evening: "#d0623a" },
  lamp: { code: "la", day: "#eed079", evening: "#eed079", eveningTones: ["#f2d98a", "#eed079", "#e2c062"] },
  sage: { code: "sg", day: "#9aa585", evening: "#6f7a60" },
  terracotta: { code: "tc", day: "#b86a3f", evening: "#8f5334" },
  // The pods' woven curtains: grey-brown with a cream band at the bottom.
  curtain: { code: "cu", day: "#7d6f63", evening: "#5d5750" },
  curtainBand: { code: "cb", day: "#efe3cf", evening: "#9a8c76" },
  // The counter's cream tiles, the bathrooms' white tiles and grey floor.
  tile: { code: "ti", day: "#efe6d6", evening: "#4d4034" },
  // Evening tones stay warm (lamplight), not the cold grey of the day colours darkened.
  bathTile: { code: "bt", day: "#f3f1ec", evening: "#57514b" },
  bathFloor: { code: "bf", day: "#9aa0a6", evening: "#534d47" },
  // The street front: a warm terracotta orange, darker than jar orange.
  facade: { code: "fa", day: "#d9774f", evening: "#8c4b30" },
  facadeDeep: { code: "fd", day: "#c66843", evening: "#773d25" },
  // Inside: the café's ochre plaster, the dorms' clay-pink plaster.
  plaster: { code: "pl", day: "#ecd9a8", evening: "#4a3423" },
  dormPlaster: { code: "dp", day: "#d29b78", evening: "#5b3726" },
  // Floors: the café's cream tiles, the dorms' brown tiles, terracotta on the landings and terrace.
  cafeFloor: { code: "cf", day: "#f3eadb", evening: "#463628" },
  dormFloor: { code: "df", day: "#93603f", evening: "#4b3021" },
  landingFloor: { code: "lf", day: "#d27a49", evening: "#7f4327" },
  terraceTile: { code: "tt", day: "#cc6a40", evening: "#7a3b23" },
  pavement: { code: "pv", day: "#e6dccb", evening: "#2b231d" },
  // Glass: pale by day, lit from inside in the evening.
  glass: {
    code: "gl",
    day: "#cfdcd9",
    evening: "#d9a64a",
    dayTones: ["#dbe5e2", "#cfdcd9", "#bfcfcc"],
    eveningTones: ["#e2b25a", "#d9a64a", "#c99640"],
  },
  // The drinks fridge's glass door glows all day.
  fridgeGlass: {
    code: "fg",
    day: "#f6e7b0",
    evening: "#eed079",
    dayTones: ["#f8edc4", "#f6e7b0", "#efdc9c"],
    eveningTones: ["#f2d98a", "#eed079", "#e2c062"],
  },
  white: { code: "wh", day: "#f8f6f1", evening: "#5f5a54" },
  // Bed linen: stays light at night, in lamplight.
  linen: { code: "li", day: "#fbfaf6", evening: "#b9a98c" },
  steel: { code: "sl", day: "#c2c1b9", evening: "#6a6862" },
  dark: { code: "dk", day: "#55504a", evening: "#29251f" },
  pillow: { code: "gy", day: "#aaa6b2", evening: "#5a5660" },
  cushion: { code: "cs", day: "#e48a4e", evening: "#a3582f" },
  red: { code: "rd", day: "#c4432f", evening: "#93301f" },
  copper: { code: "cp", day: "#8a4f2c", evening: "#5a2f17" },
  bamboo: { code: "bm", day: "#d6af70", evening: "#806139" },
  slate: { code: "fs", day: "#5a6870", evening: "#2f3a40" },
  roofTile: { code: "rf", day: "#a3553a", evening: "#5f301d" },
  shadow: { code: "sh", day: "#5e3c27", evening: "#1b130d" },
  // Neighbours, in low detail: NinetyNine 99 Bar (dark grey) and Swedish Baking (blue).
  neighbourGrey: { code: "nl", day: "#8e8c88", evening: "#2a2826" },
  neighbourBlue: { code: "nb", day: "#7c9bc8", evening: "#25344c" },
  neighbourPanel: { code: "np", day: "#dcdcd6", evening: "#3c3d3d" },
} as const satisfies Record<string, Material>;

export type MaterialName = keyof typeof materials;

/** Plan tints by area kind (flat, no tones). */
export const kindTints: Record<AreaKind, { readonly day: string; readonly evening: string }> = {
  sleep: { day: "#f2dcc4", evening: "#3f2b1d" },
  wash: { day: "#e2e8ea", evening: "#36302b" },
  shared: { day: "#f8eedb", evening: "#33281d" },
  staff: { day: "#ebe1d1", evening: "#2f271f" },
  path: { day: "#f7dcc6", evening: "#40291b" },
  outside: { day: "#eedfc6", evening: "#2a221b" },
};

/** The floor finish of each area kind in the 3D views (sub-areas reuse their room's floor). */
export const kindFloors: Record<AreaKind, MaterialName> = {
  sleep: "dormFloor",
  wash: "bathFloor",
  shared: "cafeFloor",
  staff: "stone",
  path: "landingFloor",
  outside: "terraceTile",
};

const DAY_SHADE = "#2a1608";
const EVENING_SHADE = "#000000";

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]: readonly [number, number, number]): string {
  return "#" + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("");
}

/** Mixes a colour toward another by t (0 to 1). */
export function mix(from: string, to: string, t: number): string {
  const a = rgb(from);
  const b = rgb(to);
  return hex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
}

/**
 * A material's three tones. The paper outfit sets its faces closer together (half the model's mix), as
 * sheets of one paper folded, not blocks lit hard.
 */
export function tones(material: Material, theme: "day" | "evening", outfit: Outfit = "model"): readonly [string, string, string] {
  const set = theme === "day" ? material.dayTones : material.eveningTones;
  if (set) return set;
  const base = theme === "day" ? material.day : material.evening;
  const k = outfit === "paper" ? 0.5 : 1;
  return theme === "day"
    ? [base, mix(base, DAY_SHADE, 0.1 * k), mix(base, DAY_SHADE, 0.22 * k)]
    : [base, mix(base, EVENING_SHADE, 0.16 * k), mix(base, EVENING_SHADE, 0.32 * k)];
}

/** The lamplight the paper outfit's Evening card edges catch (lamplight, from public/art/house.svg). */
const LAMPLIGHT = "#eed079";

/**
 * The paper outfit's far paper, the site's --paper-far (stone into rice by day, night-raised into night by
 * Evening): the back planes (the cutaway's party and back walls) mix a quarter of the way toward it, so they
 * recede like the back sheets of a paper theatre. Their classes carry an "f" ("pl1f").
 */
const PAPER_FAR = { day: "#ebe3d6", evening: "#271a10" } as const;
const FAR_MIX = 0.25;
/** A faded floor in the paper outfit (Floor 2, not yet photographed) is pale, not see-through: its tones ("wd1g") and its ink this far toward the far paper. */
const PALE_MIX = 0.58;

/**
 * A material's card edge in the paper outfit: by day the next darker tone (the sheet's thickness, in its
 * shadow); by Evening a lamplight rim, the edge catching the light from behind.
 */
export function edgeTone(material: Material, theme: "day" | "evening"): string {
  return theme === "day" ? mix(material.day, DAY_SHADE, 0.34) : mix(material.evening, LAMPLIGHT, 0.5);
}

/** The class of a material's tone: "wd0" (top), "wd1" (left-facing), "wd2" (right-facing). */
export function fill(material: MaterialName, tone: Tone = 0): string {
  return materials[material].code + tone;
}

/** The class that strokes a line in a material's base colour (copper window bars, white grout). */
export function strokeOf(material: MaterialName): string {
  return "k" + materials[material].code;
}

/** The class of a plan tint. */
export function tint(kind: AreaKind): string {
  return "t-" + kind;
}

/**
 * Role classes, the same in every view. Lines keep their weight at any size
 * (vector-effect: non-scaling-stroke): 1.5 px for main outlines, 1 px for
 * hairlines, round caps and joins.
 */
const ROLES: Record<string, { day: string; evening?: string }> = {
  o: { day: "stroke-width:1.5" },
  h: { day: "stroke-width:1" },
  b: { day: "fill:none;stroke-width:2.5" },
  wl: { day: "fill:none;stroke-width:4;stroke-linecap:butt" },
  wf: { day: "fill:#4a2f1b;stroke:none", evening: "fill:#dccdb6" },
  wp: { day: "fill:#4a2f1b;stroke:none;opacity:.4", evening: "fill:#dccdb6" },
  eo: { day: "fill-rule:evenodd" },
  n: { day: "fill:none" },
  ns: { day: "stroke:none" },
  tg: { day: "fill:none;stroke-opacity:.2" },
  dl: { day: "fill:none;stroke-dasharray:3 4" },
  sd: { day: "fill:none;stroke-opacity:.45;stroke-dasharray:2 4" },
  // The route, drawn in short pieces in depth order (walls and beds in front hide it). Its dashes scale with
  // the drawing (no non-scaling stroke) so that every piece, one dash period long, lines up with the next.
  rt: { day: "fill:none;stroke:#e76e43;stroke-width:4;stroke-dasharray:7 7.8;vector-effect:none", evening: "stroke:#f08a5d" },
  // The whole route again on top, faint, so the stretches behind walls stay traceable.
  rh: { day: "fill:none;stroke:#e76e43;stroke-opacity:.55;stroke-width:2;stroke-dasharray:2 5", evening: "stroke:#f08a5d" },
  // Between floors lifted apart: from where the route leaves one floor to where it arrives on the next.
  rl: { day: "fill:none;stroke:#e76e43;stroke-opacity:.8;stroke-width:2;stroke-dasharray:1 6", evening: "stroke:#f08a5d" },
  ra: { day: "fill:#e76e43;stroke:none", evening: "fill:#f08a5d" },
  rs: { day: "fill:#fffaf2;stroke:#e76e43;stroke-width:2.5", evening: "fill:#2c1e13;stroke:#f08a5d" },
  hl: { day: "fill:none;stroke:#e76e43;stroke-width:3", evening: "stroke:#f08a5d" },
  // Under the highlight's outline, so it shows on terracotta and orange floors too.
  hu: { day: "fill:none;stroke:#fffaf2;stroke-width:7", evening: "stroke:#2c1e13" },
  dim: { day: "opacity:.28" },
  // A see-through face (the awning's roof in the street view, so the shopfront under it shows).
  gh: { day: "fill-opacity:.32" },
  gw: { day: "fill:#eed079;opacity:.28;stroke:none", evening: "opacity:.42" },
  lb: { day: "fill:#fffaf2;stroke-width:1.5", evening: "fill:#2c1e13" },
  // A label of a highlighted area: its pill outlined in jar orange.
  lbh: { day: "stroke:#e76e43;stroke-width:2.5", evening: "stroke:#f08a5d" },
  ld: { day: "fill:none;stroke-width:1" },
  lp: { day: "fill:#e76e43;stroke:none", evening: "fill:#f08a5d" },
  lt: { day: "fill:#4a2f1b;font-size:19px;font-weight:600", evening: "fill:#f1e4cf" },
  ls: { day: "fill:#4a2f1b;font-size:12px;font-weight:600", evening: "fill:#f1e4cf" },
  lc: { day: "fill:#6f4d35;font-size:12px", evening: "fill:#cbb89c" },
  lx: { day: "fill:#4a2f1b;font-size:15px;font-weight:600", evening: "fill:#f1e4cf" },
  lw: { day: "fill:#fffaf2;font-size:12px;font-weight:700", evening: "fill:#2c1e13" },
  // Letters on a sign (white, lit at night too).
  lsn: { day: "fill:#fffaf2;font-size:12px;font-weight:700" },
  ln: { day: "fill:#4a2f1b;font-size:10px;font-weight:600", evening: "fill:#f1e4cf" },
};

/**
 * The paper outfit's roles, over the model's (lib/house/render.ts draws with the same classes; the pen in
 * paperClass below maps them). Nothing is stroked unless a role says so: the root has no stroke.
 * - sl: the silhouette, on a <use> of a thing's group drawn just before it: its every shape stroked 3 px wide
 *   in ink, under the thing itself, so 1.5 px of ink shows around its outside and none inside.
 * - id: inner detail (window bars, cords, curtain folds), 1 px of ink at 60%.
 * - sk: a stick (a leg, a rod, a handle): a 1.5 px line of ink.
 * - ce: a card edge, the outline repeated behind a big plane, moved down and right by day (the sheet's
 *   thickness) and up by Evening (a lamplight rim); its colour is its material's edge tone (e + code).
 */
const PAPER_ROLES: Record<string, { day: string; evening?: string }> = {
  sl: { day: `stroke:${INK.day};stroke-width:3`, evening: `stroke:${INK.evening}` },
  id: { day: `fill:none;stroke:${INK.day};stroke-width:1;stroke-opacity:.6`, evening: `stroke:${INK.evening}` },
  sk: { day: `fill:none;stroke:${INK.day};stroke-width:1.1`, evening: `stroke:${INK.evening}` },
  ce: { day: "transform:translate(1.5px,1.5px)", evening: "transform:translate(0,-1.5px)" },
  // A faded floor is not see-through: its classes are pale (see PALE_MIX), and so is its ink (paperDimRules).
  dim: { day: "opacity:1" },
  // The awning's roof: thin paper, the shopfront showing through.
  gh: { day: "fill-opacity:.42" },
  // A label: a square paper tag with a hairline of ink.
  lb: { day: `fill:#fffaf2;stroke:${INK.day};stroke-width:1`, evening: `fill:#2c1e13;stroke:${INK.evening}` },
  ld: { day: `fill:none;stroke:${INK.day};stroke-width:1`, evening: `stroke:${INK.evening}` },
  hu: { day: "fill:none;stroke:#fffaf2;stroke-width:7", evening: "stroke:#2c1e13" },
};

/** The role table of an outfit. */
function rolesOf(outfit: Outfit): Record<string, { day: string; evening?: string }> {
  return outfit === "paper" ? { ...ROLES, ...PAPER_ROLES } : ROLES;
}

export interface CssOptions {
  readonly theme: Theme;
  /** The root class every rule is scoped under. */
  readonly scope: string;
  /** Every class the drawing uses: only those get a rule. */
  readonly used: ReadonlySet<string>;
  /** The paper outfit's stylesheet (closer tones, no stroke but where a role sets one). Default "model". */
  readonly outfit?: Outfit;
}

const byCode = new Map<string, Material>(Object.values(materials).map((m) => [m.code, m]));
const kinds = Object.keys(kindTints) as AreaKind[];

/** Role rules: the day declarations carry the structure (widths, dashes), the evening ones only recolour. */
function roleRules(scope: string, used: readonly string[], which: "day" | "evening", outfit: Outfit = "model"): string {
  const roles = rolesOf(outfit);
  let out = "";
  for (const cls of used) {
    const role = roles[cls];
    const decl = role && (which === "day" ? role.day : role.evening);
    if (decl) out += `.${scope} .${cls}{${decl}}`;
  }
  return out;
}

/** Colour rules for material tones, stroke colours and plan tints (and the paper outfit's edge tones). */
function colourRules(scope: string, used: readonly string[], theme: "day" | "evening", outfit: Outfit = "model"): string {
  const roles = rolesOf(outfit);
  let out = "";
  for (const cls of used) {
    if (roles[cls]) continue;
    const tone = /^([a-z]{2})([012])([fg]?)$/.exec(cls);
    const material = tone && byCode.get(tone[1]!);
    if (tone && material) {
      const base = tones(material, theme, outfit)[Number(tone[2]) as Tone];
      const toward = tone[3] === "f" ? FAR_MIX : tone[3] === "g" ? PALE_MIX : 0;
      out += `.${scope} .${cls}{fill:${toward ? mix(base, PAPER_FAR[theme], toward) : base}}`;
      continue;
    }
    const edge = /^e([a-z]{2})(g?)$/.exec(cls);
    const edged = edge && byCode.get(edge[1]!);
    if (edged) {
      out += `.${scope} .${cls}{fill:${edge[2] ? mix(edgeTone(edged, theme), PAPER_FAR[theme], PALE_MIX) : edgeTone(edged, theme)}}`;
      continue;
    }
    const stroke = /^k([a-z]{2})$/.exec(cls);
    const lined = stroke && byCode.get(stroke[1]!);
    if (lined) {
      out += `.${scope} .${cls}{stroke:${theme === "day" ? lined.day : lined.evening}}`;
      continue;
    }
    const kind = /^t-([a-z]+)$/.exec(cls);
    if (kind && kinds.includes(kind[1] as AreaKind)) out += `.${scope} .${cls}{fill:${kindTints[kind[1] as AreaKind][theme]}}`;
  }
  return out;
}

/**
 * The ghost of a faded area or fixture on a partly highlighted floor: every face filled with one opaque
 * paper tone and the lines faint. Nothing shows through (unlike opacity, which turns overlapping things
 * into muddy glass), the painter's order still holds, and it works when the class is toggled at runtime.
 * Two classes and an element outrank the material rules (two classes).
 */
export const GHOST = { day: "#f1e8dc", evening: "#2e241b" } as const;

function ghostRules(scope: string, theme: "day" | "evening", structure: boolean): string {
  const s = `.${scope} .dg`;
  return (structure ? `${s} path{stroke-opacity:.3}` : "") + `${s} path:not(.n){fill:${GHOST[theme]}}`;
}

/** Every class the stylesheet can style (roles, material tones, stroke colours, plan tints, paper roles and edge tones): for tests. */
export function styledClass(cls: string): boolean {
  if (ROLES[cls] || PAPER_ROLES[cls] || cls === "dg") return true;
  const tone = /^([a-z]{2})[012][fg]?$/.exec(cls);
  if (tone && byCode.has(tone[1]!)) return true;
  if (/^e[a-z]{2}g$/.test(cls) && byCode.has(cls.slice(1, 3))) return true;
  const stroke = /^[ke]([a-z]{2})$/.exec(cls);
  if (stroke && byCode.has(stroke[1]!)) return true;
  const kind = /^t-([a-z]+)$/.exec(cls);
  return Boolean(kind && kinds.includes(kind[1] as AreaKind));
}

/** Whether a class sets a fill (a material tone, an edge tone, a plan tint, or a role with a fill): for tests. */
export function fillingClass(cls: string): boolean {
  const role = PAPER_ROLES[cls] ?? ROLES[cls];
  if (role) return /(^|;)fill:/.test(role.day);
  return styledClass(cls) && !/^k/.test(cls) && cls !== "dg";
}

/** Whether a class paints a real fill (not fill:none): a face, not a line. */
function paintsFill(cls: string): boolean {
  const role = ROLES[cls];
  if (role) return /(^|;)fill:(?!none)/.test(role.day);
  return fillingClass(cls);
}

/** The class of a material's card edge in the paper outfit ("ewd": the edge of wood). */
export function edgeOf(material: MaterialName): string {
  return "e" + materials[material].code;
}

/** Classes a face drops in the paper outfit: outlines and hairlines (the silhouette draws the ink), grids, dashes. */
const FACE_DROPS = new Set(["o", "h", "ns", "tg", "sd", "dl"]);
/** Lines the paper outfit keeps as they are. */
const KEPT_LINES = new Set(["id", "sk", "rt", "rh", "rl", "hl", "hu", "ld"]);

/**
 * The pen of the paper outfit: the classes a path takes, or null to leave it out. Faces keep their fills
 * and lose their outlines. Lines: a thick one (a handle, a tap) or an outlined open one (a leg, a rod)
 * becomes a stick of ink; light cones, hairlines, grids, dashes and outlines go (the silhouette, drawn
 * under each thing, is its only ink). On plans (`plan`), hairlines and grids (stair treads, door swings)
 * stay as inner detail.
 */
export function paperClass(cls: string, line: boolean, plan = false): string | null {
  const tokens = cls.split(" ").filter(Boolean);
  if (tokens.includes("gw")) return null;
  if (!line && tokens.some(paintsFill)) return tokens.filter((t) => !FACE_DROPS.has(t)).join(" ");
  if (tokens.some((t) => KEPT_LINES.has(t))) return cls;
  const colour = tokens.find((t) => /^k[a-z]{2}$/.test(t));
  // A coloured line (a pod's curtain on a plan) stays, a stick in its colour.
  if (colour && (tokens.includes("b") || tokens.includes("o"))) return `sk ${colour}`;
  if (tokens.includes("b")) return "sk";
  if (plan && (tokens.includes("h") || tokens.includes("tg"))) return "id";
  if (tokens.includes("o") && !tokens.includes("n") && !tokens.includes("dl")) return "sk";
  return null;
}

/** The SVG's whole stylesheet: base rules, then the Evening palette (under the media query for auto). */
export function paletteCss({ theme, scope, used, outfit = "model" }: CssOptions): string {
  const s = `.${scope}`;
  const list = [...used].sort();
  const ghost = used.has("dg");
  const paper = outfit === "paper";
  const base =
    (paper
      ? `${s}{stroke:none;stroke-linecap:round;stroke-linejoin:round}`
      : `${s}{stroke:${theme === "evening" ? INK.evening : INK.day};stroke-width:1;stroke-linecap:round;stroke-linejoin:round}`) +
    `${s} path{vector-effect:non-scaling-stroke}` +
    `${s} text{stroke:none;font-family:Figtree,"Noto Sans Lao",system-ui,sans-serif}`;
  const dimInk = (which: "day" | "evening") =>
    paper && used.has("dim") ? `${s} .dim .sl,${s} .dim .id,${s} .dim .sk{stroke:${mix(INK[which], PAPER_FAR[which], PALE_MIX)}}` : "";
  const structure = roleRules(scope, list, "day", outfit) + dimInk("day");
  if (theme === "day") return base + structure + colourRules(scope, list, "day", outfit) + (ghost ? ghostRules(scope, "day", true) : "");
  const evening = roleRules(scope, list, "evening", outfit) + dimInk("evening") + colourRules(scope, list, "evening", outfit);
  if (theme === "evening") return base + structure + evening + (ghost ? ghostRules(scope, "evening", true) : "");
  return (
    base +
    structure +
    colourRules(scope, list, "day", outfit) +
    (ghost ? ghostRules(scope, "day", true) : "") +
    `@media (prefers-color-scheme:dark){${paper ? "" : `${s}{stroke:${INK.evening}}`}${evening}${ghost ? ghostRules(scope, "evening", false) : ""}}`
  );
}
