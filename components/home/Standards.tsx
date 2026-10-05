import { Section } from "@/components/ui/Section";
import { bathrooms, staff, times } from "@/content/stay";
import { joinList, lowerFirst } from "@/content/text";
import { pages } from "@/lib/site";
import { StandardsView, type StandardRow } from "./StandardsView";

const rows: readonly StandardRow[] = [
  {
    term: "Check-in",
    value: `${times.checkIn.value} to ${times.checkInUntil.value}`,
    note: `Early check-in: ${lowerFirst(times.earlyCheckIn.value)}.`,
  },
  { term: "Check-out", value: `Until ${times.checkOut.value}`, note: "Luggage storage if you leave later in the day." },
  { term: "Reception", value: staff.hours.value.summary, note: `The team speaks ${joinList(staff.languages.value)}.` },
  { term: "Bathrooms", value: `${bathrooms.cleaning.value}, guests say`, note: "Shared, with hot showers.", stamp: bathrooms.cleaning.value },
  { term: "Smoking", value: "Not anywhere in the house", note: "Clean air in every dorm." },
  {
    term: "Nights",
    value: times.quietHours ? `Quiet hours ${times.quietHours.value}` : "Calm and quiet",
    note: "Not a party hostel: no hen or stag parties.",
  },
];

/**
 * ② Small things, done well (docs/DESIGN.md §5.1), on the deep band: the
 * house's standards as a ledger, each row ticked off in running stitches as
 * it comes into view; the bathrooms' row keeps its stamp, and its "guests say".
 */
export function Standards() {
  return (
    <Section tone="deep" labelledBy="standards-title">
      <StandardsView rows={rows} rules={pages.rules.path} />
    </Section>
  );
}
