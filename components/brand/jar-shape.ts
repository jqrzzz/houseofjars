/**
 * The House of Jars mark: a squat stone jar with a thick rolled lip and one
 * carved line under it, after the Iron Age jars of the Plain of Jars.
 * The carved line is a hole (opposite winding), so the mark works as a mask.
 *
 * public/brand/jar.svg and app/icon.svg repeat this path; a unit test keeps
 * them in sync.
 */
export const JAR_PATH =
  "M17.8 19.2C12 22 8.9 28.6 8.6 36.6C8.3 45.2 10.4 51.8 14.6 55C21.6 58.1 42 58.3 49.6 55.4C53.9 52.6 55.8 45.6 55.6 37.2C55.4 28.8 52.4 22.2 46.4 19Z" +
  "M19 11.2A4.3 4.3 0 0 0 18.9 19.8L45.9 19.4A4.3 4.3 0 0 0 45.8 10.8Z" +
  "M16.8 23.5Q32 26.6 47.4 23.1A1 1 0 0 1 47.8 25.1Q32 29 16.4 25.4A1 1 0 0 1 16.8 23.5Z";

/** Square view box that centres the jar optically. */
export const JAR_VIEWBOX = "7 9 50 50";

/** Tight view box around the jar (for inline marks next to text). */
export const JAR_VIEWBOX_TIGHT = "8 10.5 48 48";
