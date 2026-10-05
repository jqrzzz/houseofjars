"use client";

import { stageKeyframes, type StageClock } from "@/lib/stage/acts";

/**
 * A scroll stage's keyframes (lib/stage/acts stageKeyframes), written where
 * the stage renders and hoisted into the head. Worked out here from the
 * walk's few numbers, so the page carries the numbers once rather than the
 * whole stylesheet twice (in the HTML and again in its React payload).
 */
export function StageKeyframes({ p, clock }: { p: string; clock: StageClock }) {
  return (
    <style href={`paper-stage-${p}`} precedence="default">
      {stageKeyframes(p, clock)}
    </style>
  );
}
