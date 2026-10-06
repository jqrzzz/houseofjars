import { breakfast, staff, times } from "@/content/stay";
import { VIENTIANE_UTC_OFFSET_MINUTES, type VtPhase } from "@/lib/theme";

/**
 * The house now, in Vientiane time (docs/DESIGN.md §5.1): one short line under
 * the hero, from content/stay, for each part of the day. All five lines go
 * into the page; CSS shows the one for html[data-vt-phase], which the boot
 * script sets from the clock on each visit (lib/theme.ts), and the general
 * line without it (no JavaScript). Nothing moves with the clock.
 */
export function houseNowLines(): Readonly<Record<VtPhase | "default", string>> {
  const zone = `Vientiane time, UTC+${VIENTIANE_UTC_OFFSET_MINUTES / 60}`;
  const checkIn = times.checkIn.value;
  const until = times.checkInUntil.value;
  const quiet = times.quietHours?.value;
  const quietEnd = quiet?.split("–")[1];
  const allNight = staff.hours.value.closes === "23:59";
  return {
    default: `Check-in ${checkIn}–${until}${quiet ? ` · quiet hours ${quiet}` : ""} (${zone}).`,
    quiet: quietEnd
      ? `Quiet hours in Vientiane until ${quietEnd}.${allNight ? " The team is on site all night: message any time." : ""}`
      : `Check-in opens at ${checkIn} (Vientiane time).`,
    morning: `Morning in Vientiane: breakfast ${breakfast.hours.value} in the café.`,
    day: `Check-in opens at ${checkIn} (Vientiane time).`,
    arrivals: `Check-in is open until ${until} (Vientiane time).`,
  };
}
