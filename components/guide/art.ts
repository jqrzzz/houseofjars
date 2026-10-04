import type { DrawingName } from "../art/drawings";

export interface GuideArt {
  /** Beside the question, on wide screens. */
  readonly header: DrawingName;
  /** A drawing beside a section's text (shown on phones too), by section id. */
  readonly sections?: Readonly<Record<string, DrawingName>>;
}

/** The drawings each guide uses, by slug (content/guides.ts). */
const art: Readonly<Record<string, GuideArt>> = {
  "from-wattay-airport": { header: "tuktuk" },
  "lao-digital-immigration-form": { header: "luggage" },
  "laos-china-railway-tickets": { header: "train" },
  "getting-around-vientiane": { header: "bus" },
  "one-day-in-vientiane": { header: "arch" },
  "vientiane-to-thailand": { header: "bridge" },
  "whats-nearby": { header: "riverside", sections: { "further-afield": "plain" } },
  "quiet-hostel-vientiane": { header: "pod", sections: { "good-to-know": "luggage" } },
};

export function guideArt(slug: string): GuideArt {
  const found = art[slug];
  if (!found) throw new Error(`No drawings for the guide "${slug}" in components/guide/art.ts`);
  return found;
}
