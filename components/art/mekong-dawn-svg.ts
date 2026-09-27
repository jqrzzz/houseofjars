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
    ? `<path d="${jar.lichen.ochre}" stroke="#c1913a" stroke-opacity=".55" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="${jar.lichen.green}" stroke="#8f9a7a" stroke-opacity=".5" stroke-width="3.2" stroke-linecap="round"/>`
    : "";
  const crack = shape.crack ? `<path d="${shape.crack}" fill="none" stroke="#2b1c10" stroke-opacity=".45" stroke-width="2.4"/>` : "";
  const bite = shape.bite
    ? `<path d="${shape.bite}" fill="#3a2a1e" fill-opacity=".85"/><path d="${shape.biteEdge}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>`
    : "";
  return (
    `<g transform="${jarTransform(jar)}">` +
    `<ellipse cx="0" cy="-1" rx="${num(jar.spec.w * 0.62)}" ry="7" fill="#3b2414" fill-opacity=".22"/>` +
    `<path d="${shape.body}" fill="${stone[jar.tone - 1]}"/>` +
    `<g clip-path="url(#clip-${jar.id})">` +
    `<path d="${shape.body}" fill="url(#shade)"/>` +
    `<path d="${shape.stains}" fill="url(#stain)"/>` +
    `<path d="${shape.collar}" fill="#140c06" fill-opacity=".24"/>` +
    lichen +
    crack +
    `</g>` +
    `<path d="${shape.top}" fill="#fff" fill-opacity=".3"/>` +
    `<path d="${shape.mouth}" fill="#2a1a0e" fill-opacity=".6"/>` +
    bite +
    `<path d="${shape.mound}" fill="#bf8a63"/>` +
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
    `<linearGradient id="stain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1c10" stop-opacity=".13"/><stop offset=".6" stop-color="#2b1c10" stop-opacity="0"/><stop offset=".86" stop-color="#2b1c10" stop-opacity="0"/><stop offset="1" stop-color="#2b1c10" stop-opacity=".13"/></linearGradient>` +
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
