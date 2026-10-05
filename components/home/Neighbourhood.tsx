import { Section } from "@/components/ui/Section";
import { location } from "@/content/area";
import { isFirm } from "@/content/certainty";
import { identity } from "@/content/identity";
import { pages } from "@/lib/site";
import { NeighbourhoodView } from "./NeighbourhoodView";

/**
 * ⑤ The neighbourhood (docs/DESIGN.md §5.1): the street and the river as a
 * paper diorama (a tuk-tuk crosses as it scrolls by, and parks at 40% at
 * rest), and the places nearby, where what only guests report keeps their
 * word for it. No map pin: the house's map position is not confirmed.
 */
export function Neighbourhood() {
  return (
    <Section tone="cream" labelledBy="area-title">
      <NeighbourhoodView
        heading={`In ${identity.address.village.value}, a short walk from the Mekong.`}
        lede={`The house is in ${location.neighbourhood.value}, a few minutes’ walk from the river.`}
        places={Object.values(location.nearby).map(
          (nearby) => [nearby.value.place, isFirm(nearby) ? nearby.value.distance : `${nearby.value.distance}, guests say`] as const,
        )}
        links={[
          [pages.vientiane.path, "Getting here"],
          ["/guides/whats-nearby", "What’s nearby"],
          ["/guides/one-day-in-vientiane", "A day in Vientiane"],
        ]}
      />
    </Section>
  );
}
