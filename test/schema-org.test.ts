import { describe, expect, it } from "vitest";
import { isA, propertyRange, validateJsonLd } from "./schema-org";

const doc = (...graph: object[]) => ({ "@context": "https://schema.org", "@graph": graph });

describe("the schema.org vocabulary", () => {
  it("knows the type hierarchy the site relies on", () => {
    expect(isA("Hostel", "Organization")).toBe(true);
    expect(isA("Hostel", "Place")).toBe(true);
    expect(isA("Room", "Place")).toBe(true);
    expect(isA("CollectionPage", "CreativeWork")).toBe(true);
    expect(isA("PostalAddress", "Place")).toBe(false);
  });

  it("lets a type use its ancestors' properties", () => {
    expect(propertyRange(["Hostel"], "logo")).toEqual(["ImageObject", "URL"]);
    expect(propertyRange(["Hostel"], "smokingAllowed")).toEqual(["Boolean"]);
    expect(propertyRange(["WebSite"], "lastReviewed")).toBeNull();
  });
});

describe("validateJsonLd", () => {
  const hostel = {
    "@type": "Hostel",
    "@id": "https://example.org/#hostel",
    name: "A hostel",
    url: "https://example.org/",
    checkinTime: "14:00:00",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["https://schema.org/Monday"],
      opens: "00:00:00",
      closes: "23:59:00",
    },
  };

  it("accepts a valid graph with references between its nodes", () => {
    expect(
      validateJsonLd(
        doc(hostel, {
          "@type": "WebPage",
          "@id": "https://example.org/#webpage",
          url: "https://example.org/",
          about: { "@id": "https://example.org/#hostel" },
          lastReviewed: "2026-09-26",
        }),
      ),
    ).toEqual([]);
  });

  it("rejects types and properties schema.org doesn't have", () => {
    expect(validateJsonLd(doc({ "@type": "Hostal", name: "x" }))).toContain("@graph[0]: unknown type Hostal");
    expect(validateJsonLd(doc({ ...hostel, starRatings: 5 }))).toContain(
      'https://example.org/#hostel: schema.org has no property "starRatings" for Hostel',
    );
    expect(validateJsonLd(doc({ "@type": "WebSite", lastReviewed: "2026-09-26" }))[0]).toMatch(/no property "lastReviewed"/);
  });

  it("rejects values of the wrong kind", () => {
    const problems = validateJsonLd(
      doc({ ...hostel, checkinTime: "2pm", url: "example.org", smokingAllowed: "no", telephone: 12345 }),
    );
    expect(problems).toHaveLength(4);
    expect(validateJsonLd(doc({ "@type": "WebPage", lastReviewed: "2026-02-30" }))).toHaveLength(1);
    expect(
      validateJsonLd(
        doc({ ...hostel, openingHoursSpecification: { ...hostel.openingHoursSpecification, dayOfWeek: "Mondays" } }),
      ),
    ).toHaveLength(1);
  });

  it("rejects nested nodes of the wrong type, and references to nothing", () => {
    expect(validateJsonLd(doc({ ...hostel, address: { "@type": "GeoCoordinates", latitude: 1 } }))[0]).toMatch(
      /GeoCoordinates is not a PostalAddress or Text/,
    );
    expect(validateJsonLd(doc({ "@type": "WebPage", about: { "@id": "https://example.org/#missing" } }))[0]).toMatch(
      /nothing in the document has @id/,
    );
    expect(validateJsonLd(doc({ "@type": "WebPage", breadcrumb: { "@id": "https://example.org/#hostel" } }, hostel))[0]).toMatch(
      /a Hostel is not a BreadcrumbList or Text/,
    );
  });

  it("rejects a missing context, a missing type and duplicate ids", () => {
    expect(validateJsonLd({ "@graph": [hostel] })).toContain('@context is not "https://schema.org"');
    expect(validateJsonLd(doc({ name: "no type" }))).toContain("@graph[0]: no @type");
    expect(validateJsonLd(doc(hostel, hostel))).toContain("https://example.org/#hostel: more than one node has this @id");
    expect(validateJsonLd("not json-ld")).toEqual(["the document is not a JSON object"]);
  });
});
