/**
 * The House of Jars mark: the arch from the house's logo
 * (photos/brand/logo-arch-orange.jpg), traced on its own grid of 12 x 18
 * units (a 600 x 900 drawing, 50 per unit): two pillars of 3 units, two gaps
 * of 1, a centre column of 4 cut into three blocks, and an arched top 5 units
 * high. Each block is its own shape, so the mark works as a mask.
 *
 * brand/logos/*.svg, public/brand/mark.svg and app/icon.svg repeat this path;
 * a unit test keeps them in sync.
 */
export const MARK_PATH =
  "M0 900V250C0 145.46 55.79 66.39 150 27.25V900ZM200 275V11.13C230.55 3.83 264.02 0 300 0C335.98 0 369.45 3.83 400 11.13V275ZM200 325H400V575H200ZM200 625H400V900H200ZM450 900V27.25C544.21 66.39 600 145.46 600 250V900Z";

export const MARK_VIEWBOX = "0 0 600 900";

/** The mark's five blocks, in drawing order: left pillar, the centre's top, middle and bottom blocks, right pillar. */
export const MARK_PARTS: readonly string[] = MARK_PATH.match(/M[^M]+/g) ?? [];

/**
 * The mark's outline (the arch over its pillars) in a unit box, for framing a
 * photograph like a doorway (clipPathUnits="objectBoundingBox").
 */
export const ARCH_OUTLINE = "M0 1V0.27778C0 0.10903 0.19625 0 0.5 0C0.80375 0 1 0.10903 1 0.27778V1Z";
