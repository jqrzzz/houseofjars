import { Block, Prose, TickList } from "@/components/page/Block";
import { PageHeader } from "@/components/page/PageHeader";
import { PageJsonLd } from "@/components/PageJsonLd";
import { formatAddress, identity, whatsappUrl } from "@/content/identity";
import { PRIVACY_UPDATED, privacy } from "@/content/privacy";
import { formatDate } from "@/content/text";
import { onlineBookingConfigured } from "@/lib/booking/config";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";

export const metadata = pageMetadata(pages.privacy);

export default function PrivacyPage() {
  const { email, phone } = identity.contact;
  // With online booking on /book there are two forms: a booking request and a message.
  const online = onlineBookingConfigured();
  const forms = online ? "the booking and message forms" : "the form";
  const contact = (
    <>
      <a href={`mailto:${email.value}`}>{email.value}</a> or{" "}
      <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
        WhatsApp {phone.value.display}
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    </>
  );

  return (
    <>
      <PageHeader
        eyebrow="Privacy"
        title="Privacy notice"
        lede={`What the booking form and Shadow, our AI concierge, collect, why, who handles it and how to ask us to delete it. Last updated ${formatDate(PRIVACY_UPDATED)}.`}
      />

      <Block id="who" title="Who we are">
        <Prose>
          <p>
            {identity.fullName.value}, {formatAddress()}. For anything about your data, contact us at {contact}.
          </p>
        </Prose>
      </Block>

      <Block id="collect" title="What we collect, and why">
        <Prose>
          {online ? (
            <>
              <h3>When you request a booking</h3>
              <TickList
                items={[
                  "Your name.",
                  "Your email address, your WhatsApp or phone number, or both, and how you would like us to reply.",
                  "Your dates, the number of guests and the beds you chose.",
                  "Your arrival time and a message, if you give them.",
                ]}
              />
              <p>
                We use these only to confirm and arrange your stay. Your browser keeps your booking reference and the
                dates of your stay (not your contact details) in session storage, so the confirmation stays on screen if
                you reload the page; it clears them when you close the tab.
              </p>
            </>
          ) : null}
          <h3>When you send a message from the booking page</h3>
          <TickList
            items={[
              "Your name.",
              "Your email address, your WhatsApp or phone number, or both, and how you would like us to reply.",
              "Your dates, number of guests and bed preference, if you give them.",
              "Your message.",
            ]}
          />
          <p>We use these only to answer you and to arrange your stay.</p>

          <h3>When you talk to Shadow</h3>
          <p>
            The questions you type are sent to our server and to Anthropic, which writes Shadow’s replies. The website
            does not save the conversation: it stays in your browser tab until you close it.
          </p>
          {online ? (
            <p>
              If you ask Shadow about free beds, our server looks up your dates and the number of guests in the
              house’s booking system, just as the booking form does. Nothing else goes with them, and nothing is booked.
            </p>
          ) : null}
          <p>
            If you ask Shadow to pass a message to the team, he shows you exactly what would be sent: the same kind of
            details as the booking form, plus a sentence or two summing up what you asked. Nothing is sent until you
            tick the box and press Send. He never sends the whole conversation.
          </p>

          <h3>Your IP address</h3>
          <p>
            Our server keeps it in memory for a short time, to stop {forms} and Shadow being flooded with requests,
            and does not save it. Like any website, the server hosting this one may also record it in short-term logs.
          </p>

          <h3>No cookies or tracking</h3>
          <p>
            The website sets no cookies and uses no analytics or advertising trackers. Your browser keeps your
            conversation with Shadow in session storage, which it clears when you close the tab.
          </p>

          <h3>Please don’t send</h3>
          <p>
            Passport numbers, card details or other sensitive information. The website doesn’t need them, and the team
            will see your passport at check-in.
          </p>
        </Prose>
      </Block>

      <Block id="consent" title="Your consent" tone="cream">
        <Prose>
          <p>
            Nothing you type reaches the team until you tick the box to say you agree to this notice. Laos’ Law on
            Electronic Data Protection (No. 25/NA, 2017) asks for consent before personal data is collected and used,
            and this is how we ask for it.
          </p>
          <p>You can withdraw your consent at any time by asking us to delete your details.</p>
        </Prose>
      </Block>

      <Block id="processors" title="Who handles your data">
        <Prose>
          <p>
            {online ? "Booking requests and messages" : "Messages"} you send reach the team through Shadow Check-in, the
            system the house uses to run the front desk. Shadow Check-in is hosted by Vercel and Supabase.
          </p>
          <p>
            Anthropic processes your conversations with Shadow to write his replies. The team may also use Shadow
            Check-in’s assistant, which Anthropic runs, to help draft an answer to your message; a person on the team
            reads and sends every reply.
          </p>
          <p>
            These services use servers outside Laos, so your details are transferred abroad when you use {forms} or
            talk to Shadow.
          </p>
          <p>We don’t sell your details or use them for advertising.</p>
        </Prose>
      </Block>

      <Block id="retention" title="How long we keep it">
        <Prose>
          <p>{privacy.retention.value}</p>
        </Prose>
      </Block>

      <Block id="choices" title="Your choices">
        <Prose>
          <p>
            You can ask to see the details we hold about you, to correct them or to delete them. Contact us at{" "}
            {contact}, and we will reply as soon as we can.
          </p>
          <p>If this notice changes, we will update the date at the top.</p>
        </Prose>
      </Block>
      <PageJsonLd path={pages.privacy.path} />
    </>
  );
}
