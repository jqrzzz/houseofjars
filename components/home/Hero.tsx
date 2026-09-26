import Link from "next/link";
import { CLUSTER, jarTransform } from "@/components/brand/jar-cluster";
import { JAR_BODY, JAR_CARVE } from "@/components/brand/jar-shape";
import { TextileBand } from "@/components/brand/TextileBand";
import { AskShadowButton } from "@/components/concierge/AskShadowButton";
import buttons from "@/components/ui/button.module.css";
import { ArrowIcon } from "@/components/ui/icons";
import { identity } from "@/content/identity";
import styles from "./Hero.module.css";

const tones = { 1: styles.tone1, 2: styles.tone2, 3: styles.tone3 } as const;

// The jars rise left to right, whatever order they are drawn in.
const riseOrder = [...CLUSTER.jars].sort((a, b) => a.x - b.x);

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title" data-hides-launcher="">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <p className={styles.greeting}>
            <span lang="lo" className={styles.lao}>
              ສະບາຍດີ
            </span>
            <span aria-hidden="true" className={styles.dot}>
              ·
            </span>
            <span>Sabaidee</span>
          </p>
          <h1 id="hero-title" className={styles.title}>
            A calm house in the heart of Vientiane.
          </h1>
          <p className={styles.lede}>
            Curtained pod beds, strong air-conditioning, breakfast in our café downstairs, and a team that looks
            after every detail, day and night.
          </p>
          <p className={styles.owner}>Owned and run by {identity.owner.name.value}.</p>
          <div className={styles.actions}>
            <Link href="/book" className={`${buttons.button} ${buttons.primary}`}>
              Check availability
              <ArrowIcon />
            </Link>
            <AskShadowButton className={`${buttons.button} ${buttons.secondary}`}>Ask Shadow</AskShadowButton>
          </div>
        </div>

        <svg
          className={styles.jars}
          viewBox={`0 0 ${CLUSTER.width} ${CLUSTER.height}`}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            {/* Fine grain, so the jars read as stone rather than flat shapes. */}
            <filter id="jar-grain" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves={2} seed={4} result="noise" />
              <feColorMatrix
                in="noise"
                type="matrix"
                values="0 0 0 0 0.14  0 0 0 0 0.09  0 0 0 0 0.05  0 0 0 0.42 -0.12"
                result="specks"
              />
              <feComposite in="specks" in2="SourceGraphic" operator="in" result="grain" />
              <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="grain" />
              </feMerge>
            </filter>
            {/* Morning light from the upper left. */}
            <linearGradient id="jar-light" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" className={styles.lightStop} />
              <stop offset="0.5" className={styles.clearStop} />
              <stop offset="1" className={styles.shadeStop} />
            </linearGradient>
          </defs>
          {CLUSTER.jars.map((jar) => (
            <g
              key={jar.x}
              className={styles.rise}
              style={{ animationDelay: `${riseOrder.indexOf(jar) * 90}ms` }}
              filter="url(#jar-grain)"
            >
              <g transform={jarTransform(jar)}>
                <path d={JAR_BODY} className={tones[jar.tone]} />
                <path d={JAR_BODY} fill="url(#jar-light)" />
                <path d={JAR_CARVE} className={styles.groove} />
              </g>
            </g>
          ))}
        </svg>
      </div>
      <div className={styles.horizon} aria-hidden="true" />
      <TextileBand tone="stone" className={styles.band} />
    </section>
  );
}
