"use client";

import Image from "next/image";

/**
 * One layer of a paper stage, as Day and Evening sheets: lazy images the size
 * of the stage's viewBox, of which the hidden theme's is never fetched (the
 * global .for-day and .for-evening rules). With `alt`, each names the other
 * theme's sheet for StageLife to fetch when the browser is idle.
 */
export function LayerTwins({ day, evening, width, height, alt }: { day: string; evening: string; width: number; height: number; alt?: boolean }) {
  return (
    <>
      <Image src={day} data-alt-src={alt ? evening : undefined} width={width} height={height} alt="" unoptimized loading="lazy" className="for-day" />
      <Image src={evening} data-alt-src={alt ? day : undefined} width={width} height={height} alt="" unoptimized loading="lazy" className="for-evening" />
    </>
  );
}
