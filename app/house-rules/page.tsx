import { BookingCard } from "@/components/BookingCard";
import { Drawing } from "@/components/art/Drawing";
import { Block } from "@/components/page/Block";
import { RuleList, Steps, type Step } from "@/components/page/Lists";
import { PageHeader } from "@/components/page/PageHeader";
import { airportTransport, immigration } from "@/content/area";
import { whatsappUrl } from "@/content/identity";
import { beds, rules, times } from "@/content/stay";
import { joinList, lowerFirst } from "@/content/text";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";

export const metadata = pageMetadata(pages.rules);

const houseRules = [
  ...rules.house.map((rule) => rule.value),
  ...(times.quietHours ? [{ rule: `Quiet hours are ${times.quietHours.value}.`, why: "So everyone can sleep." }] : []),
];

const { ldif, registration } = immigration;

const arrival: Step[] = [
  {
    title: "Before you travel",
    body: (
      <p>
        {ldif.value.summary}{" "}
        <a href={ldif.value.url} target="_blank" rel="noopener noreferrer">
          Official information on the {ldif.value.name}
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
        .
      </p>
    ),
  },
  {
    title: "On the way",
    body: (
      <p>
        <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
          Message the team on WhatsApp
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>{" "}
        with your arrival time. {airportTransport.value}
      </p>
    ),
  },
  {
    title: "At the desk",
    body: <p>{registration.value}</p>,
  },
  {
    title: "Your pod",
    body: (
      <p>
        Check-in is from {times.checkIn.value}. Early check-in: {lowerFirst(times.earlyCheckIn.value)}. Your pod has{" "}
        {joinList(beds.perBed.value.map((item) => `a ${item.toLowerCase()}`))}.
      </p>
    ),
  },
];

export default function HouseRulesPage() {
  return (
    <>
      <PageHeader
        eyebrow="House rules"
        morph="house-rules"
        title="A few rules keep the house calm."
        lede="Each one comes with the reason behind it. Most are about sleep: this is a house for resting, not for parties."
        art={<Drawing name="door" />}
      />

      <Block id="in-the-house" title="In the house">
        <RuleList rules={houseRules} />
      </Block>

      <Block id="your-stay" title="Your stay">
        <RuleList rules={rules.stay.map((rule) => rule.value)} />
      </Block>

      <Block id="arrival" title="When you arrive" tone="cream" aside="Four steps from the airport to your pod.">
        <Steps steps={arrival} />
      </Block>

      <BookingCard />
    </>
  );
}
