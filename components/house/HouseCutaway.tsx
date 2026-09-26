import { Drawing } from "@/components/art/Drawing";
import { amenities, bathrooms, beds, breakfast, building, staff } from "@/content/stay";
import { joinList, lowerFirst } from "@/content/text";
import styles from "./HouseCutaway.module.css";

interface Spot {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  /** Where the spot sits on the drawing, in percent of its width and height. */
  readonly x: number;
  readonly y: number;
}

/*
 * Every line comes from the content layer. Where things are in the house
 * (which floor the pods, bathrooms and desk are on) is not confirmed, so the
 * drawing says it is an illustration; see content/open-questions.ts.
 */
const spots: readonly Spot[] = [
  {
    id: "pods",
    title: "Pods",
    text: `Every bed is a pod, with ${joinList(beds.perBed.value.map((item) => `a ${item.toLowerCase()}`))}.`,
    x: 18.8,
    y: 31,
  },
  {
    id: "air",
    title: "Air-conditioning",
    text: `${amenities[0].value.name}, day and night.`,
    x: 40.6,
    y: 16.6,
  },
  {
    id: "bathrooms",
    title: "Bathrooms",
    text: `Shared, with hot showers, ${lowerFirst(bathrooms.cleaning.value)}.`,
    x: 77.3,
    y: 29.2,
  },
  {
    id: "team",
    title: "The team",
    text: `${staff.hours.value.summary}, speaking ${joinList(staff.languages.value)}.`,
    x: 20.5,
    y: 68.5,
  },
  {
    id: "cafe",
    title: "Café and breakfast",
    text: `${building.cafe.value}. Breakfast is included: ${joinList(breakfast.items.value.map((item) => item.toLowerCase()))}.`,
    x: 75,
    y: 68.3,
  },
];

/**
 * The house in section: two floors with the front cut away. Numbered spots
 * open a one-line note (tap, click or keyboard; hover too where supported),
 * and the same notes are listed beside the drawing as an ordinary list.
 */
export function HouseCutaway({ id = "section" }: { id?: string }) {
  return (
    <div className={styles.cutaway}>
      <figure className={styles.figure}>
        <div className={styles.stage}>
          <div className={styles.canvas}>
            <Drawing name="house" className={styles.drawing} sizes="(min-width: 60rem) 60vw, 100vw" />
            {spots.map((spot, index) => (
              <details
                key={spot.id}
                name={`${id}-spots`}
                className={styles.spot}
                data-align={spot.x < 30 ? "start" : spot.x > 70 ? "end" : "center"}
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              >
                <summary className={styles.dot}>
                  <span aria-hidden="true">{index + 1}</span>
                  <span className="visually-hidden">{spot.title}</span>
                </summary>
                <p className={styles.tip}>
                  <strong>{spot.title}.</strong> {spot.text}
                </p>
              </details>
            ))}
          </div>
        </div>
        <figcaption className={styles.caption}>An illustration, not a floor plan.</figcaption>
      </figure>
      <ol className={styles.legend}>
        {spots.map((spot) => (
          <li key={spot.id}>
            <strong>{spot.title}.</strong> {spot.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
