import { Section } from "@/components/ui/Section";
import { ShadowScrimView } from "./ShadowScrimView";

/**
 * ④ Ask Shadow (docs/DESIGN.md §2.3.7, §5.1): Shadow stands in front of a
 * lamplit paper scrim, and his shadow falls on it. As the section first comes
 * into view the shadow slides 0.75rem aside, the way a shadow moves when a
 * lamp is carried past; at rest it stands to one side of him. Shadow is the
 * house's AI concierge, never staff: he points the way, nothing more. The
 * four questions open him with the question asked.
 */
export function ShadowScrim() {
  return (
    <Section labelledBy="shadow-title">
      <ShadowScrimView />
    </Section>
  );
}
