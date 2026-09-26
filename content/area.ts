import { fact, type Fact } from "./fact";
import { sources } from "./sources";

export interface Distance {
  readonly place: string;
  readonly distance: string;
}

export const location = {
  neighbourhood: fact("Ban Anou, in Chanthabouly District, central Vientiane", sources.booking),
  /** Map coordinates are unknown. Add them here to enable geo data. */
  geo: null as Fact<{ latitude: number; longitude: number }> | null,
  nearby: {
    mekong: fact<Distance>({ place: "Mekong riverside", distance: "7 minutes' walk" }, sources.booking),
    museum: fact<Distance>({ place: "Lao National Museum", distance: "8 minutes' walk" }, sources.booking),
    nightMarket: fact<Distance>({ place: "Night food market", distance: "Next door" }, sources.reviews),
    airport: fact<Distance>(
      { place: "Wattay International Airport", distance: "About 3 km (1.9 mi)" },
      sources.booking,
    ),
  },
} as const;

export const airportTransport = fact(
  "The team can arrange transport from the airport: message them with your arrival time.",
  sources.reviews,
);

export const immigration = {
  ldif: fact(
    {
      name: "Lao Digital Immigration Form (LDIF)",
      url: "https://immigration.gov.la/en/registration/arrival/arrival-info",
      summary:
        "Travellers can complete the Lao Digital Immigration Form online before arrival. It was introduced in stages from September 2025 at some entry points, with wider rollout planned, so check the official page for your entry point.",
    },
    sources.immigration,
    { note: "Rollout is changing; re-check the official page before relying on details." },
  ),
  registration: fact(
    "Guesthouses in Laos register foreign guests with the local authorities, so please have your passport with you at check-in.",
    sources.laoLaw,
    { note: "Please confirm this matches how the house registers guests." },
  ),
} as const;

export const plainOfJars = {
  summary: fact(
    "The Plain of Jars in Xieng Khouang province holds thousands of Iron Age stone jars. It has been a UNESCO World Heritage Site since 2019.",
    sources.unesco,
    { confirmed: true },
  ),
} as const;
