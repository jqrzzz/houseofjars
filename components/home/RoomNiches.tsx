import type { DrawingName } from "@/components/art/drawings";
import { bathrooms, beds, breakfast } from "@/content/stay";
import { joinList, lowerFirst } from "@/content/text";
import { pages } from "@/lib/site";
import { RoomNichesView } from "./RoomNichesView";

const rooms: readonly (readonly [DrawingName, string, string])[] = [
  ["pod", "Your own pod", `Every bed is its own cubicle, with ${joinList(beds.perBed.value.map((item) => `a ${item.toLowerCase()}`))}.`],
  ["shower", "Hot showers", `Shared bathrooms with hot showers: guests say they are ${lowerFirst(bathrooms.cleaning.value)}.`],
  ...(breakfast.included.value
    ? [
        [
          "cafe",
          "Breakfast downstairs",
          `Included, in the café on the ground floor: ${joinList(breakfast.items.value.map((item) => item.toLowerCase()))}.`,
        ] as const,
      ]
    : []),
];

/**
 * After the house story, its three rooms (docs/DESIGN.md §5.1): each drawing
 * stands in an arched niche cut into the paper, and pops up on its fold as it
 * comes into view (from lying back at 62°, about its foot). The words never
 * move. The skip link at the start of the story lands here.
 */
export function RoomNiches() {
  return <RoomNichesView rooms={rooms} more={pages.house.path} />;
}
