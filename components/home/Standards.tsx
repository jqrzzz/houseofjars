import { Section } from "@/components/ui/Section";
import { staff, times } from "@/content/stay";
import { joinList, lowerFirst } from "@/content/text";
import { pages } from "@/lib/site";
import { StandardsView, type StandardRow } from "./StandardsView";

export const standardRows: readonly StandardRow[] = [
  {
    term: "Check-in",
    value: `${times.checkIn.value} to ${times.checkInUntil.value}`,
    note: `Early check-in: ${lowerFirst(times.earlyCheckIn.value)}.`,
  },
  { term: "Check-out", value: `Until ${times.checkOut.value}`, note: "Luggage storage if you leave later in the day." },
  { term: "Reception", value: staff.hours.value.summary, note: `The team speaks ${joinList(staff.languages.value)}.` },
  {
    term: "Bathrooms",
    value: `Looked over ${staff.housekeepingRound.value}`,
    // Short, so it stays clear of the stamp beside it on phones.
    note: "Shared, with hot showers.",
    stamp: `Looked over ${staff.housekeepingRound.value}`,
  },
  { term: "Smoking", value: "Outside only, past the terrace", note: "Not in the house or on the terrace: smoke drifts into the café." },
  {
    term: "Nights",
    value: times.quietHours ? `Quiet hours ${times.quietHours.value}` : "Calm and quiet",
    note: "Not a party hostel: no hen or stag parties.",
  },
];

/**
 * ② Small things, done well (docs/DESIGN.md §5.1), on the deep band: the
 * house's standards as a ledger, each row ticked off in running stitches as
 * it comes into view. The bathrooms' row stamps the team's hourly round,
 * which the house has confirmed; what guests say about the bathrooms is
 * credited to them in the room niches above.
 */
export function Standards() {
  return (
    <Section tone="deep" labelledBy="standards-title">
      <StandardsView rows={standardRows} rules={pages.rules.path} />
    </Section>
  );
}
