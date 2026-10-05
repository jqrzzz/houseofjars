"use client";

import type { CSSProperties } from "react";
import glow from "@/components/art/glow.module.css";
import { lightName } from "@/lib/stage/acts";

/** One light on a floor: where (percent of the stage), its radius (percent of its width), its walking order and its share of the walk. */
export type StageLight = readonly [x: number, y: number, r: number, order: number, share: number];

/**
 * A floor's lights as glow discs (glow.module.css), from a few numbers each:
 * the page carries the numbers, not the markup twice. On a scroll stage each
 * disc comes on as the walk reaches it (its keyframes are named by
 * lightName); on a static one they light in walking order.
 */
export function StageLights({ p, lights, scroll }: { p: string; lights: readonly StageLight[]; scroll: boolean }) {
  return lights.map(([x, y, r, order, share]) => (
    <i
      key={`${x} ${y}`}
      className={glow.glow}
      style={{ "--x": `${x}%`, "--y": `${y}%`, "--r": `${r}%`, "--i": order, "--at": share, "--kf": scroll ? lightName(p, share) : "none" } as CSSProperties}
    />
  ));
}
