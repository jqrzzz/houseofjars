import { location } from "@/content/area";
import { identity } from "@/content/identity";
import { amenities, staff, times } from "@/content/stay";
import { pages, siteUrl } from "./site";

/**
 * schema.org data for the whole site: the WebSite and the Hostel behind it.
 * Deliberately no AggregateRating or Review markup: ratings shown on the
 * site belong to third-party platforms, and self-serving review markup is
 * against search engine guidelines.
 */
export function siteJsonLd() {
  const { address, contact, links } = identity;
  const hostelId = `${siteUrl}/#hostel`;
  const geo = location.geo?.value;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: identity.name.value,
        inLanguage: "en",
        publisher: { "@id": hostelId },
      },
      {
        "@type": "Hostel",
        "@id": hostelId,
        name: identity.fullName.value,
        alternateName: identity.name.value,
        url: `${siteUrl}/`,
        logo: `${siteUrl}/brand/jar.svg`,
        description: pages.home.description,
        telephone: contact.phone.value.e164,
        email: contact.email.value,
        address: {
          "@type": "PostalAddress",
          streetAddress: `${address.street.value}, ${address.village.value}, ${address.district.value}`,
          addressLocality: "Vientiane",
          addressRegion: address.city.value,
          addressCountry: "LA",
        },
        ...(geo ? { geo: { "@type": "GeoCoordinates", latitude: geo.latitude, longitude: geo.longitude } } : {}),
        sameAs: [links.booking.value, links.agoda.value, links.tripadvisor.value, links.facebook.value],
        checkinTime: times.checkIn.value,
        checkoutTime: times.checkOut.value,
        smokingAllowed: false,
        availableLanguage: [...staff.languages.value],
        amenityFeature: amenities.map((amenity) => ({
          "@type": "LocationFeatureSpecification",
          name: amenity.value.schemaName,
          value: true,
        })),
      },
    ],
  };
}
