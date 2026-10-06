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

/** The nearest ancestor that scrolls on its own (the column of walks beside a sticky stage), if any. */
function scrollBox(element: HTMLElement): HTMLElement | null {
  for (let e = element.parentElement; e && e !== document.body; e = e.parentElement) {
    const { overflowY } = getComputedStyle(e);
    if (overflowY === "auto" || overflowY === "scroll") return e;
  }
  return null;
}

/**
 * Brings a chosen walk into view without losing the reader. Where the walks
 * scroll in their own box beside the stage (wide screens), that box scrolls
 * to the walk's list, but never so far that the chosen chip leaves it, and
 * the page stays put (its scroll drives the stage). Where the list runs on
 * below the stage (phones), a tap brings the stage into view instead, so the
 * walk replays where it is seen; a choice made with the arrow keys moves
 * nothing there, so the focused chip stays on screen.
 */
function reveal(details: HTMLElement, chip: HTMLElement | null, figure: HTMLElement | null, pointer: boolean) {
  const box = scrollBox(details);
  if (!box) {
    if (pointer) figure?.scrollIntoView({ block: "nearest", behavior: "instant" });
    return;
  }
  const area = box.getBoundingClientRect();
  // The box's foot fades over its padding (HouseStage.module.css): the list should end above it.
  const end = area.bottom - parseFloat(getComputedStyle(box).paddingBottom);
  const { top, bottom } = details.getBoundingClientRect();
  let by = top < area.top ? top - area.top : bottom > end ? Math.min(bottom - end, top - area.top) : 0;
  // The chip keeps a little room above it, for its focus ring.
  if (by > 0 && chip) by = Math.min(by, Math.max(0, chip.getBoundingClientRect().top - area.top - 8));
  if (by !== 0) box.scrollTop += by;
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
  const fieldset = useRef<HTMLFieldSetElement>(null);
  // Whether the chip was chosen by pointer (a tap or a click) rather than the arrow keys.
  const viaPointer = useRef(false);

  const choose = (route: string, open: boolean) => {
    if (route === current.current) return;
    current.current = route;
    setChosen(route);
    if (open) {
      const details = document.getElementById(list)?.querySelector<HTMLDetailsElement>(`details[data-walk="${CSS.escape(route)}"]`);
      if (details) {
        details.open = true;
        const chip = fieldset.current?.querySelector<HTMLInputElement>(`input[value="${CSS.escape(route)}"]`)?.closest("label") ?? null;
        reveal(details, chip, document.getElementById(stageId), viaPointer.current);
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
      ref={fieldset}
      className={styles.chips}
      onPointerEnter={() => void loadWalks().catch(() => undefined)}
      onFocus={() => void loadWalks().catch(() => undefined)}
      onPointerDown={() => {
        viaPointer.current = true;
      }}
      onKeyDown={() => {
        viaPointer.current = false;
      }}
    >
      <legend className={styles.legend}>Follow a walk</legend>
      {chips.map((chip) => (
        <label key={chip.route} className={styles.chip}>
          <input
            type="radio"
            name={`${stageId}-walk`}
            value={chip.route}
            checked={chosen === chip.route}
            onChange={() => {
              choose(chip.route, true);
              viaPointer.current = false;
            }}
          />
          <span>{chip.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
