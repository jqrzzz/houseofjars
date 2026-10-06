import Link from "next/link";
import { BookingCard } from "@/components/BookingCard";
import { DriverAddress } from "@/components/contact/DriverAddress";
import { Diorama } from "@/components/art/Diorama";
import paper from "@/components/art/paper.module.css";
import { PhotoFrame } from "@/components/PhotoFrame";
import { Block, Prose } from "@/components/page/Block";
import { PageHeader } from "@/components/page/PageHeader";
import buttons from "@/components/ui/button.module.css";
import { Ledger } from "@/components/ui/Ledger";
import { WhatsAppIcon } from "@/components/ui/icons";
import { PageJsonLd } from "@/components/PageJsonLd";
import { ReadNext } from "@/components/guide/ReadNext";
import { airportTransport, immigration, location } from "@/content/area";
import { isFirm } from "@/content/certainty";
import { whatsappUrl } from "@/content/identity";
import { lowerFirst } from "@/content/text";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./vientiane.module.css";

export const metadata = pageMetadata(pages.vientiane);

const { airport, ...onFoot } = location.nearby;
const { ldif, registration } = immigration;

/** Links deeper into the site play the forward page transition. */
const FORWARD = ["nav-forward"];

/*
 * A string of paper lanterns hung across the front of the riverside picture,
 * nearer than the drawing's own: a sagging cord (a quadratic curve over a
 * 480 by 60 strip) and four lanterns along it, each a teak cap, a clay body
 * and a tassel. The bodies are clay, not jar orange: on a wide screen they
 * are larger than 24 px, and only the Book button is a jar-orange fill that
 * big. They hang over the mat, clear of the drawing. By Evening each glows in
 * two halo steps.
 */
const CORD = { from: [-12, 3], control: [240, 34], to: [492, 7] } as const;
const at = (t: number) =>
  [0, 1].map((k) => Math.round(((1 - t) ** 2 * CORD.from[k]! + 2 * (1 - t) * t * CORD.control[k]! + t ** 2 * CORD.to[k]!) * 10) / 10) as [number, number];
const LANTERNS = [0.16, 0.39, 0.62, 0.85].map(at);

function LanternString({ className }: { className?: string }) {
  const caps = LANTERNS.map(([x, y]) => `M${x - 4.5} ${y + 3}h9v3.5h-9Z M${x - 4} ${y + 29.5}h8v3h-8Z`).join("");
  const cords = LANTERNS.map(([x, y]) => `M${x} ${y}v3M${x} ${y + 32.5}v7`).join("");
  return (
    <svg className={[paper.paper, className].filter(Boolean).join(" ")} viewBox="0 0 480 60" aria-hidden="true" focusable="false">
      <path className="l" d={`M${CORD.from.join(" ")}Q${CORD.control.join(" ")} ${CORD.to.join(" ")}`} />
      {LANTERNS.map(([x, y]) => (
        <g key={x}>
          <circle className="gl" cx={x} cy={y + 18} r="22" />
          <circle className="gl" cx={x} cy={y + 18} r="16" />
        </g>
      ))}
      <path className="l" d={cords} />
      {LANTERNS.map(([x, y]) => (
        <ellipse key={x} className={`r ${styles.lantern}`} cx={x} cy={y + 18} rx="10" ry="12" />
      ))}
      <path className="b" d={caps} />
      <path className="h" d={LANTERNS.map(([x, y]) => `M${x - 10} ${y + 18}h20M${x - 6} ${y + 9.5}q6 -2 12 0M${x - 6} ${y + 26.5}q6 2 12 0`).join("")} />
    </svg>
  );
}

export default function VientianePage() {
  return (
    <>
      <PageHeader
        eyebrow="Vientiane"
        morph="vientiane"
        title="Getting here and around Vientiane"
        lede={`The house is in ${location.neighbourhood.value}: ${lowerFirst(airport.value.distance)} from the airport and a few minutes’ walk from the Mekong.`}
        art={<Diorama variant="vientiane" />}
        artShape="scene"
      />

      <Block id="airport" title="From the airport">
        <Prose>
          <p>
            {airport.value.place} is {lowerFirst(airport.value.distance)} from the house. Guests say{" "}
            {lowerFirst(airportTransport.value)} Message them with your flight and arrival time.
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
        <DriverAddress />
      </Block>

      <Block id="on-foot" title="On foot" aside="Distances from the front door.">
        <Ledger
          variant="places"
          rows={Object.values(onFoot).map((nearby) => ({
            term: nearby.value.place,
            value: nearby.value.distance,
            // What only guests report keeps their credit.
            note: isFirm(nearby) ? undefined : "Guests say",
          }))}
        />
        {/* The riverside in three planes: the mat stays, the drawing drifts a little, the lanterns nearer still. */}
        <div className={styles.riverside}>
          <PhotoFrame caption="The Mekong riverside at dusk" drawing="riverside" className={styles.riversideFrame} />
          <LanternString className={styles.lanterns} />
        </div>
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
          <p>
            {registration.value}{" "}
            <Link href={`${pages.rules.path}#your-stay`} transitionTypes={FORWARD}>
              What to bring to check-in
            </Link>
            .
          </p>
        </Prose>
      </Block>

      <Block id="travelling-on" title="Around Vientiane and beyond" aside="Plan your days yourself.">
        <Prose>
          <p>
            <Link href="/guides/getting-around-vientiane" transitionTypes={FORWARD}>
              Getting around Vientiane
            </Link>
            : taxi apps, tuk-tuks, the BRT buses and the bus stations.{" "}
            <Link href="/guides/one-day-in-vientiane" transitionTypes={FORWARD}>
              A day in Vientiane
            </Link>
            , step by step.
          </p>
          <p>
            Further:{" "}
            <Link href="/guides/laos-china-railway-tickets" transitionTypes={FORWARD}>
              train tickets
            </Link>{" "}
            to Vang Vieng, Luang Prabang and China, and{" "}
            <Link href="/guides/vientiane-to-thailand" transitionTypes={FORWARD}>
              crossing to Thailand
            </Link>
            . Or let the team{" "}
            <Link href="/trips" transitionTypes={FORWARD}>
              book your trains, buses and tours
            </Link>
            .
          </p>
        </Prose>
        <PhotoFrame caption="The Laos–China Railway" drawing="train" />
      </Block>

      <ReadNext paths={["/guides/from-wattay-airport", "/guides/lao-digital-immigration-form", "/guides/whats-nearby"]} />
      <BookingCard />
      <PageJsonLd path={pages.vientiane.path} />
    </>
  );
}
