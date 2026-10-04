/**
 * The illustration set in public/art/: drawings that stand in for
 * photographs, in one style (ink lines that keep their weight, flat fills,
 * jar-orange accents). Each file carries its own night colours, because an
 * image cannot read the page's CSS. Sizes are the files' own.
 */
export const drawings = {
  pod: { src: "/art/pod.svg", width: 480, height: 360 },
  cafe: { src: "/art/cafe.svg", width: 480, height: 360 },
  shower: { src: "/art/shower.svg", width: 480, height: 360 },
  luggage: { src: "/art/luggage.svg", width: 480, height: 360 },
  door: { src: "/art/door.svg", width: 360, height: 420 },
  plain: { src: "/art/plain.svg", width: 480, height: 360 },
  house: { src: "/art/house.svg", width: 616, height: 356 },
  tuktuk: { src: "/art/tuktuk.svg", width: 440, height: 226 },
  riverside: { src: "/art/riverside.svg", width: 480, height: 360 },
  train: { src: "/art/train.svg", width: 480, height: 360 },
  bus: { src: "/art/bus.svg", width: 480, height: 360 },
  arch: { src: "/art/arch.svg", width: 480, height: 360 },
  bridge: { src: "/art/bridge.svg", width: 480, height: 360 },
} as const;

export type DrawingName = keyof typeof drawings;
