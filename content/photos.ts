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
}

const photo = (file: string, alt: string, caption: string, focus?: string): HousePhoto => ({
  src: `/photos/${file}`,
  alt,
  caption,
  ...(focus ? { focus } : {}),
});

export const photos = {
  dormCorridor: photo(
    "dorm-corridor-pods-and-window.jpg",
    "A dorm at House of Jars: curtained wooden pod beds on both sides of a tiled aisle, with a window at the end",
    "The dorms: curtained pods in warm teak.",
  ),
  dormFan: photo(
    "dorm-corridor-ceiling-fan.jpg",
    "A dorm aisle between two rows of wooden pods, lit by reading lamps, with a ceiling fan and an air conditioner",
    "Every pod has a reading light, and the dorms are air-conditioned.",
  ),
  podCurtain: photo(
    "pod-bed-with-curtain.jpg",
    "A lower pod bed, made with white sheets and a pillow, its patterned curtain drawn back",
    "A lower pod, curtain open.",
    "75% 50%",
  ),
  podLadder: photo(
    "pod-bed-with-ladder.jpg",
    "A lower pod bed in teak with its reading lights on and the ladder to the upper pod beside it",
    "A lower pod with the ladder to the one above.",
  ),
  locker: photo("locker-door-h09.jpg", "A teak locker door numbered H09", "Each bed has a locker or safe."),
  entrance: photo(
    "front-entrance-sign-night.jpg",
    "The wooden House of Jars hostel sign hanging over the entrance, lit at night",
    "The front of the house, at night.",
  ),
  wallOfJars: photo(
    "staircase-wall-of-jars.jpg",
    "The staircase beside a wall of square niches, each holding a clay jar, lit by a wall lamp",
    "The wall of jars on the stairs.",
    "80% 50%",
  ),
  stairsJar: photo(
    "stairs-floor-1-to-2-clay-jar.jpg",
    "A clay jar on the landing beside the tiled stairs up to the next floor",
    "A jar on the landing.",
    "15% 50%",
  ),
  lamp: photo("wall-lamp.jpg", "A wall lamp with a glowing stone shade on a warm wall", "The lamps light the house at night."),
} as const;
