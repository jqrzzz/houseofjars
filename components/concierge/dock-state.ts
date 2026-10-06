/** "true": Shadow's button steps aside (on phones the dock with it); "ask": only his button; "false": both stay. */
export type DockHidden = "true" | "ask" | "false";

/**
 * What Shadow's dock does (ConciergeLauncher), from the `data-hides-launcher`
 * values of the elements reaching into the bottom fifth of the screen. A
 * booking form or the home hero ("") asks for the whole dock to step aside.
 * An inline Ask Shadow button ("ask") offers Shadow himself, so only his
 * button steps aside and Book direct stays.
 */
export function dockHidden(kinds: Iterable<string | null>): DockHidden {
  let ask = false;
  for (const kind of kinds) {
    if (kind !== "ask") return "true";
    ask = true;
  }
  return ask ? "ask" : "false";
}
