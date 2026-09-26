import { BookingBand } from "@/components/BookingBand";
import { AskShadowButton } from "@/components/concierge/AskShadowButton";
import { JarDrawing } from "@/components/drawings/Drawings";
import { PhotoFrame } from "@/components/PhotoFrame";
import { Block, Prose } from "@/components/page/Block";
import { PageHeader } from "@/components/page/PageHeader";
import buttons from "@/components/ui/button.module.css";
import { location, plainOfJars } from "@/content/area";
import { identity } from "@/content/identity";
import { building, staff } from "@/content/stay";
import { countWord, joinList, lowerFirst } from "@/content/text";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./about.module.css";

export const metadata = pageMetadata(pages.about);

export default function AboutPage() {
  const owner = identity.owner.name.value;
  const note = identity.owner.note;

  return (
    <>
      <PageHeader
        eyebrow="About"
        title="About the house"
        lede={`${identity.name.value} is a calm dorm hostel in ${location.neighbourhood.value}: ${countWord(building.floors.value).toLowerCase()} floors of pod beds, with a café downstairs.`}
        art={<JarDrawing />}
      />

      <Block id="owner" title={`Owned and run by ${owner}`}>
        <Prose>
          <p>
            {owner} owns and runs the house, with a team on site day and night. Guests write about the care that goes
            into it: how clean it is, the comfortable beds, the breakfast and the quick replies.
          </p>
          {note ? (
            <blockquote className={styles.note}>
              <p>{note.value}</p>
              <footer>{owner}</footer>
            </blockquote>
          ) : null}
        </Prose>
      </Block>

      <Block id="name" title="Why House of Jars" tone="cream">
        <Prose>
          <p>{identity.nameStory.value}</p>
          <p>{plainOfJars.summary.value}</p>
          <p>
            Our mark is drawn after those jars: squat and heavy, with a thick rolled lip and one carved line.
          </p>
        </Prose>
        <PhotoFrame shape="jar" caption="The front of the house" className={styles.jarFrame} />
      </Block>

      <Block id="team" title="The team">
        <Prose>
          <p>
            The team is {lowerFirst(staff.hours.value)} and speaks {joinList(staff.languages.value)}.{" "}
            {staff.transport.value}. They are known for replying to messages quickly.
          </p>
        </Prose>
      </Block>

      <Block id="shadow" title="Shadow, the AI concierge">
        <Prose>
          <p>
            Shadow is the friendly ghost butler who answers questions on this website. He is an AI, not a member of
            staff: he answers from what the house has published, can pass your message to the team, and can be wrong.
            For anything important, the team is a message away.
          </p>
        </Prose>
        <AskShadowButton className={`${buttons.button} ${buttons.secondary} ${styles.ask}`}>Ask Shadow</AskShadowButton>
      </Block>

      <BookingBand />
    </>
  );
}
