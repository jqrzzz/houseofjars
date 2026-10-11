/**
 * The house profile for Shadow Check-in: what the website knows about the
 * house, in the shape Shadow imports (its console, "House profiles"), so the
 * house's Shadow starts filled in: the property's details, its rooms and
 * beds, the facts Shadow answers from, and the house rules guests read.
 *
 * Built from the same content as the pages (content/) and the house model
 * (lib/house/), so it says what the site says. `npm run shadow:profile`
 * writes it to shadow/house-profile.json; a test fails while the committed
 * file differs from a fresh build. Shadow's own copy is in its repository
 * (lib/house-profile/profiles/); its docs/HOUSE_PROFILE.md has the format.
 */
import { faq, type FaqGroup } from "@/content/faq";
import { formatAddress, identity } from "@/content/identity";
import { inlineToTextWithUrls } from "@/content/inline";
import { beds, building, rules, staff, times } from "@/content/stay";
import { countWord, joinList, lowerFirst } from "@/content/text";
import { houseOfJars } from "@/lib/house/house-of-jars";
import type { Fixture, HouseModel } from "@/lib/house/types";

export const PROFILE_FORMAT = "shadow-house-profile";
export const PROFILE_VERSION = 1;

/** The public site the profile's links point to, whatever NEXT_PUBLIC_SITE_URL says (a preview's address would not last). */
const PUBLIC_SITE = "https://www.houseofjars.la";

export type FactCategory = "pricing" | "policies" | "operations" | "facilities" | "local_tips" | "faqs";

export interface ProfileFact {
  readonly content: string;
  readonly category: FactCategory;
  /** Who Shadow may tell: guests, or the team only. */
  readonly audience: "guests" | "team";
  /** Where on the site it comes from. */
  readonly source: string;
}

export interface ProfileBed {
  /** The pod's number, as on the bed register and its locker: "H01". */
  readonly name: string;
  readonly type: "top_bunk" | "bottom_bunk";
  readonly features: readonly ("curtain" | "reading_light" | "socket")[];
}

export interface ProfileRoom {
  readonly name: string;
  readonly kind: "mixed_dorm" | "female_dorm" | "male_dorm" | "private";
  readonly bathroom: "shared" | "ensuite";
  /** 0 for the ground floor, 1 for the 1st floor, as Shadow counts them. */
  readonly floor: number;
  /** For guests. */
  readonly description: string;
  readonly features: readonly string[];
  /** For the team only. */
  readonly staffNotes: string;
  readonly beds: readonly ProfileBed[];
}

export interface HouseProfile {
  readonly format: typeof PROFILE_FORMAT;
  readonly version: typeof PROFILE_VERSION;
  readonly house: string;
  /** Where it was made from, for the person importing it. */
  readonly from: string;
  readonly property: {
    readonly name: string;
    readonly type: "guesthouse" | "hostel" | "hotel" | "homestay";
    readonly address: string;
    readonly district: string;
    readonly province: string;
    readonly phone: string;
    /** ISO 3166-1 alpha-2. */
    readonly country: string;
    readonly timezone: string;
    /** The currency prices and bills are in (ISO 4217). */
    readonly currency: string;
  };
  readonly rooms: readonly ProfileRoom[];
  readonly facts: readonly ProfileFact[];
  readonly houseRules: { readonly title: string; readonly rules: readonly string[] };
}

/** The FAQ groups, as the kind of fact each answers. */
const FAQ_CATEGORY: Readonly<Record<string, FactCategory>> = {
  "Arriving and leaving": "policies",
  "The house": "facilities",
  Booking: "pricing",
  "The neighbourhood": "local_tips",
  "Travelling on": "local_tips",
  "About us": "faqs",
};

/**
 * Answers left out: the website's concierge describing itself (Shadow in the
 * house's own Shadow is the team's assistant), and the name's story, which
 * the house has not confirmed (content/identity.ts).
 */
const FAQ_LEFT_OUT = new Set(["shadow", "name"]);

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

/** "08:00–19:00" as "08:00 to 19:00". */
const span = (hours: string) => hours.replace("–", " to ");

function faqFacts(groups: readonly FaqGroup[], url: string): ProfileFact[] {
  return groups.flatMap((group) => {
    const category = FAQ_CATEGORY[group.title];
    if (!category) throw new Error(`The FAQ group "${group.title}" has no fact category: add it to FAQ_CATEGORY.`);
    return group.entries
      .filter((entry) => !FAQ_LEFT_OUT.has(entry.id))
      .map((entry) => ({
        content: oneLine(`${entry.question} ${inlineToTextWithUrls(entry.answer, url)}`),
        category,
        audience: "guests" as const,
        source: `The website's FAQ (${entry.id})`,
      }));
  });
}

const count = (fixtures: readonly Fixture[], type: Fixture["type"]) => fixtures.filter((f) => f.type === type).length;

/** "the 1st floor" from the model's floor names. */
function floorName(model: HouseModel, floorId: string): string {
  const floor = model.floors.find((f) => f.id === floorId);
  if (!floor) throw new Error(`No floor ${floorId} in the model.`);
  return `the ${floor.name}`;
}

/** The dorms (the model's sleeping areas), with their pods as beds, in the bed register's order. */
function rooms(model: HouseModel): ProfileRoom[] {
  const dorms = model.areas.filter((area) => area.kind === "sleep");
  const baths = model.areas.filter((area) => area.kind === "wash" && /bathroom/i.test(area.name));
  // "Bathrooms are shared: the women's on the 1st floor and the men's on the 2nd floor."
  const bathroomsLine = `Bathrooms are shared: ${joinList(baths.map((bath) => `the ${lowerFirst(bath.name.replace(/ bathroom$/i, ""))} on ${floorName(model, bath.floor)}`))}.`;
  return dorms.map((dorm) => {
    const pods = model.fixtures
      .filter((f) => f.area === dorm.id && f.type === "pod")
      .sort((a, b) => (a.label ?? "").localeCompare(b.label ?? "", "en", { numeric: true }));
    const level = model.floors.find((f) => f.id === dorm.floor)?.level;
    if (level === undefined) throw new Error(`No floor for ${dorm.name}.`);
    const top = pods.filter((pod) => /\bupper\b/.test(pod.variant ?? ""));
    const lockers = count(model.fixtures.filter((f) => f.area === dorm.id), "locker");
    const skipped = joinList(beds.numbering.value.skipped.map(String));
    return {
      name: dorm.name,
      kind: "mixed_dorm" as const,
      bathroom: "shared" as const,
      floor: level,
      description: oneLine(
        `${pods.length} pods on ${floorName(model, dorm.floor)}, in stacks of two. Every pod is its own cubicle with a privacy curtain, a reading light and a personal power socket${lockers === pods.length ? ", and a locker with the pod's number" : ""}. ${bathroomsLine}`,
      ),
      features: ["Pods with privacy curtains", "Reading light and socket in every pod", "A numbered locker for every pod", "Air-conditioning"],
      staffNotes: oneLine(
        `Pods are numbered as on the bed register, without ${skipped}, ${beds.numbering.value.why}. Top bunks, up a ladder: ${top.map((pod) => pod.label).join(", ")}. Each locker has its pod's number.`,
      ),
      beds: pods.map((pod) => ({
        name: pod.label ?? pod.id,
        type: /\bupper\b/.test(pod.variant ?? "") ? ("top_bunk" as const) : ("bottom_bunk" as const),
        features: ["curtain", "reading_light", "socket"] as const,
      })),
    };
  });
}

/** What the site says beyond its FAQ: the address, the hours, the floors, the bathrooms and the pods. */
function moreFacts(model: HouseModel): ProfileFact[] {
  const { phone, email } = identity.contact;
  const dorms = model.areas.filter((area) => area.kind === "sleep");
  const baths = model.areas.filter((area) => area.kind === "wash" && /bathroom/i.test(area.name));
  const bath = baths[0];
  const inBath = bath ? model.fixtures.filter((f) => f.area === bath.id) : [];
  const cubbies = model.fixtures.find((f) => f.type === "shoe-cubbies");
  const firstDorm = dorms[0];
  const numbers = model.fixtures
    .filter((f) => f.area === firstDorm?.id && f.type === "pod")
    .map((pod) => Number((pod.label ?? "").replace(/\D/g, "")))
    .sort((a, b) => a - b);
  const two = (n: number | undefined) => String(n ?? 0).padStart(2, "0");
  const facts: ProfileFact[] = [
    {
      content: `${identity.name.value} is at ${formatAddress()}. Phone and WhatsApp: ${phone.value.display}. Email: ${email.value}.`,
      category: "faqs",
      audience: "guests",
      source: "content/identity.ts",
    },
    {
      content: `Coffee and tea are served in the café on the ground floor from ${span(building.cafeDrinks.value)}.`,
      category: "facilities",
      audience: "guests",
      source: "content/stay.ts (building.cafeDrinks)",
    },
    {
      content: oneLine(
        `The house has ${lowerFirst(countWord(model.floors.length))} floors: the ground floor, with the café and its counter, which is also the front desk; ${dorms
          .map((dorm) => {
            const sameFloor = baths.find((b) => b.floor === dorm.floor);
            return `${floorName(model, dorm.floor)}, with ${dorm.name}${sameFloor ? ` and the ${sameFloor.name.toLowerCase()}` : ""}`;
          })
          .join("; and ")}.${cubbies ? ` Every guest leaves their shoes in the cubbies on ${floorName(model, cubbies.floor)} landing.` : ""}`,
      ),
      category: "facilities",
      audience: "guests",
      source: "The house model (lib/house/house-of-jars.ts)",
    },
    {
      content: `Each dorm has ${numbers.length} pods in stacks of two, numbered ${two(numbers[0])} to ${two(numbers.at(-1))} without ${joinList(beds.numbering.value.skipped.map(String))}, ${beds.numbering.value.why}. Each pod has a locker with the same number.`,
      category: "facilities",
      audience: "guests",
      source: "content/stay.ts (beds.numbering) and the house model",
    },
  ];
  if (bath) {
    facts.push({
      content: `Each bathroom has ${count(inBath, "shower")} hot showers, ${count(inBath, "toilet")} toilets and ${count(inBath, "basin")} basins, with a hand dryer and a hair dryer.`,
      category: "facilities",
      audience: "guests",
      source: "The house model (lib/house/house-of-jars.ts)",
    });
  }
  if (times.quietHours) {
    facts.push({
      content: `Quiet hours are ${span(times.quietHours.value)}, and guests keep their voices down at all times: most guests come here to sleep well.`,
      category: "policies",
      audience: "guests",
      source: "content/stay.ts (times.quietHours)",
    });
  }
  facts.push({
    content: `The team looks over and cleans the house ${staff.housekeepingRound.value}.`,
    category: "operations",
    audience: "team",
    source: "content/stay.ts (staff.housekeepingRound)",
  });
  return facts;
}

/** The house rules guests read on the tablet: each rule with its reason, as on the website's house rules page. */
function houseRules(): HouseProfile["houseRules"] {
  return {
    title: "House rules",
    rules: [...rules.house, ...rules.stay].map((rule) => oneLine(`${rule.value.rule} ${rule.value.why}`)),
  };
}

export function buildShadowProfile(url: string = PUBLIC_SITE, model: HouseModel = houseOfJars): HouseProfile {
  const a = identity.address;
  return {
    format: PROFILE_FORMAT,
    version: PROFILE_VERSION,
    house: identity.name.value,
    from: "The House of Jars website: content/ and the house model (lib/house/)",
    property: {
      name: identity.name.value,
      type: "hostel",
      address: `${a.street.value}, ${a.village.value}`,
      district: a.district.value,
      province: a.city.value,
      phone: identity.contact.phone.value.display,
      // Vientiane, Laos; the house's prices are in kip (the house rules board).
      country: "LA",
      timezone: "Asia/Vientiane",
      currency: "LAK",
    },
    rooms: rooms(model),
    facts: [...faqFacts(faq, url), ...moreFacts(model)],
    houseRules: houseRules(),
  };
}

/** The profile as the committed file holds it. */
export function profileJson(profile: HouseProfile = buildShadowProfile()): string {
  return `${JSON.stringify(profile, null, 2)}\n`;
}
