import { BookingCard } from "@/components/BookingCard";
import { CopyButton } from "@/components/contact/CopyButton";
import { Drawing } from "@/components/art/Drawing";
import { PhotoFrame } from "@/components/PhotoFrame";
import { Block, Prose } from "@/components/page/Block";
import { PageHeader } from "@/components/page/PageHeader";
import buttons from "@/components/ui/button.module.css";
import { Ledger } from "@/components/ui/Ledger";
import { WhatsAppIcon } from "@/components/ui/icons";
import { PageJsonLd } from "@/components/PageJsonLd";
import { airportTransport, immigration, location } from "@/content/area";
import { addressLines, formatAddress, whatsappUrl } from "@/content/identity";
import { lowerFirst } from "@/content/text";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./vientiane.module.css";

export const metadata = pageMetadata(pages.vientiane);

const { airport, ...onFoot } = location.nearby;
const { ldif, registration } = immigration;

export default function VientianePage() {
  return (
    <>
      <PageHeader
        eyebrow="Vientiane"
        morph="vientiane"
        title="Getting here and around Vientiane"
        lede={`The house is in ${location.neighbourhood.value}: ${lowerFirst(airport.value.distance)} from the airport and a few minutes’ walk from the Mekong.`}
        art={<Drawing name="tuktuk" />}
      />

      <Block id="airport" title="From the airport">
        <Prose>
          <p>
            {airport.value.place} is {lowerFirst(airport.value.distance)} from the house. {airportTransport.value}{" "}
            Message them with your flight and arrival time.
          </p>
        </Prose>
        <a
          href={whatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttons.button} ${buttons.secondary} ${styles.whatsapp}`}
        >
          <WhatsAppIcon />
          Message the team
          <span className="visually-hidden"> on WhatsApp (opens in a new tab)</span>
        </a>
        <div className={styles.address}>
          <p className={styles.addressLabel}>The address, to show a driver</p>
          <address className={styles.addressText}>
            {addressLines().map((line) => (
              <span key={line}>{line}</span>
            ))}
          </address>
          <CopyButton value={formatAddress()} what="address" />
        </div>
      </Block>

      <Block id="on-foot" title="On foot" aside="Distances from the front door.">
        <Ledger
          variant="places"
          rows={Object.values(onFoot).map((nearby) => ({ term: nearby.value.place, value: nearby.value.distance }))}
        />
        <PhotoFrame caption="The Mekong riverside at dusk" drawing="riverside" />
      </Block>

      <Block id="arriving-in-laos" title="Before you arrive in Laos" tone="cream">
        <Prose>
          <p>{ldif.value.summary}</p>
          <p>
            <a href={ldif.value.url} target="_blank" rel="noopener noreferrer">
              Official information from the Lao Department of Immigration
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </p>
          <p>{registration.value}</p>
        </Prose>
      </Block>

      <BookingCard />
      <PageJsonLd path={pages.vientiane.path} />
    </>
  );
}
