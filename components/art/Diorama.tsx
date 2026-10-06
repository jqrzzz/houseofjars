import { useId } from "react";
import styles from "./Diorama.module.css";
import paper from "./paper.module.css";
import { num, seeded } from "./stone-jar";
import { TukTuk } from "./TukTuk";

/*
 * The neighbourhood as a paper diorama on a 640 by 200 stage (16:5), in three
 * planes: at the back the sky and the Mekong's ribbons below the Thai bank;
 * in the middle a row of Vientiane shophouses with lantern strings, as in the
 * riverside drawing; in front the street, where a tuk-tuk is parked. A 4:3
 * frame shows the middle of the same stage.
 */
const GROUND = 182;

// Shophouses: left, width, roofline, roof (0 parapet, 1 hipped, 2 gable), facade paper.
const HOUSES: readonly (readonly [number, number, number, 0 | 1 | 2, "c" | "s" | "f" | "p"])[] = [
  [-10, 58, 128, 1, "s"],
  [48, 44, 114, 2, "c"],
  [92, 62, 134, 0, "f"],
  [154, 46, 120, 1, "p"],
  [200, 70, 108, 0, "s"],
  [270, 50, 126, 2, "c"],
  [320, 56, 116, 1, "f"],
  [376, 64, 132, 0, "p"],
  [440, 48, 112, 2, "s"],
  [488, 66, 124, 1, "c"],
  [554, 50, 118, 0, "f"],
  [604, 46, 130, 2, "s"],
];

function town() {
  const facades: Record<string, string> = {};
  let roofs = "";
  let gables = "";
  let lit = "";
  let windows = "";
  let awnings = "";
  HOUSES.forEach(([x, w, top, roof, tone], k) => {
    facades[tone] = (facades[tone] ?? "") + `M${x} ${top}h${w}V${GROUND}H${x}Z`;
    if (roof === 1) roofs += `M${x - 3} ${top}L${x + 9} ${top - 13}H${x + w - 9}L${x + w + 3} ${top}Z`;
    else if (roof === 2) gables += `M${x - 2} ${top}L${x + w / 2} ${top - 17}L${x + w + 2} ${top}Z`;
    else roofs += `M${x - 1} ${top}h${w + 2}v-5h-${w + 2}Z`;
    // Shutters in rows of storeys: each row one dashed line (7 on, 8 off), centred on the facade.
    const length = Math.max(1, Math.floor((w - 6) / 15)) * 15 - 8;
    for (let y = top + 14; y + 5 < 154; y += 20) windows += `M${num(x + (w - length) / 2)} ${y}h${length}`;
    // Two shops in three open to the street under an awning.
    if (k % 3 !== 2) {
      lit += `M${x + 9} 166h${w - 18}v${GROUND - 166}h-${w - 18}Z`;
      awnings += `M${x + 5} 160h${w - 10}l4 5h-${w - 2}Z`;
    }
  });
  return { facades, roofs, gables, lit, windows, awnings };
}

// A string of lanterns: a sagging line (a quadratic curve) and lanterns hung along it.
function lanterns(from: readonly [number, number], to: readonly [number, number], sag: number, at: readonly number[]) {
  const c = [(from[0] + to[0]) / 2, Math.max(from[1], to[1]) + sag] as const;
  const point = (t: number) => [0, 1].map((k) => (1 - t) ** 2 * from[k]! + 2 * (1 - t) * t * c[k]! + t ** 2 * to[k]!) as [number, number];
  const line = `M${from[0]} ${from[1]}Q${c[0]} ${c[1]} ${to[0]} ${to[1]}`;
  let shapes = "";
  for (const t of at) {
    const [x, y] = point(t).map((v) => Number(num(v))) as [number, number];
    // A lantern on the line: a round-capped dash 6.4 wide, so 6.4 by 8.
    shapes += `M${x} ${num(y + 3.4)}v1.6`;
  }
  return { line, shapes };
}

// A palm: a slim trunk and four fronds from its crown, each a leaf (two curves out to its tip and back).
function palm(x: number, height: number) {
  const [cx, cy] = [x + 2, GROUND - height];
  const fronds = [
    [-24, 4, -12, -10],
    [-10, -12, -2, -14],
    [12, -11, 6, -14],
    [24, 6, 14, -8],
  ]
    .map(([tx, ty, mx, my]) => `M${cx} ${cy}q${mx} ${my! - 2} ${tx} ${ty}q${mx! - tx! + 2} ${my! - ty! + 5} ${-tx!} ${-ty!}`)
    .join("");
  return { trunk: `M${x - 2} ${GROUND}h4l1.5-${height}h-3Z`, fronds };
}

// Pin-prick stars: zero-length round-capped strokes, one dot each, in two sets that come out one after the other.
function stars() {
  const random = seeded(19);
  const d = ["", ""];
  for (let k = 0; k < 18; k++) {
    const x = Math.round(12 + random() * 616);
    const y = Math.round(5 + random() * 46);
    if (Math.abs(x - 410) < 20 && y < 44) continue; // not over the moon
    d[k % 2] += `M${x} ${y}h0`;
  }
  return d;
}

const TOWN = town();
const STRINGS = [lanterns([70, 97], [348, 103], 26, [0.12, 0.3, 0.5, 0.7, 0.88]), lanterns([464, 95], [627, 113], 20, [0.2, 0.45, 0.7])];
const STARS = stars();
const PALMS = [palm(298, 40), palm(546, 34)];

/**
 * A paper diorama of the neighbourhood (docs/DESIGN.md §5.1 ⑤, §5.3, §10.1).
 *
 * "home": 16:5 from 48rem, 4:3 on phones. As it scrolls through the view, the
 * clouds drift, the planes move at their depths (back 0, middle 0.15, front
 * 0.35) and the tuk-tuk crosses from the left edge to 55%; at rest it is
 * parked at 40%.
 * "vientiane": a 4:3 header picture; the tuk-tuk rolls in once (900 ms) as
 * the page opens.
 *
 * By Evening the windows and shops are lit, and a paper moon and pin-prick
 * stars fade in once when the scene first comes into view (it is a
 * [data-phrase]). Every rest frame is the finished picture. Decorative.
 *
 * Shapes inside take short class names (legend in Diorama.module.css), which
 * keeps the inline drawing within its 6 kB.
 */
export function Diorama({ variant, className }: { variant: "home" | "vientiane"; className?: string }) {
  const id = useId();
  // The frame is hidden from assistive technology as a whole, so its planes need no attributes of their own.
  const svg = { viewBox: "0 0 640 200", preserveAspectRatio: "xMidYMax slice" } as const;
  return (
    <div className={[styles.diorama, styles[variant], className].filter(Boolean).join(" ")} data-phrase="" aria-hidden="true">
      <svg {...svg} className={`${paper.paper} bk`}>
        <path className="s2" d="M0 30Q160 20 320 28T640 24V80H0Z" />
        <path className="s3" d="M0 46Q170 40 330 48T640 42V80H0Z" />
        <circle className="sun" cx="430" cy="58" r="15" />
        <g className="mn">
          <circle className="eg" cx="410" cy="24" r="11" />
          <circle cx="410" cy="24" r="11" />
          <path className="cr" d="M404 21a2.4 2.4 0 1 0 .1 0ZM412.5 28.5a1.7 1.7 0 1 0 .1 0Z" />
        </g>
        <path className="st" d={STARS[0]} />
        <path className="st" d={STARS[1]} />
        {/* The fill sits on the group, so the edge's copy takes the edge's colour. */}
        <g className="c cl">
          <use href={`#${id}a`} className="eg" />
          <path id={`${id}a`} d="M206 36h72a9 9 0 0 0-10-12a13 13 0 0 0-23-7a11 11 0 0 0-21 4a9 9 0 0 0-18 15Z" />
        </g>
        <g className="c cl cf">
          <use href={`#${id}b`} className="eg" />
          <path id={`${id}b`} d="M500 18h56a8 8 0 0 0-9-10a11 11 0 0 0-19-5a9 9 0 0 0-17 3a7 7 0 0 0-11 12Z" />
        </g>
        <path className="f" d="M0 62Q40 52 90 58T190 56T300 59T420 53T540 58T640 54V80H0Z" />
        <path className="r1" d="M0 65Q80 63 160 66T320 65T480 67T640 64V140H0Z" />
        <path className="r2" d="M0 84Q90 81 180 85T360 83T540 86T640 83V140H0Z" />
        <path className="r1" d="M0 102Q100 99 200 103T400 101T600 104T640 102V140H0Z" />
        <path className="gt" d="M120 74h18M300 92h14M470 73h22M560 93h12M60 91h16M396 110h10M236 111h14M520 109h18" />
      </svg>
      <svg {...svg} className={`${paper.paper} md`}>
        <use href={`#${id}`} className="o" />
        <g id={id}>
          {Object.entries(TOWN.facades).map(([tone, d]) => (
            <path key={tone} className={tone} d={d} />
          ))}
          <path className="wd" d={TOWN.roofs} />
          <path className="w" d={TOWN.gables} />
          <path className="in" d={TOWN.lit} />
          <path className="wn" d={TOWN.windows} />
          <path className="t" d={TOWN.awnings} />
          <path className="b" d={PALMS.map((p) => p.trunk).join("")} />
          <path className="g" d={PALMS.map((p) => p.fronds).join("")} />
        </g>
        <path className="h" d={STRINGS.map((s) => s.line).join("")} />
        <path className="lt" d={STRINGS.map((s) => s.shapes).join("")} />
      </svg>
      <svg {...svg} className={`${paper.paper} fr`}>
        <path className="s" d="M-200 180H840V230H-200Z" />
        <path className="l" d="M-200 180H840" />
        <path className="ln" d="M-200 194H840" />
      </svg>
      <TukTuk className="tk" />
    </div>
  );
}
