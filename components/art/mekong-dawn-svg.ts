import { FAR_BANK, GLINTS, GROUND_PATH, JARS, LID, RIVER_BANDS, SCENE, SUN, SUN_GLINTS, TUFTS, jarGeometry, jarTransform } from "./mekong-dawn";
import { num } from "./stone-jar";

/*
 * The hero's landscape as a standalone SVG in its morning colours, for
 * images drawn at build time (the Open Graph cards), where there is no page
 * CSS: every colour is an attribute. The hero itself renders the same
 * geometry as JSX, themed and animated by CSS.
 */

const stone = ["#cdbfaa", "#b7a68e", "#9d8b73"] as const;
const river = ["#f1dbbd", "#e7cdaa", "#ddbf98"] as const;

function jarSvg(jar: (typeof JARS)[number]): string {
  const shape = jarGeometry(jar);
  const lichen = jar.lichen
    ? `<g stroke="#8f9a7a" stroke-opacity=".45" stroke-linecap="round"><path d="${jar.lichen.fine}" stroke-width="2.6"/><path d="${jar.lichen.coarse}" stroke-width="6"/></g>`
    : "";
  return (
    `<g transform="${jarTransform(jar)}">` +
    `<ellipse cx="0" cy="-1" rx="${num(jar.spec.w * 0.62)}" ry="7" fill="#3b2414" fill-opacity=".22"/>` +
    `<path d="${shape.body}" fill="${stone[jar.tone - 1]}"/>` +
    `<g clip-path="url(#clip-${jar.id})">` +
    `<path d="${shape.litPlanes}" fill="#fff" fill-opacity=".07"/>` +
    `<path d="${shape.darkPlanes}" fill="#1a0f07" fill-opacity=".07"/>` +
    `<path d="${shape.body}" fill="url(#shade)"/>` +
    `<path d="${shape.under}" fill="#140c06" fill-opacity=".26"/>` +
    lichen +
    `</g>` +
    `<path d="${shape.ledge}" fill="#fff" fill-opacity=".1"/>` +
    `<path d="${shape.top}" fill="#fff" fill-opacity=".34"/>` +
    `<path d="${shape.mouth}" fill="#2a1a0e" fill-opacity=".5"/>` +
    `</g>`
  );
}

/**
 * @param left Where the drawing starts on the left, in scene units (the scene
 *   runs on past 0). The right edge is always the scene's.
 */
export function mekongDawnSvg(left: number): string {
  const width = SCENE.width - left;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} 0 ${width} ${SCENE.height}">` +
    `<defs>` +
    `<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdb833"/><stop offset=".55" stop-color="#f7931e"/><stop offset="1" stop-color="#ff6b35"/></linearGradient>` +
    `<radialGradient id="glow"><stop offset="0" stop-color="#fdb833" stop-opacity=".4"/><stop offset="1" stop-color="#fdb833" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="shade" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#140c06" stop-opacity="0"/><stop offset="1" stop-color="#140c06" stop-opacity=".2"/></linearGradient>` +
    JARS.map((jar) => `<clipPath id="clip-${jar.id}"><path d="${jarGeometry(jar).body}"/></clipPath>`).join("") +
    `</defs>` +
    `<circle cx="${SUN.cx}" cy="${SUN.cy}" r="${num(SUN.r * 2.6)}" fill="url(#glow)"/>` +
    `<circle cx="${SUN.cx}" cy="${SUN.cy}" r="${SUN.r}" fill="url(#sun)"/>` +
    `<path d="${FAR_BANK}" fill="#b5b8ae"/>` +
    RIVER_BANDS.map((band, index) => `<path d="${band}" fill="${river[index]}"/>`).join("") +
    `<path d="${GLINTS}" stroke="#fffcf4" stroke-width="2" stroke-linecap="round" fill="none"/>` +
    `<path d="${SUN_GLINTS}" stroke="#fdb833" stroke-width="3" stroke-linecap="round" fill="none"/>` +
    `<path d="${GROUND_PATH}" fill="#bf8a63"/>` +
    `<path d="${TUFTS}" stroke="#8f9a7a" stroke-width="2.4" stroke-linecap="round" fill="none"/>` +
    JARS.map(jarSvg).join("") +
    `<g transform="translate(${LID.x} ${LID.y}) rotate(${LID.lean})">` +
    `<ellipse cx="0" cy="12" rx="66" ry="6" fill="#3b2414" fill-opacity=".22"/>` +
    `<path d="${LID.side}" fill="${stone[1]}"/><path d="${LID.side}" fill="#1a0f07" fill-opacity=".07"/>` +
    `<path d="${LID.top}" fill="${stone[0]}"/><path d="${LID.top}" fill="#fff" fill-opacity=".2"/>` +
    `</g>` +
    `</svg>`
  );
}
