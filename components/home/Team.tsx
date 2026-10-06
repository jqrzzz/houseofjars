import { Section } from "@/components/ui/Section";
import { photos } from "@/content/photos";
import { staff } from "@/content/stay";
import { joinList } from "@/content/text";
import { pages } from "@/lib/site";
import { TeamView } from "./TeamView";

/**
 * The team (docs/DESIGN.md §5.1): the front of the house, drawn from its
 * photograph (lit at night by Evening), in the arch's paper mat, beside a few
 * words. No people are drawn or shown.
 */
export function Team() {
  // Only the drawing is shown here, so the photograph's address stays off this page.
  const { alt, focus, drawing, drawnAlt } = photos.entrance;
  return (
    <Section tone="cream" labelledBy="team-title">
      <TeamView
        photo={{ alt, drawing, drawnAlt, ...(focus ? { focus } : {}) }}
        caption={photos.entrance.caption}
        text={`The team speaks ${joinList(staff.languages.value)}. Guests often mention how friendly and helpful they are, and how quickly they reply.`}
        about={pages.about.path}
      />
    </Section>
  );
}
