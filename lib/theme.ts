import { THEME_KEY } from "@/components/layout/theme-keys";
import { breakfast, times } from "@/content/stay";
import { MOTION_KEY } from "@/lib/motion/prefs";

export { THEME_KEY, themeColor, type ThemeChoice } from "@/components/layout/theme-keys";

/**
 * The theme: Day (light) or Evening (dark), or Auto, which follows the
 * device. A guest's choice is kept in this browser only (localStorage) and set
 * on <html data-theme> before the first paint by the boot script below, so a
 * page never flashes the other theme. No choice, no attribute: the CSS follows
 * prefers-color-scheme (app/globals.css). Server and build code only: client
 * files take the theme's names from components/layout/theme-keys.ts.
 */

export const SPLASH_KEY = "hoj-splash";

/** How long html.splash stays: by then the curtain is up and the last hero phrase has ended (4.7 s at most). */
export const SPLASH_MS = 5000;

/**
 * The house now, in Vientiane time (UTC+7 all year: Laos keeps no daylight
 * saving). Each phase starts at a time from content/stay, so the line under
 * the hero never disagrees with the house rules:
 * - quiet: quiet hours begin (21:00);
 * - morning: quiet hours end (07:00), with breakfast to come;
 * - day: breakfast is over (10:30) and check-in hasn't opened;
 * - arrivals: check-in opens (14:00).
 */
export type VtPhase = "quiet" | "morning" | "day" | "arrivals";

export const VIENTIANE_UTC_OFFSET_MINUTES = 7 * 60;

/** The first (or second) "HH:MM" in a text such as "21:00–07:00", in minutes after midnight. */
function minutesOf(text: string, which: 0 | 1 = 0): number {
  const found = [...text.matchAll(/(\d{2}):(\d{2})/g)][which];
  if (!found) throw new Error(`No time ${which + 1} in "${text}"`);
  return Number(found[1]) * 60 + Number(found[2]);
}

const quietHours = times.quietHours?.value;

/** Minutes after midnight, Vientiane time, at which each phase begins. */
export const vtPhaseStarts: Readonly<Record<VtPhase, number>> = {
  quiet: quietHours ? minutesOf(quietHours, 0) : minutesOf(times.checkInUntil.value),
  morning: quietHours ? minutesOf(quietHours, 1) : minutesOf(times.frontDoorLocked.value.until),
  day: minutesOf(breakfast.hours.value, 1),
  arrivals: minutesOf(times.checkIn.value),
};

/** The phases in the order they begin, from midnight. */
const phaseOrder = (Object.entries(vtPhaseStarts) as [VtPhase, number][]).sort((a, b) => a[1] - b[1]);
const lastPhase = phaseOrder[phaseOrder.length - 1]![0];

/** One JS expression from m (minutes after midnight) to the phase: before the day's first start, the night's phase holds. */
const phaseExpression =
  phaseOrder.map(([, start], i) => `m<${start}?${JSON.stringify(i === 0 ? lastPhase : phaseOrder[i - 1]![0])}:`).join("") +
  JSON.stringify(lastPhase);

/**
 * Runs in <head> before anything paints (inline, which the site's CSP allows;
 * next.config.ts). It sets:
 * - the saved theme (data-theme);
 * - Motion: Still (data-motion="still", lib/motion/prefs.ts);
 * - the logo splash on the first page of a visit (html.splash), unless the
 *   guest prefers reduced motion or chose Still; the class comes off after
 *   SPLASH_MS, so coming back to the home page later never waits for a curtain;
 * - the house now (data-vt-phase), from Vientiane time.
 * Every storage call is guarded: private windows and blocked storage simply
 * get Auto, Full and no splash.
 */
export const bootScript = `(function(){var d=document.documentElement,s=0;try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")d.setAttribute("data-theme",t);s=localStorage.getItem(${JSON.stringify(MOTION_KEY)})==="still";if(s)d.setAttribute("data-motion","still")}catch(e){}try{if(!sessionStorage.getItem(${JSON.stringify(SPLASH_KEY)})){sessionStorage.setItem(${JSON.stringify(SPLASH_KEY)},"1");if(!s&&!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("splash");setTimeout(function(){d.classList.remove("splash")},${SPLASH_MS})}}}catch(e){}var m=Math.floor(Date.now()/6e4+${VIENTIANE_UTC_OFFSET_MINUTES})%1440;d.setAttribute("data-vt-phase",${phaseExpression})})()`;
