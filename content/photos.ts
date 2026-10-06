import type { Photo } from "@/components/PhotoFrame";

/**
 * The house's own photographs on the website: web copies in public/photos/
 * of the originals in photos/ (see photos/README.md). Three are cropped above
 * the name and mark printed on the originals, so no text sits in a photo.
 * Alt text says what a guest would see; captions say it briefly.
 */
export interface HousePhoto extends Photo {
  readonly src: string;
  readonly caption: string;
  /** The web copy's size in pixels (photos.test.ts reads it from the file), so frames fetch enough of it. */
  readonly size: readonly [width: number, height: number];
  /**
   * Where in the house it was taken: an area of the house model (lib/house),
   * set only where the model confirms the area. The house drawings mark the
   * spot with a numbered camera dot and crop a paper twin of it.
   */
  readonly place?: { readonly area: string };
}

const photo = (
  file: string,
  size: readonly [width: number, height: number],
  alt: string,
  caption: string,
  { focus, area }: { focus?: string; area?: string } = {},
): HousePhoto => ({
  src: `/photos/${file}`,
  alt,
  caption,
  size,
  ...(focus ? { focus } : {}),
  ...(area ? { place: { area } } : {}),
});

export const photos = {
  dormCorridor: photo(
    "dorm-corridor-pods-and-window.jpg",
    [1280, 853],
    "A dorm at House of Jars: curtained wooden pod beds on both sides of a tiled aisle, with a window at the end",
    "The dorms: curtained pods in warm teak.",
    { area: "dorm-h" },
  ),
  dormFan: photo(
    "dorm-corridor-ceiling-fan.jpg",
    [1280, 853],
    "A dorm aisle between two rows of wooden pods, lit by reading lamps, with a ceiling fan and an air conditioner",
    "Every pod has a reading light, and the dorms are air-conditioned.",
    { area: "dorm-h" },
  ),
  podCurtain: photo(
    "pod-bed-with-curtain.jpg",
    [2000, 1600],
    "A lower pod bed, made with white sheets and a pillow, its patterned curtain drawn back",
    "A lower pod, curtain open.",
    { focus: "75% 50%", area: "dorm-h" },
  ),
  podLadder: photo(
    "pod-bed-with-ladder.jpg",
    [2000, 1600],
    "A lower pod bed in teak with its reading lights on and the ladder to the upper pod beside it",
    "A lower pod with the ladder to the one above.",
    // The ladder stands at the photograph's left edge: keep it in a narrow frame.
    { focus: "0% 50%", area: "dorm-h" },
  ),
  locker: photo("locker-door-h09.jpg", [1200, 1600], "A teak locker door numbered H09", "Each bed has a locker or safe.", { area: "dorm-h" }),
  entrance: photo(
    "front-entrance-sign-night.jpg",
    [1280, 853],
    "The wooden House of Jars hostel sign hanging over the entrance, lit at night",
    "The front of the house, at night.",
    { area: "terrace" },
  ),
  wallOfJars: photo(
    "staircase-wall-of-jars.jpg",
    [2000, 1600],
    "The staircase beside a wall of square niches, each holding a clay jar, lit by a wall lamp",
    "The wall of jars on the stairs.",
    { focus: "80% 50%" },
  ),
  stairsJar: photo(
    "stairs-floor-1-to-2-clay-jar.jpg",
    [1280, 853],
    "A clay jar on the landing beside the tiled stairs up to the next floor",
    "A jar on the landing.",
    { focus: "15% 50%", area: "landing-1" },
  ),
  lamp: photo("wall-lamp.jpg", [1200, 1600], "A wall lamp with a glowing stone shade on a warm wall", "The lamps light the house at night."),
} as const;
