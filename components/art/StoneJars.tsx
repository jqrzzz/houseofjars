import { useId, type CSSProperties } from "react";
import paper from "./paper.module.css";
import { lichen, num, seeded, stoneJar, type JarSpec } from "./stone-jar";
import styles from "./StoneJars.module.css";

/**
 * One stone jar in cut paper (from stoneJar()): the stone in --jar-2, a flat
 * plane of shade down its far side, rain stains and the collar's shadow, the
 * rim's top in --jar-1 and the dark opening; one ink line round the
 * silhouette. `open` also shows the far inner wall, for a jar seen from above.
 * Coordinates are the jar's own: its foot's centre is (0, 0).
 */
export function PaperJar({ spec, id, open = false, lichenAt }: { spec: JarSpec; id: string; open?: boolean; lichenAt?: readonly [number, number] }) {
  const jar = stoneJar(spec);
  const half = spec.w / 2;
  const rimX = half * (spec.lip ?? 0.92);
  const ry = rimX * (spec.top ?? 0.1);
  const yTop = -spec.h + ry;
  // The shade's edge: a long gentle curve down the jar, a third of the way in from the far side.
  const x0 = half * 0.32;
  const shade = `M${num(x0)} ${-spec.h - 4}Q${num(x0 - half * 0.12)} ${num(-spec.h / 2)} ${num(x0 + half * 0.06)} 6H${half * 2}V${-spec.h - 4}Z`;
  const mouth = { rx: rimX * 0.68, ry: ry * 0.52, cy: yTop - ry * 0.04 };
  const wall =
    `M${num(-mouth.rx)} ${num(mouth.cy)}A${num(mouth.rx)} ${num(mouth.ry)} 0 0 1 ${num(mouth.rx)} ${num(mouth.cy)}` +
    `A${num(mouth.rx * 0.96)} ${num(mouth.ry * 0.62)} 0 0 0 ${num(-mouth.rx)} ${num(mouth.cy)}Z`;
  return (
    <>
      <path className={styles.ground} d={jar.mound} />
      {/* The fill sits on the group, so the ink's copy below can be unfilled. */}
      <g className={styles.stone}>
        <path id={id} d={jar.body} />
      </g>
      <clipPath id={`${id}c`}>
        <use href={`#${id}`} />
      </clipPath>
      <g clipPath={`url(#${id}c)`}>
        <path className={styles.shade} d={shade} />
        <path className={styles.stain} d={jar.stains} />
        <path className={styles.under} d={jar.collar} />
        {lichenAt ? <path className={styles.lichen} d={lichen(spec.seed ?? 1, lichenAt[0], lichenAt[1], half * 0.3, 9)} /> : null}
      </g>
      <path className={styles.rim} d={jar.top} />
      <path className={styles.hollow} d={jar.mouth} />
      {open ? <path className={styles.wall} d={wall} /> : null}
      {jar.bite ? <path className={styles.hollow} d={jar.bite} /> : null}
      {jar.biteEdge ? <path className={styles.edge} d={jar.biteEdge} /> : null}
      {jar.crack ? <path className="h" d={jar.crack} /> : null}
      {/* The silhouette's ink: the stone's outline again, unfilled, on top. */}
      <use href={`#${id}`} className={styles.ink} />
    </>
  );
}

/** A jar's proportions from a seed: squat or tall, whole or broken, every build the same. */
function specFor(seed: number): JarSpec {
  const r = seeded(seed * 977 + 3);
  const between = (a: number, b: number) => a + (b - a) * r();
  const h = Math.round(between(62, 92));
  return {
    w: Math.round(h * between(0.72, 0.92)),
    h,
    foot: between(0.78, 0.88),
    belly: between(0.36, 0.46),
    neck: between(0.8, 0.88),
    lip: between(0.88, 0.96),
    lipH: between(0.1, 0.15),
    top: between(0.12, 0.2),
    skew: between(0.02, 0.05),
    rough: between(0.02, 0.035),
    seed,
    ...(r() < 0.45 ? { crack: { at: between(-0.5, 0.5), length: between(0.2, 0.36) } } : {}),
    ...(r() < 0.35 ? { bite: { at: between(-0.5, 0.5), width: between(0.2, 0.32), depth: between(0.08, 0.14) } } : {}),
  };
}

/**
 * Stone jars of the Plain of Jars in cut paper (docs/DESIGN.md §5.3, /about):
 * one jar per seed, each hewn differently, standing in a row. As the row
 * scrolls into view each jar pops up, hinging from 62° about its foot, a
 * little after the one before; at rest they simply stand. Decorative.
 */
export function StoneJars({ seeds, className }: { seeds: readonly number[]; className?: string }) {
  const id = useId();
  return (
    <div className={[styles.jars, className].filter(Boolean).join(" ")} aria-hidden="true">
      {seeds.map((seed, k) => {
        const spec = specFor(seed);
        const box = stoneJar(spec).box;
        const pad = 4;
        return (
          <span key={seed} className={styles.jar} style={{ "--k": k, "--w": box.width + 2 * pad } as CSSProperties}>
            <svg
              className={paper.paper}
              viewBox={`${box.x - pad} ${box.y - pad} ${box.width + 2 * pad} ${box.height + pad}`}
              width={box.width + 2 * pad}
              height={box.height + pad}
              focusable="false"
            >
              <PaperJar spec={spec} id={`${id}${k}`} lichenAt={[-spec.w * 0.18, -spec.h * 0.3]} />
            </svg>
          </span>
        );
      })}
    </div>
  );
}
