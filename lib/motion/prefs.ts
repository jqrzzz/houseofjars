/**
 * Motion: Full or Still. A guest who picks Still (the footer and the phone
 * menu: components/motion/MotionChoice) gets every scene at rest, everywhere
 * on the site. The choice is kept in this browser only (localStorage) and set
 * on <html data-motion="still"> before the first paint by the boot script
 * (lib/theme.ts); app/globals.css then stops every animation. A device set to
 * reduce motion is honoured whatever the choice.
 *
 * Client-safe and tiny: no content imports, so any client file may use it.
 */

export const MOTION_KEY = "hoj-motion";
/** Fired on window whenever the choice changes on this page. */
export const MOTION_EVENT = "hoj-motion";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export type MotionChoice = "full" | "still";

/** Anything stored or found that isn't exactly "still" means Full. */
export function parseMotion(value: unknown): MotionChoice {
  return value === "still" ? "still" : "full";
}

/** The choice on this page, as the boot script (or setMotion) left it on <html>. */
export function readMotion(): MotionChoice {
  if (typeof document === "undefined") return "full";
  return parseMotion(document.documentElement.getAttribute("data-motion"));
}

/** Puts a choice on the page without storing it (another tab's choice arrives this way). */
export function applyMotion(choice: MotionChoice): void {
  const root = document.documentElement;
  if (choice === "still") {
    root.setAttribute("data-motion", "still");
    // A splash still on screen would otherwise freeze where it is: lift it at once.
    root.classList.remove("splash");
  } else {
    root.removeAttribute("data-motion");
  }
  window.dispatchEvent(new Event(MOTION_EVENT));
}

/** Sets Full or Still and remembers it in this browser. Blocked storage keeps it for this page only. */
export function setMotion(choice: MotionChoice): void {
  try {
    if (choice === "still") localStorage.setItem(MOTION_KEY, "still");
    else localStorage.removeItem(MOTION_KEY);
  } catch {
    // Private window or blocked storage: the choice holds until the next full load.
  }
  applyMotion(choice);
}

function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === "function" && matchMedia(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}

/** True when things may move: the device doesn't ask for reduced motion and the guest hasn't chosen Still. */
export function motionAllowed(): boolean {
  if (typeof document === "undefined") return false;
  return !prefersReducedMotion() && readMotion() !== "still";
}
