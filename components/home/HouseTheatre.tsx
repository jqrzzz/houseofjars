import { PaperStage } from "@/components/stage/PaperStage";
import { StageDirector } from "@/components/stage/StageDirector";
import { walkStops } from "@/components/stage/places";
import { beds, building, times } from "@/content/stay";
import { houseOfJars } from "@/lib/house/house-of-jars";
import { pages } from "@/lib/site";
import { TheatreWords } from "./TheatreWords";
import styles from "./HouseTheatre.module.css";

const CAPTION = "Drawn from our walk through the house: positions are approximate.";

/** "4, 13 or 14": the bed numbers the house skips. */
const orList = (items: readonly (string | number)[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} or ${items.at(-1)}`;

/**
 * ① The house, as a paper theatre (docs/DESIGN.md §5.1, §4.3, §10.1): a tall
 * section in which the stage stands still (sticky) while the reader scrolls,
 * and its acts play on the section's view timeline (--theatre):
 *   A  the street front opens onto the house (the intro);
 *   B  Floor 1 lifts, and three tags swing in (the same three phrases, listed);
 *   C  the thread walks the arrival route, stop by stop (the five stops, from
 *      the house model's walk, each marked as the thread reaches it);
 *   D  the curtain of pod H01 closes (the closing lines and links).
 * The words beside the stage (TheatreWords) carry every fact, in the server
 * HTML; each step is placed so that it is beside the stage while its act
 * plays (on phones, under the stage, one step at a time). A hidden track of
 * cues tells StageDirector where the acts begin, for browsers without scroll
 * timelines and to mark the current stop. Without JavaScript, under Still and
 * reduced motion, the stage rests on its last frame and the words read
 * straight down.
 */
export function HouseTheatre() {
  const pods = houseOfJars.fixtures.filter((f) => f.floor === "floor1" && f.type === "pod").length;
  const stops = walkStops("arrival", ["ground", "floor1"]);
  const phrases = ["Café and front desk", `Dorm H: ${pods} pods`, "Shoes off at the stairs"] as const;
  const { skipped, why } = beds.numbering.value;
  const quiet = times.quietHours?.value;
  return (
    <section id="the-house-story" aria-labelledby="house-title" className={styles.theatre}>
      <TheatreWords
        lede={`${building.cafe.value}, dorms upstairs.`}
        phrases={phrases}
        stops={stops.map((s) => [s.label, s.does ?? "", s.at] as const)}
        closing={[`There is no pod ${orList(skipped)}, ${why}.`, ...(quiet ? [`Quiet hours ${quiet}.`] : [])]}
        links={[
          [`${pages.house.path}#section`, "The house in section"],
          [`${pages.house.path}#play`, "Practise the walk: play Find your pod"],
        ]}
      />
      <div className={styles.stage}>
        <PaperStage
          id="theatre"
          floors={["ground", "floor1"]}
          route="arrival"
          open
          curtain="pod-H01"
          lift="scroll"
          // Each plate clear of what the story ends on: Dorm H's pin on a pod in its middle row, away from H01 and
          // its curtain; the stairs' plate hung on to the right of its pin, off the climb it names.
          labels={[
            { text: phrases[0], anchor: "area-desk" },
            { text: phrases[1], anchor: "fx-pod-H10" },
            { text: phrases[2], anchor: "area-stairs-ground", side: "start" },
          ]}
          caption={CAPTION}
        />
      </div>
      <StageDirector stage="theatre" steps="theatre-cues" marks="theatre-words" line={0.5} />
    </section>
  );
}
