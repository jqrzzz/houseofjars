import { PaperStage, type StageHotspot } from "@/components/stage/PaperStage";
import { cameraSpots, type PhotoKey } from "@/components/stage/places";
import { StageDirector } from "@/components/stage/StageDirector";
import { WalkPicker } from "@/components/stage/WalkPicker";
import { isFirm } from "@/content/certainty";
import { amenities, bathrooms, beds, breakfast, building, staff } from "@/content/stay";
import { joinList, lowerFirst } from "@/content/text";
import { houseOfJars } from "@/lib/house/house-of-jars";
import { renderThreadLayer } from "@/lib/house/paper";
import styles from "./HouseStage.module.css";

const ID = "house-stage";

/** The walks a guest can follow, as chips: the team's round only while the house confirms how often it is walked. */
const WALKS: readonly { route: string; label: string; firm?: boolean }[] = [
  { route: "arrival", label: "Arriving" },
  { route: "breakfast", label: "Breakfast" },
  { route: "leaving-early", label: "Leaving early" },
  { route: "smoke", label: "A smoke" },
  { route: "water", label: "Water" },
  { route: "bathroom-women", label: "Bathroom" },
  { route: "housekeeping-round", label: "The team’s round", firm: isFirm(staff.housekeepingRound) },
];

/*
 * The notes on the house, each where it belongs in the model; every line comes
 * from the content layer, and what guests say is credited to them.
 */
const NOTES: readonly StageHotspot[] = [
  {
    id: "pods",
    title: "Pods",
    text: `Every bed is a pod, with ${joinList(beds.perBed.value.map((item) => `a ${item.toLowerCase()}`))}.`,
    anchor: "fx-pod-H11",
  },
  { id: "air", title: "Air-conditioning", text: `${amenities[0].value.name}, guests say.`, anchor: "fx-ac-h" },
  {
    id: "bathrooms",
    title: "Bathrooms",
    text: `Shared, with hot showers; guests say they are ${lowerFirst(bathrooms.cleaning.value)}.`,
    anchor: "area-bath-women",
  },
  { id: "team", title: "The team", text: `${staff.hours.value.summary}, speaking ${joinList(staff.languages.value)}.`, anchor: "area-desk" },
  {
    id: "cafe",
    title: "Café and breakfast",
    text: `${building.cafe.value}. Breakfast is included: ${joinList(breakfast.items.value.map((item) => item.toLowerCase()))}.`,
    anchor: "area-cafe",
  },
];

/** The photos of "A look inside" that have a place in the house, in the gallery's order: their camera dots carry these numbers. */
export const HOUSE_PHOTOS: readonly PhotoKey[] = ["dormFan", "podCurtain", "podLadder", "stairsJar"];

/**
 * The house in section (docs/DESIGN.md §5.2), for /the-house#section: all
 * three floors in paper, Floor 2 dimmed. On wide screens the floors lift
 * apart as the reader scrolls through a 160svh section and the arrival walk
 * draws itself; on phones the stage is a still, lifted. Chips choose a walk
 * (WalkPicker), and each walk's stops are listed beside the stage; without
 * JavaScript every walk is listed, in <details>. Notes on the house open
 * where they belong, and numbered camera dots link to the photos taken there.
 */
export function HouseStage({ photos = HOUSE_PHOTOS }: { photos?: readonly PhotoKey[] }) {
  const walks = WALKS.filter((w) => w.firm !== false).map((w) => {
    const route = houseOfJars.routes.find((r) => r.id === w.route);
    const thread = renderThreadLayer(w.route, { idPrefix: `${ID}-${w.route}-` });
    const place = route?.name.split(": ")[1];
    return { ...w, place: place ? place[0]!.toUpperCase() + place.slice(1) : undefined, when: route?.when, stops: thread.stops };
  });
  const last = walks[0]!.stops.length - 1;
  return (
    <div className={styles.house}>
      <div className={styles.sticky}>
        <PaperStage
          id={ID}
          floors={["ground", "floor1", "floor2"]}
          route="arrival"
          lift="scroll"
          hotspots={NOTES}
          spots={cameraSpots(photos)}
          caption="Drawn from our walk through the house: positions are approximate."
          note="Floor 2 is drawn as a copy of Floor 1: not yet photographed."
        />
        <div className={styles.side}>
          <WalkPicker stage={ID} list={`${ID}-walks`} chips={walks.map(({ route, label }) => ({ route, label }))} initial="arrival" />
          <div id={`${ID}-walks`} className={styles.walks}>
            {walks.map((walk, index) => (
              <details key={walk.route} name={`${ID}-walks`} data-walk={walk.route} open={index === 0} className={styles.walk}>
                <summary>
                  <span className={styles.name}>{walk.label}</span>
                  {walk.place || walk.when ? <span className={styles.when}>{[walk.place, walk.when].filter(Boolean).join(" · ")}</span> : null}
                </summary>
                <ol className={styles.stops}>
                  {walk.stops.map((stop, k) => (
                    <li key={k}>
                      <strong>{stop.label}.</strong> {stop.does}
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </div>
      </div>
      {/* Where the acts fall, for browsers without scroll timelines (StageDirector); hidden on phones, where the stage is a still. */}
      <div id={`${ID}-steps`} className={styles.steps} aria-hidden="true">
        <span data-act="b" />
        <span data-act="c" data-stop={last} />
      </div>
      <StageDirector stage={ID} steps={`${ID}-steps`} />
    </div>
  );
}
