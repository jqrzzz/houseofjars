import type { Photo } from "@/components/PhotoFrame";
import type { DrawingName } from "@/components/art/drawings";

/**
 * The house's own photographs: web copies in public/photos/ of the originals
 * in photos/ (see photos/README.md). Three are cropped above the name and
 * mark printed on the originals, so no text sits in a photo. Alt text says
 * what a guest would see; captions say it briefly.
 *
 * The site shows each one as its drawing (public/art/, drawn from the
 * photograph in the house's paper style), and the photographs themselves only
 * on the booking page, as the booking sites do before you pay (docs/DESIGN.md
 * §10.5). The drawing keeps the photograph's caption and has its own alt text.
 */
export interface HousePhoto extends Photo {
  readonly src: string;
  readonly caption: string;
  readonly drawing: DrawingName;
  readonly drawnAlt: string;
  /** The web copy's size in pixels (photos.test.ts reads it from the file), so frames fetch enough of it. */
  readonly size: readonly [width: number, height: number];
  /**
   * Where in the house it was taken: an area of the house model (lib/house),
   * set only where the model confirms the area. The house drawings mark the
   * spot with a numbered dot.
   */
  readonly place?: { readonly area: string };
}

const photo = (
  file: string,
  size: readonly [width: number, height: number],
  alt: string,
  caption: string,
  { drawing, drawnAlt, focus, area }: { drawing: DrawingName; drawnAlt: string; focus?: string; area?: string },
): HousePhoto => ({
  src: `/photos/${file}`,
  alt,
  caption,
  size,
  drawing,
  drawnAlt,
  ...(focus ? { focus } : {}),
  ...(area ? { place: { area } } : {}),
});

export const photos = {
  dormCorridor: photo(
    "dorm-corridor-pods-and-window.jpg",
    [1280, 853],
    "A dorm at House of Jars: curtained wooden pod beds on both sides of a tiled aisle, with a window at the end",
    "The dorms: curtained pods in warm teak.",
    {
      drawing: "dorm-corridor",
      drawnAlt: "Drawing of a dorm at House of Jars: teak pod beds with ladders and curtains on both sides of a tiled aisle, one pod lit by its reading light, and two windows at the end",
      area: "dorm-h",
    },
  ),
  dormFan: photo(
    "dorm-corridor-ceiling-fan.jpg",
    [1280, 853],
    "A dorm aisle between two rows of wooden pods, lit by reading lamps, with a ceiling fan and an air conditioner",
    "Every pod has a reading light, and the dorms are air-conditioned.",
    {
      drawing: "dorm-fan",
      drawnAlt: "Drawing of a dorm aisle between two rows of teak pods, two bunks high with ladders and drawn-back curtains, under a ceiling fan, with an air conditioner above two windows at the far end",
      area: "dorm-h",
    },
  ),
  podCurtain: photo(
    "pod-bed-with-curtain.jpg",
    [2000, 1600],
    "A lower pod bed, made with white sheets and a pillow, its patterned curtain drawn back",
    "A lower pod, curtain open.",
    {
      drawing: "pod-curtain",
      drawnAlt: "Drawing of a lower pod in teak, made with white sheets and a pillow, its reading light on and its striped curtain drawn back",
      focus: "75% 50%",
      area: "dorm-h",
    },
  ),
  podLadder: photo(
    "pod-bed-with-ladder.jpg",
    [2000, 1600],
    "A lower pod bed in teak with its reading lights on and the ladder to the upper pod beside it",
    "A lower pod with the ladder to the one above.",
    {
      drawing: "pod-ladder",
      drawnAlt: "Drawing of a teak lower pod with its reading light glowing over a white pillow and duvet, beside a locker and the ladder up to the next pod",
      // The ladder stands at the photograph's left edge: keep it in a narrow frame.
      focus: "0% 50%",
      area: "dorm-h",
    },
  ),
  locker: photo("locker-door-h09.jpg", [1200, 1600], "A teak locker door numbered H09", "Each bed has a locker or safe.", {
    drawing: "locker",
    drawnAlt: "Drawing of a teak locker door with a round number plate and a padlock eye, between striped pod curtains",
    area: "dorm-h",
  }),
  entrance: photo(
    "front-entrance-sign-night.jpg",
    [1280, 853],
    "The wooden House of Jars hostel sign hanging over the entrance, lit at night",
    // The drawing shows the front by Day and lit at night by Evening.
    "The front of the house.",
    {
      drawing: "entrance",
      drawnAlt: "Drawing of the wooden House of Jars sign, with the house's arch mark and its name in Lao and English, hanging over the glazed teak shopfront",
      area: "terrace",
    },
  ),
  wallOfJars: photo(
    "staircase-wall-of-jars.jpg",
    [2000, 1600],
    "The staircase beside a wall of square niches, each holding a clay jar, lit by a wall lamp",
    "The wall of jars on the stairs.",
    {
      drawing: "wall-of-jars",
      drawnAlt: "Drawing of the staircase beside a wall of 28 square niches, 27 of them holding a clay jar, with a wall lamp glowing on the side wall",
      focus: "80% 50%",
    },
  ),
  stairsJar: photo(
    "stairs-floor-1-to-2-clay-jar.jpg",
    [1280, 853],
    "A clay jar on the landing beside the tiled stairs up to the next floor",
    "A jar on the landing.",
    {
      drawing: "stairs-jar",
      drawnAlt: "Drawing of a weathered clay jar on the landing, beside the tiled stairs up to the next floor and a lattice screen",
      focus: "15% 50%",
      area: "landing-1",
    },
  ),
  lamp: photo("wall-lamp.jpg", [1200, 1600], "A wall lamp with a glowing stone shade on a warm wall", "The lamps light the house at night.", {
    drawing: "wall-lamp",
    drawnAlt: "Drawing of a wall lamp, a cylinder of honey-veined stone on a black bracket, glowing on a warm wall, with a second lamp further along",
  }),
} as const;
