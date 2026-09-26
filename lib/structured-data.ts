import { immigration, location } from "@/content/area";
import { firm, isFirm } from "@/content/certainty";
import { guides, type Guide } from "@/content/guides";
import { identity } from "@/content/identity";
import { amenities, beds, breakfast, building, staff, times } from "@/content/stay";
import { lowerFirst } from "@/content/text";
import { breadcrumbTrail, metaTitle, type SitePage } from "./pages";
import { absoluteUrl, siteUrl } from "./site";

/*
 * schema.org data (JSON-LD) for each page: the WebSite, the Hostel behind
 * it, the page itself and its breadcrumbs, in one graph. Facts are read only
 * through firm(), so structured data carries what the house has confirmed,
 * its own listings and official sources, and never what only guests say,
 * a single source, general practice or an assumption (content/certainty.ts).
 *
 * Deliberately absent: ratings and reviews (they belong to other platforms,
 * and self-serving review markup breaks search engines' rules), prices and
 * offers (the site publishes no rates), and the map position until the
 * house gives it. The Hostel node is the house's Organization too
 * (schema.org's Hostel descends from Organization), so it carries the logo
 * and the sameAs links.
 */

type JsonLdNode = Record<string, unknown>;

const WEBSITE_ID = `${siteUrl}/#website`;
const HOSTEL_ID = `${siteUrl}/#hostel`;

/** BCP 47 codes for the languages the team speaks (schema.org asks for them). */
export const LANGUAGE_CODES: Readonly<Record<string, string>> = { English: "en", Lao: "lo", Thai: "th" };
/** ISO 3166 codes for the address. */
export const COUNTRY_CODES: Readonly<Record<string, string>> = { Laos: "LA" };
const EVERY_DAY = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
  (day) => `https://schema.org/${day}`,
);

/** Leaves out properties with nothing to say (a fact that isn't firm, or isn't known yet). */
function compact(node: JsonLdNode): JsonLdNode {
  return Object.fromEntries(
    Object.entries(node).filter(([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0)),
  );
}

/** "14:00" -> "14:00:00", schema.org's Time. */
const asTime = (value: string | undefined) => (value && /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : undefined);

function feature(name: string): JsonLdNode {
  return { "@type": "LocationFeatureSpecification", name, value: true };
}

function postalAddress(): JsonLdNode | undefined {
  const { street, village, district, city, country } = identity.address;
  const parts = [firm(street), firm(village), firm(district), firm(city), firm(country)];
  if (parts.some((part) => part === undefined)) return undefined;
  const countryCode = COUNTRY_CODES[country.value];
  return {
    "@type": "PostalAddress",
    streetAddress: `${street.value}, ${village.value}, ${district.value}`,
    addressLocality: "Vientiane",
    addressRegion: city.value,
    ...(countryCode ? { addressCountry: countryCode } : {}),
  };
}

function languages(): JsonLdNode[] | undefined {
  return firm(staff.languages)?.flatMap((language) => {
    const code = LANGUAGE_CODES[language];
    return code ? [{ "@type": "Language", name: language, alternateName: code }] : [];
  });
}

/** One paragraph about the house, from firm facts only. */
function hostelDescription(): string | undefined {
  const neighbourhood = firm(location.neighbourhood);
  const country = firm(identity.address.country);
  const style = firm(beds.style);
  const cafe = firm(building.cafe);
  const hours = firm(staff.hours);
  const owner = firm(identity.owner.name);
  const sentences = [
    neighbourhood && country ? `A dorm hostel in ${neighbourhood}, ${country}.` : undefined,
    style ? `${style}.` : undefined,
    firm(breakfast.included) && cafe ? `Breakfast included; ${lowerFirst(cafe)}.` : undefined,
    hours ? `Staff ${lowerFirst(hours.summary)}.` : undefined,
    owner ? `Owned and run by ${owner}.` : undefined,
  ].filter((sentence): sentence is string => Boolean(sentence));
  return sentences.length > 0 ? sentences.join(" ") : undefined;
}

function hostelNode(): JsonLdNode | undefined {
  const name = firm(identity.fullName);
  if (!name) return undefined;
  const { links, contact } = identity;
  const hours = firm(staff.hours);
  const geo = firm(location.geo);
  const spoken = languages();
  const perBed = firm(beds.perBed);
  const nonSmoking = amenities.some((amenity) => amenity.value.schemaName === "Non-smoking" && isFirm(amenity));

  return compact({
    "@type": "Hostel",
    "@id": HOSTEL_ID,
    name,
    alternateName: firm(identity.name),
    url: `${siteUrl}/`,
    logo: absoluteUrl("/logo.png"),
    image: absoluteUrl("/opengraph-image"),
    description: hostelDescription(),
    telephone: firm(contact.phone)?.e164,
    email: firm(contact.email),
    address: postalAddress(),
    geo: geo ? { "@type": "GeoCoordinates", latitude: geo.latitude, longitude: geo.longitude } : undefined,
    sameAs: [links.booking, links.agoda, links.tripadvisor, links.facebook].flatMap((link) => firm(link) ?? []),
    checkinTime: asTime(firm(times.checkIn)),
    checkoutTime: asTime(firm(times.checkOut)),
    openingHoursSpecification: hours
      ? { "@type": "OpeningHoursSpecification", dayOfWeek: EVERY_DAY, opens: asTime(hours.opens), closes: asTime(hours.closes) }
      : undefined,
    smokingAllowed: nonSmoking ? false : undefined,
    availableLanguage: spoken,
    knowsLanguage: spoken,
    amenityFeature: amenities.flatMap((amenity) => (isFirm(amenity) ? [feature(amenity.value.schemaName)] : [])),
    containsPlace: firm(beds.roomTypes)?.map((roomType) =>
      compact({
        "@type": "Room",
        name: roomType,
        description: firm(beds.style),
        amenityFeature: perBed?.map(feature),
      }),
    ),
  });
}

/** What a guide is about, besides the house. */
function guideSubjects(guide: Guide): { about?: JsonLdNode[]; mentions?: JsonLdNode[] } {
  const { airport, mekong, museum } = location.nearby;
  if (guide === guides.fromTheAirport) {
    const place = firm(airport)?.place;
    return place ? { about: [{ "@type": "Airport", name: place }] } : {};
  }
  if (guide === guides.immigrationForm) {
    const form = firm(immigration.ldif);
    return form ? { about: [{ "@type": "GovernmentService", name: form.name, url: form.url }] } : {};
  }
  if (guide === guides.nearby) {
    const river = firm(mekong)?.place;
    const museumName = firm(museum)?.place;
    return {
      mentions: [
        ...(river ? [{ "@type": "Place", name: river }] : []),
        ...(museumName ? [{ "@type": "Museum", name: museumName }] : []),
      ],
    };
  }
  return {};
}

function webPageNode(page: SitePage, has: { hostel: boolean; breadcrumbs: boolean }): JsonLdNode {
  const url = absoluteUrl(page.path);
  const subjects = page.guide ? guideSubjects(page.guide) : {};
  return compact({
    "@type": page.type,
    "@id": `${url}#webpage`,
    url,
    name: metaTitle(page),
    isPartOf: { "@id": WEBSITE_ID },
    about: [...(has.hostel ? [{ "@id": HOSTEL_ID }] : []), ...(subjects.about ?? [])],
    mentions: subjects.mentions,
    inLanguage: "en-GB",
    dateModified: page.updated,
    lastReviewed: page.reviewed,
    breadcrumb: has.breadcrumbs ? { "@id": `${url}#breadcrumb` } : undefined,
    relatedLink: page.guide?.related.map(absoluteUrl),
  });
}

function breadcrumbNode(page: SitePage): JsonLdNode | undefined {
  const trail = breadcrumbTrail(page);
  if (trail.length === 0) return undefined;
  return {
    "@type": "BreadcrumbList",
    "@id": `${absoluteUrl(page.path)}#breadcrumb`,
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** The whole graph for one page. */
export function pageJsonLd(page: SitePage): { "@context": "https://schema.org"; "@graph": JsonLdNode[] } {
  const breadcrumbs = breadcrumbNode(page);
  const hostel = hostelNode();
  const website = compact({
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${siteUrl}/`,
    name: firm(identity.name),
    alternateName: firm(identity.fullName),
    inLanguage: "en-GB",
    publisher: hostel ? { "@id": HOSTEL_ID } : undefined,
  });
  const webpage = webPageNode(page, { hostel: Boolean(hostel), breadcrumbs: Boolean(breadcrumbs) });
  return {
    "@context": "https://schema.org",
    "@graph": [website, ...(hostel ? [hostel] : []), webpage, ...(breadcrumbs ? [breadcrumbs] : [])],
  };
}
