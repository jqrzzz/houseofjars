import type { DrawingName } from "../art/drawings";

export interface GuideArt {
  /** Beside the question, on wide screens. */
  readonly header: DrawingName;
  /**
   * The header drawing is a whole scene with its own sky (a train, a bridge), not an object standing on its
   * own (a tuk-tuk, bags): in the guides' niches it stands on the sill as a pop-up card, kept whole.
   */
  readonly scene?: boolean;
  /** A drawing beside a section's text (shown on phones too), by section id. */
  readonly sections?: Readonly<Record<string, DrawingName>>;
}

/** The drawings each guide uses, by slug (content/guides.ts). */
const art: Readonly<Record<string, GuideArt>> = {
  "from-wattay-airport": { header: "tuktuk" },
  "lao-digital-immigration-form": { header: "luggage" },
  "laos-china-railway-tickets": { header: "train", scene: true },
  "getting-around-vientiane": { header: "bus", scene: true },
  "one-day-in-vientiane": { header: "arch", scene: true },
  "vientiane-to-thailand": { header: "bridge", scene: true },
  "whats-nearby": { header: "riverside", scene: true, sections: { "further-afield": "plain" } },
  "quiet-hostel-vientiane": { header: "pod-plain", sections: { "good-to-know": "luggage" } },
};

export function guideArt(slug: string): GuideArt {
  const found = art[slug];
  if (!found) throw new Error(`No drawings for the guide "${slug}" in components/guide/art.ts`);
  return found;
}
