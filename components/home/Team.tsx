import { Section } from "@/components/ui/Section";
import { photos } from "@/content/photos";
import { staff } from "@/content/stay";
import { joinList } from "@/content/text";
import { pages } from "@/lib/site";
import { TeamView } from "./TeamView";

/**
 * The team (docs/DESIGN.md §5.1): the front of the house at night, in the
 * arch's paper mat (lamplight washes the mat by Evening, never the photo),
 * beside a few words. No people are drawn or shown.
 */
export function Team() {
  const { src, alt, focus } = photos.entrance;
  return (
    <Section tone="cream" labelledBy="team-title">
      <TeamView
        photo={{ src, alt, ...(focus ? { focus } : {}) }}
        caption={photos.entrance.caption}
        text={`The team speaks ${joinList(staff.languages.value)}. Guests often mention how friendly and helpful they are, and how quickly they reply.`}
        about={pages.about.path}
      />
    </Section>
  );
}
