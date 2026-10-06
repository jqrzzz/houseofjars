import Image from "next/image";
import type { CSSProperties } from "react";
import glow from "@/components/art/glow.module.css";
import { anchorOf, lightPoints, paperLayerSrc, stageGeometry, type PaperLayerId } from "@/lib/house/paper";
import styles from "./PhotoTwin.module.css";

/** How much of the stage a twin shows, in viewBox units across: about 4.7 m of the house. */
const SPAN = 170;

const round = (v: number) => Math.round(v * 1000) / 1000;

/**
 * A photo's paper twin (docs/DESIGN.md §2.4): a 6rem tile of the paper
 * stage's floor layer, cut around the area where the photo was taken, with
 * one of the house's lights glowing in it (or a glow where the photo was
 * taken, if no light falls inside). It reuses the stage's own layer images,
 * Day and Evening twins, so it costs no new drawing. Its light comes on as
 * the tile is first seen and after each theme switch (Lights on, a phrase).
 * Decorative.
 */
export function PhotoTwin({ area, className }: { area: string; className?: string }) {
  const anchor = anchorOf(`area-${area}`);
  if (!anchor) return null;
  const [vx, vy, vw, vh] = stageGeometry().viewBox;
  const x0 = anchor.x - SPAN / 2;
  const y0 = anchor.y - SPAN / 2;
  const layers: PaperLayerId[] = anchor.floor === "ground" ? ["ground", "ground-front"] : [anchor.floor];
  const light = lightPoints([anchor.floor])
    .filter((l) => Math.abs(l.x - anchor.x) < SPAN * 0.42 && Math.abs(l.y - anchor.y) < SPAN * 0.42)
    .sort((a, b) => Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y))[0];
  const lit = light ?? { x: anchor.x, y: anchor.y, r: 16 };
  const sheet = {
    width: `${round((vw / SPAN) * 100)}%`,
    height: `${round((vh / SPAN) * 100)}%`,
    left: `${round(((vx - x0) / SPAN) * 100)}%`,
    top: `${round(((vy - y0) / SPAN) * 100)}%`,
  } as CSSProperties;
  return (
    <span className={[styles.twin, className].filter(Boolean).join(" ")} data-phrase="" aria-hidden="true">
      <span className={styles.sheet} style={sheet}>
        {layers.map((layer) =>
          (["day", "evening"] as const).map((theme) => (
            <Image
              key={`${layer}-${theme}`}
              src={paperLayerSrc(layer, theme)}
              width={vw}
              height={vh}
              alt=""
              unoptimized
              loading="lazy"
              className={`for-${theme}`}
            />
          )),
        )}
      </span>
      <i
        className={glow.glow}
        style={
          {
            "--x": `${round(((lit.x - x0) / SPAN) * 100)}%`,
            "--y": `${round(((lit.y - y0) / SPAN) * 100)}%`,
            "--r": `${round(((lit.r * 1.3) / SPAN) * 6)}rem`,
          } as CSSProperties
        }
      />
    </span>
  );
}
