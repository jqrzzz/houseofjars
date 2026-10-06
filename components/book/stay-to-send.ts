import type { DirectStay } from "@/lib/booking/direct";
import { railDate } from "@/lib/booking/stay-rail";

/**
 * What a direct request sends (components/book/DirectRequest): the guest's
 * stay, except a check-in day already gone at the house (typed in, or picked
 * on a phone whose date wheel ignores the form's earliest day). That day stays
 * out of the message, so the team is asked for the nights alone, and the guest
 * is told why. `today` is the house's date (lib/dates houseToday), unknown
 * until the browser has it: until then nothing counts as past.
 */
export function stayToSend(stay: DirectStay, today: string | undefined): { stay: DirectStay; warning: string | null } {
  if (!stay.checkIn || !today || stay.checkIn >= today) return { stay, warning: null };
  return {
    stay: { ...stay, checkIn: null },
    warning: `That date has passed: choose one from ${railDate(today)}.`,
  };
}
