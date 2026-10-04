import Link from "next/link";
import { BookingCard } from "@/components/BookingCard";
import { Drawing } from "@/components/art/Drawing";
import { ReadNext } from "@/components/guide/ReadNext";
import { Block, Prose } from "@/components/page/Block";
import { PageHeader } from "@/components/page/PageHeader";
import { PageJsonLd } from "@/components/PageJsonLd";
import { TripRequest } from "@/components/trips/TripRequest";
import { identity, whatsappUrl } from "@/content/identity";
import { services } from "@/content/stay";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";

export const metadata = pageMetadata(pages.trips);

/**
 * /trips: the team books trains, buses and tours for guests. The guest
 * writes the trip once and sends it on WhatsApp or by email; the team
 * replies with the times and the price. The guides show the way for anyone
 * who would rather do it themselves.
 */
export default function TripsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Trips"
        morph="trips"
        title="Trains, buses and tours, booked for you"
        lede={`${services.bookingHelp.value}. Tell them where and when, and they reply with the times and the price.`}
        art={<Drawing name="train" priority />}
      />

      <Block id="ask" title="Ask the team to book" aside="Nothing to pay here: the team replies first.">
        <TripRequest whatsapp={whatsappUrl()} email={identity.contact.email.value} />
      </Block>

      <Block id="yourself" title="Rather do it yourself?" tone="cream">
        <Prose>
          <p>
            The guides show how, step by step, and say where every fact comes from:{" "}
            <Link href="/guides/laos-china-railway-tickets">train tickets</Link>,{" "}
            <Link href="/guides/getting-around-vientiane">buses and getting around</Link>,{" "}
            <Link href="/guides/vientiane-to-thailand">crossing to Thailand</Link> and{" "}
            <Link href="/guides/one-day-in-vientiane">a day in Vientiane</Link>.
          </p>
        </Prose>
      </Block>

      <ReadNext paths={["/guides/laos-china-railway-tickets", "/guides/getting-around-vientiane", "/guides/vientiane-to-thailand"]} />
      <BookingCard />
      <PageJsonLd path={pages.trips.path} />
    </>
  );
}
