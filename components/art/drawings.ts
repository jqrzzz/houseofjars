/**
 * The illustration set in public/art/: drawings that stand in for
 * photographs, in one style, cut paper with an ink silhouette (docs/DESIGN.md
 * §2.1): flat paper planes, a card edge on the large ones, deckled straight
 * runs, back planes mixed toward the far paper, a fibre texture and stepped
 * halos for light. Each file carries its own night colours, because an image
 * cannot read the page's CSS; its Evening twin in public/art/evening/ has them
 * always on (scripts/art-evening.ts), so the site's own theme can choose.
 * Sizes are the files' own.
 */
export const drawings = {
  pod: { src: "/art/pod.svg", evening: "/art/evening/pod.svg", width: 480, height: 360 },
  /** The pod without the callout dots that PodDiagram numbers, for wherever nothing numbers them. */
  "pod-plain": { src: "/art/pod-plain.svg", evening: "/art/evening/pod-plain.svg", width: 480, height: 360 },
  cafe: { src: "/art/cafe.svg", evening: "/art/evening/cafe.svg", width: 480, height: 360 },
  shower: { src: "/art/shower.svg", evening: "/art/evening/shower.svg", width: 480, height: 360 },
  luggage: { src: "/art/luggage.svg", evening: "/art/evening/luggage.svg", width: 480, height: 360 },
  door: { src: "/art/door.svg", evening: "/art/evening/door.svg", width: 360, height: 420 },
  plain: { src: "/art/plain.svg", evening: "/art/evening/plain.svg", width: 480, height: 360 },
  house: { src: "/art/house.svg", evening: "/art/evening/house.svg", width: 616, height: 356 },
  tuktuk: { src: "/art/tuktuk.svg", evening: "/art/evening/tuktuk.svg", width: 440, height: 226 },
  riverside: { src: "/art/riverside.svg", evening: "/art/evening/riverside.svg", width: 480, height: 360 },
  train: { src: "/art/train.svg", evening: "/art/evening/train.svg", width: 480, height: 360 },
  bus: { src: "/art/bus.svg", evening: "/art/evening/bus.svg", width: 480, height: 360 },
  arch: { src: "/art/arch.svg", evening: "/art/evening/arch.svg", width: 480, height: 360 },
  bridge: { src: "/art/bridge.svg", evening: "/art/evening/bridge.svg", width: 480, height: 360 },
  /*
   * The house's photographs, redrawn: each fills the frame its photograph
   * filled (content/photos.ts), so each is drawn at that frame's shape.
   */
  "dorm-corridor": { src: "/art/dorm-corridor.svg", evening: "/art/evening/dorm-corridor.svg", width: 400, height: 600 },
  "dorm-fan": { src: "/art/dorm-fan.svg", evening: "/art/evening/dorm-fan.svg", width: 480, height: 600 },
  "pod-curtain": { src: "/art/pod-curtain.svg", evening: "/art/evening/pod-curtain.svg", width: 480, height: 600 },
  "pod-ladder": { src: "/art/pod-ladder.svg", evening: "/art/evening/pod-ladder.svg", width: 480, height: 600 },
  locker: { src: "/art/locker.svg", evening: "/art/evening/locker.svg", width: 480, height: 600 },
  entrance: { src: "/art/entrance.svg", evening: "/art/evening/entrance.svg", width: 480, height: 600 },
  "wall-of-jars": { src: "/art/wall-of-jars.svg", evening: "/art/evening/wall-of-jars.svg", width: 480, height: 600 },
  "stairs-jar": { src: "/art/stairs-jar.svg", evening: "/art/evening/stairs-jar.svg", width: 480, height: 600 },
  "wall-lamp": { src: "/art/wall-lamp.svg", evening: "/art/evening/wall-lamp.svg", width: 480, height: 600 },
} as const;

export type DrawingName = keyof typeof drawings;
