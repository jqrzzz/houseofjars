/**
 * The House of Jars mark: a squat stone jar after the Iron Age jars of the
 * Plain of Jars. Its thick rim is a ledge carved from the same block (not a
 * lid), with one carved line under it. The carved line is a hole (opposite
 * winding), so the mark works as a mask.
 *
 * public/brand/jar.svg and app/icon.svg repeat this path; a unit test keeps
 * them in sync.
 */
/** The body and its rim. */
export const JAR_BODY =
  "M15 14.2Q32 12.4 49 14.2L49 19.4Q49 20.6 47.9 20.8L46.9 21" +
  "C52.4 24.9 55.6 30.9 55.6 38.6C55.6 47.4 53.4 53.4 49.2 56Q32 58.9 14.8 56.1" +
  "C10.6 53.3 8.6 47 8.6 38.4C8.6 30.8 11.8 24.8 17.1 21L16.1 20.8Q15 20.6 15 19.4Z";

/** The carved line under the rim, wound the other way so it cuts through the body. */
export const JAR_CARVE = "M47.4 24.4Q32 25.6 16.6 24.4A0.9 0.9 0 0 0 16.4 26.2Q32 27.6 47.6 26.2A0.9 0.9 0 0 0 47.4 24.4Z";

export const JAR_PATH = JAR_BODY + JAR_CARVE;

/** Square view box that centres the jar optically. */
export const JAR_VIEWBOX = "7 9 50 50";

/** Tight view box around the jar (for inline marks next to text). */
export const JAR_VIEWBOX_TIGHT = "8 10.5 48 48";
