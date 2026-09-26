/**
 * Three jars standing on the horizon, leaning a little as the real jars do.
 * Shared by the home hero and the Open Graph images so both draw the same
 * scene. Units are the cluster's view box; jars are drawn with JAR_PATH.
 */
export const CLUSTER = {
  width: 480,
  /** The horizon is the bottom edge of the view box. */
  height: 280,
  /**
   * Back to front. `tone` picks --jar-1 (light) to --jar-3 (dark); `stretch`
   * makes a jar a little taller or squatter than the mark, as no two are alike.
   */
  jars: [
    { x: 116, scale: 2.7, stretch: 1.06, rotate: -5, tone: 1 },
    { x: 402, scale: 2.1, stretch: 0.9, rotate: 4, tone: 3 },
    { x: 262, scale: 4, stretch: 0.97, rotate: 1.5, tone: 2 },
  ],
} as const;

export type ClusterJar = (typeof CLUSTER.jars)[number];

/** The bottom centre of JAR_PATH, a hair above its lowest point so jars sit into the ground. */
const JAR_FOOT = { x: 31.9, y: 57.2 };

/** Stands a jar on the horizon: pivot at its foot, then lean, then scale. */
export function jarTransform(jar: ClusterJar): string {
  return `translate(${jar.x} ${CLUSTER.height}) rotate(${jar.rotate}) scale(${jar.scale} ${jar.scale * jar.stretch}) translate(${-JAR_FOOT.x} ${-JAR_FOOT.y})`;
}
