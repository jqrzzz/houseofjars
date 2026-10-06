import { PhotoFrame } from "@/components/PhotoFrame";
import { photos, type HousePhoto } from "@/content/photos";
import styles from "./RealPhotos.module.css";

/** The beds first, as a booking site shows the room, then the way up and the front. */
const ORDER = ["dormCorridor", "podCurtain", "podLadder", "dormFan", "locker", "wallOfJars", "stairsJar", "lamp", "entrance"] as const;

/**
 * The house's real photographs, on the booking page only (docs/DESIGN.md
 * §10.5): everywhere else the site shows them drawn. Each is shown whole, at
 * its own shape, so nothing is cropped away before a guest books.
 */
export function RealPhotos() {
  const list: readonly HousePhoto[] = ORDER.map((key) => photos[key]);
  return (
    <ul role="list" className={styles.grid}>
      {list.map((photo) => (
        <li key={photo.src}>
          <PhotoFrame
            real
            caption={photo.caption}
            photo={photo}
            drawing={photo.drawing}
            aspect={`${photo.size[0]} / ${photo.size[1]}`}
            sizes="(min-width: 60rem) 18rem, (min-width: 40rem) 45vw, 90vw"
          />
        </li>
      ))}
    </ul>
  );
}
