import type { CSSProperties } from "react";
import {
  FAR_BANK,
  FAR_LIGHTS,
  GLINTS,
  GROUND_PATH,
  JARS,
  LID,
  MOON,
  RIVER_BANDS,
  SCENE,
  STARS,
  SUN,
  SUN_GLINTS,
  TUFTS,
  jarGeometry,
  jarTransform,
} from "@/components/art/mekong-dawn";
import { specks } from "@/components/art/stone-jar";
import styles from "./Hero.module.css";

const tones = { 1: styles.tone1, 2: styles.tone2, 3: styles.tone3 } as const;

// The jars settle left to right, whatever order they are drawn in.
const settleOrder = [...JARS].sort((a, b) => a.x - b.x);

/** Stone grain: a few specks on a small tile, instead of a noise filter (cheap to paint on phones). */
const GRAIN = specks([[3, 2], [17, 6], [8, 11], [21, 15], [2, 19], [25, 26], [13, 28]]);
const GRAIN_LIGHT = specks([[10, 4], [23, 10], [5, 14], [18, 22]]);

/** The landscape: see components/art/mekong-dawn.ts. Decorative, so hidden from assistive tech. */
export function MekongDawn() {
  return (
    <svg className={styles.scene} viewBox={`0 0 ${SCENE.width} ${SCENE.height}`} focusable="false">
      <defs>
        {/* Shadow's sunrise: its one appearance on the page. */}
        <linearGradient id="hero-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdb833" />
          <stop offset="0.55" stopColor="#f7931e" />
          <stop offset="1" stopColor="#ff6b35" />
        </linearGradient>
        <radialGradient id="hero-glow">
          <stop offset="0" className={styles.glowStop} />
          <stop offset="1" className={styles.glowEnd} />
        </radialGradient>
        {/* Light from the upper left: lit stone, then shade. */}
        <linearGradient id="hero-shade" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#fff" className={styles.lightStop} />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.6" stopColor="#140c06" stopOpacity="0" />
          <stop offset="1" stopColor="#140c06" className={styles.shadeStop} />
        </linearGradient>
        {/* A warm edge where the low sun (or the lanterns at night) catch the stone. */}
        <linearGradient id="hero-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={styles.rimStop} />
          <stop offset="0.7" className={styles.rimEnd} />
        </linearGradient>
        {/* Weathering: darkest under the collar, fading down the stone, dark again at the damp foot. */}
        <linearGradient id="hero-stain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={styles.stain} />
          <stop offset=".6" className={styles.clean} />
          <stop offset=".86" className={styles.clean} />
          <stop offset="1" className={styles.stain} />
        </linearGradient>
        <pattern id="hero-grain" width="31" height="31" patternUnits="userSpaceOnUse">
          <path d={GRAIN} stroke="#2b1c10" strokeLinecap="round" opacity=".3" />
          <path d={GRAIN_LIGHT} stroke="#fff" strokeLinecap="round" opacity=".35" />
        </pattern>
        {JARS.map((jar) => (
          <path key={jar.id} id={`hero-jar-${jar.id}`} d={jarGeometry(jar).body} />
        ))}
        {JARS.map((jar) => (
          <clipPath key={jar.id} id={`hero-clip-${jar.id}`}>
            <use href={`#hero-jar-${jar.id}`} />
          </clipPath>
        ))}
      </defs>

      <circle className={styles.glow} cx={SUN.cx} cy={SUN.cy} r={SUN.r * 2.6} fill="url(#hero-glow)" />
      <g className={styles.sun}>
        <circle cx={SUN.cx} cy={SUN.cy} r={SUN.r} fill="url(#hero-sun)" />
      </g>
      <g className={styles.night}>
        <circle className={styles.moonGlow} cx={MOON.cx} cy={MOON.cy} r={MOON.r * 4} fill="url(#hero-glow)" />
        <circle className={styles.moon} cx={MOON.cx} cy={MOON.cy} r={MOON.r} />
        <path className={styles.stars} d={STARS.bright} strokeWidth="4" />
        <path className={styles.stars} d={STARS.faint} strokeWidth="2.6" />
      </g>

      <path className={styles.bank} d={FAR_BANK} />
      <path className={styles.lights} d={FAR_LIGHTS} />
      {RIVER_BANDS.map((band, index) => (
        <path key={band} className={styles[`river${index + 1}`]} d={band} />
      ))}
      <path className={`${styles.shimmer} ${styles.glint}`} d={GLINTS} />
      <path className={`${styles.shimmer} ${styles.sunGlint}`} d={SUN_GLINTS} />
      <path className={styles.ground} d={GROUND_PATH} />
      <path className={styles.tufts} d={TUFTS} />

      {JARS.map((jar) => {
        const jarShape = jarGeometry(jar);
        const href = `#hero-jar-${jar.id}`;
        return (
          <g
            key={jar.id}
            className={styles.settle}
            style={{ "--step": settleOrder.indexOf(jar) } as CSSProperties}
          >
            <g transform={jarTransform(jar)}>
              <use href={href} className={tones[jar.tone]} />
              <g clipPath={`url(#hero-clip-${jar.id})`}>
                <use href={href} fill="url(#hero-grain)" />
                <use href={href} fill="url(#hero-shade)" />
                <path d={jarShape.stains} fill="url(#hero-stain)" />
                <path d={jarShape.collar} className={styles.collar} />
                {jar.lichen ? <path d={jar.lichen} className={styles.lichen} /> : null}
                {jarShape.crack ? <path d={jarShape.crack} className={styles.crack} /> : null}
                <use href={href} className={styles.rim} />
              </g>
              <path className={styles.top} d={jarShape.top} />
              <path className={styles.mouth} d={jarShape.mouth} />
              {jarShape.bite ? (
                <>
                  <path className={styles.bite} d={jarShape.bite} />
                  <path className={styles.biteEdge} d={jarShape.biteEdge} />
                </>
              ) : null}
              <path className={styles.ground} d={jarShape.mound} />
            </g>
          </g>
        );
      })}

      <g className={styles.settle} style={{ "--step": JARS.length } as CSSProperties}>
        <g transform={`translate(${LID.x} ${LID.y}) rotate(${LID.lean})`}>
          <ellipse cx="0" cy="12" rx="66" ry="6" fill="#3b2414" opacity=".22" />
          <path className={tones[2]} d={LID.side} />
          <path d={LID.side} fill="#1a0f07" opacity=".07" />
          <path className={tones[1]} d={LID.top} />
          <path d={LID.top} fill="#fff" opacity=".2" />
        </g>
      </g>
    </svg>
  );
}
