"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./WalkPicker.module.css";

/** public/house/walks.json, as lib/house/paper's walksJson() writes it (the parts used here). */
interface Walks {
  readonly viewBox: readonly [number, number, number, number];
  readonly routes: Readonly<
    Record<
      string,
      {
        readonly floors: Readonly<Record<string, string>>;
        readonly link: string;
        readonly stops: readonly { readonly floor: string; readonly x: number; readonly y: number; readonly at: number }[];
        readonly shares: Readonly<Record<string, readonly [number, number]>>;
      }
    >
  >;
}

let walks: Promise<Walks> | undefined;

/** Fetches the walks once, the first time a guest reaches for one; a failed fetch may be tried again. */
function loadWalks(): Promise<Walks> {
  walks ??= fetch("/house/walks.json")
    .then((response) => {
      if (!response.ok) throw new Error(`walks.json: ${response.status}`);
      return response.json() as Promise<Walks>;
    })
    .catch((error: unknown) => {
      walks = undefined;
      throw error;
    });
  return walks;
}

const pct = (v: number, origin: number, size: number) => `${Math.round(((v - origin) / size) * 1e5) / 1e3}%`;

/** Puts a walk on the stage: its thread per floor, the stairs, the stop rings and the bead, then replays it (2.4 s, PaperStage.module.css). */
function stage(figure: HTMLElement, data: Walks, route: string) {
  const walk = data.routes[route];
  if (!walk) return;
  const [vx, vy, vw, vh] = data.viewBox;
  const ends = Object.entries(walk.shares).sort((a, b) => a[1][1] - b[1][1]);
  const last = ends[ends.length - 1]?.[0];
  for (const holder of figure.querySelectorAll<HTMLElement>("[data-thread]")) {
    const floor = holder.dataset.thread ?? "";
    const share = walk.shares[floor];
    // The thread on its paper casing, as PaperStage draws it.
    holder.innerHTML = (walk.floors[floor] ?? "").replace(
      /<path id="[^"]*" class="th" pathLength="1" d="([^"]+)"\/>/,
      '<path class="thc" pathLength="1" d="$1"/>$&',
    );
    holder.style.setProperty("--a", String(share?.[0] ?? 0));
    holder.style.setProperty("--b", String(share?.[1] ?? 1));
  }
  const link = figure.querySelector<HTMLElement>("[data-link]");
  if (link) link.innerHTML = walk.link;
  for (const rings of figure.querySelectorAll<HTMLElement>("[data-rings]")) {
    rings.innerHTML = walk.stops
      .map((s, k) =>
        s.floor === rings.dataset.rings ? `<span data-ring="${k}" style="--x:${pct(s.x, vx, vw)};--y:${pct(s.y, vy, vh)};--at:${s.at}"></span>` : "",
      )
      .join("");
  }
  for (const bead of figure.querySelectorAll<SVGGElement>("[data-bead]")) {
    const floor = bead.dataset.bead ?? "";
    const d = /class="th" pathLength="1" d="([^"]+)"/.exec(walk.floors[floor] ?? "")?.[1];
    const share = walk.shares[floor];
    bead.style.offsetPath = d ? `path("${d}")` : "none";
    bead.style.display = d ? "" : "none";
    bead.style.setProperty("--a", String(share?.[0] ?? 0));
    bead.style.setProperty("--b", String(share?.[1] ?? 1));
    bead.toggleAttribute("data-last", floor === last);
  }
  // Start the replay afresh, even for the bead, which stays the same element.
  figure.removeAttribute("data-replay");
  void figure.getBoundingClientRect();
  figure.setAttribute("data-replay", route);
}

/**
 * The walk chips beside a paper stage (docs/DESIGN.md §5.2): a radio group of
 * the house's walks. Choosing one fetches /house/walks.json (once), swaps the
 * stage's thread for that walk and replays it, and opens the walk's own list
 * of stops (a <details data-walk> inside the element with id `list`). Opening
 * a walk in that list chooses it too. Without JavaScript the chips stay
 * hidden and the list holds every walk.
 */
export function WalkPicker({
  stage: stageId,
  list,
  chips,
  initial,
}: {
  stage: string;
  list: string;
  chips: readonly { route: string; label: string }[];
  initial: string;
}) {
  const [chosen, setChosen] = useState(initial);
  const current = useRef(initial);

  const choose = (route: string, open: boolean) => {
    if (route === current.current) return;
    current.current = route;
    setChosen(route);
    if (open) {
      const details = document.getElementById(list)?.querySelector<HTMLDetailsElement>(`details[data-walk="${CSS.escape(route)}"]`);
      if (details) {
        details.open = true;
        details.scrollIntoView({ block: "nearest" });
      }
    }
    loadWalks().then(
      (data) => {
        const figure = document.getElementById(stageId);
        if (figure && current.current === route) stage(figure, data, route);
      },
      // The list beside the stage still tells the walk.
      () => undefined,
    );
  };
  const chooseRef = useRef(choose);
  useEffect(() => {
    chooseRef.current = choose;
  });

  useEffect(() => {
    const element = document.getElementById(list);
    if (!element) return;
    const onToggle = (event: Event) => {
      const details = event.target as HTMLDetailsElement;
      if (details.open && details.dataset.walk) chooseRef.current(details.dataset.walk, false);
    };
    // toggle does not bubble: listen on the way down.
    element.addEventListener("toggle", onToggle, true);
    return () => element.removeEventListener("toggle", onToggle, true);
  }, [list]);

  return (
    <fieldset
      className={styles.chips}
      onPointerEnter={() => void loadWalks().catch(() => undefined)}
      onFocus={() => void loadWalks().catch(() => undefined)}
    >
      <legend className={styles.legend}>Follow a walk</legend>
      {chips.map((chip) => (
        <label key={chip.route} className={styles.chip}>
          <input type="radio" name={`${stageId}-walk`} value={chip.route} checked={chosen === chip.route} onChange={() => choose(chip.route, true)} />
          <span>{chip.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
