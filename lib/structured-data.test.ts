import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { location } from "@/content/area";
import { isFirm } from "@/content/certainty";
import { identity } from "@/content/identity";
import { amenities, beds, staff, times } from "@/content/stay";
import { bathrooms } from "@/content/stay";
import { isA, typesOf, validateJsonLd } from "@/test/schema-org";
import { collectFacts, factsMentionedIn } from "./content-audit";
import { allPages, findPage } from "./pages";
import { absoluteUrl } from "./site";
import { COUNTRY_CODES, LANGUAGE_CODES, pageJsonLd } from "./structured-data";

type Node = Record<string, unknown>;

const graphOf = (path: string) => pageJsonLd(findPage(path))["@graph"] as Node[];
const nodeOfType = (graph: Node[], type: string) => graph.filter((node) => typesOf(node).some((t) => isA(t, type)));

/** Facts that may not be stated plainly: what guests say, one source, general practice, assumptions. */
const softFacts = collectFacts(content, "content").filter((found) => !isFirm(found.fact));

describe("structured data on every page", () => {
  it.each(allPages.map((page) => [page.path, page] as const))("%s is valid schema.org", (_, page) => {
    expect(validateJsonLd(pageJsonLd(page))).toEqual([]);
  });

  it.each(allPages.map((page) => [page.path, page] as const))(
    "%s states no unconfirmed fact as certain",
    (_, page) => {
      const json = JSON.stringify(pageJsonLd(page));
      expect(factsMentionedIn(json, softFacts).map((found) => found.path)).toEqual([]);
      // Nothing a search engine would read as the house's own ratings, reviews or prices.
      for (const key of ["aggregateRating", "review", "makesOffer", "offers", "priceRange", "price"]) {
        expect(json).not.toContain(`"${key}"`);
      }
    },
  );

  it("would catch a guest's word or an assumption slipping into the data", () => {
    const leaked = JSON.stringify({ description: `Bathrooms ${bathrooms.cleaning.value.toLowerCase()}.`, note: identity.nameStory.value });
    expect(factsMentionedIn(leaked, softFacts).map((found) => found.path)).toEqual([
      "content.identity.nameStory",
      "content.bathrooms.cleaning",
    ]);
  });

  it.each(allPages.map((page) => [page.path, page] as const))("%s describes itself as a page of the site", (_, page) => {
    const graph = pageJsonLd(page)["@graph"] as Node[];
    const [webpage, ...others] = nodeOfType(graph, "WebPage");
    expect(others).toEqual([]);
    expect(webpage).toMatchObject({
      "@type": page.type,
      url: absoluteUrl(page.path),
      isPartOf: { "@id": expect.stringMatching(/#website$/) },
      about: expect.arrayContaining([{ "@id": expect.stringMatching(/#hostel$/) }]),
      dateModified: page.updated,
    });
    expect(nodeOfType(graph, "WebSite")).toHaveLength(1);
    expect(nodeOfType(graph, "Hostel")).toHaveLength(1);
  });
});

describe("breadcrumbs", () => {
  it("are left off the home page", () => {
    expect(nodeOfType(graphOf("/"), "BreadcrumbList")).toEqual([]);
  });

  it("run from Home down to every inner page, numbered from 1", () => {
    for (const page of allPages.filter((candidate) => candidate.path !== "/")) {
      const [list] = nodeOfType(graphOf(page.path), "BreadcrumbList");
      const items = list!.itemListElement as Node[];
      expect(items.map((item) => item.position)).toEqual(items.map((_, index) => index + 1));
      expect(items[0]).toMatchObject({ name: "Home", item: absoluteUrl("/") });
      expect(items.at(-1)).toMatchObject({ item: absoluteUrl(page.path) });
      expect(items.every((item) => typeof item.name === "string" && item.name.length > 0)).toBe(true);
    }
  });

  it("put guides under the guides page", () => {
    const [list] = nodeOfType(graphOf("/guides/from-wattay-airport"), "BreadcrumbList");
    expect((list!.itemListElement as Node[]).map((item) => item.name)).toEqual(["Home", "Guides", "From the airport"]);
  });
});

describe("the hostel", () => {
  const [hostel] = nodeOfType(graphOf("/"), "Hostel") as [Node];

  it("is the house's organisation, with its logo and profiles elsewhere", () => {
    expect(typesOf(hostel).some((type) => isA(type, "Organization"))).toBe(true);
    expect(hostel.logo).toBe(absoluteUrl("/logo.png"));
    expect(hostel.sameAs).toEqual([
      identity.links.booking.value,
      identity.links.agoda.value,
      identity.links.tripadvisor.value,
      identity.links.facebook.value,
    ]);
    expect(hostel).toMatchObject({
      name: identity.fullName.value,
      alternateName: identity.name.value,
      telephone: identity.contact.phone.value.e164,
      email: identity.contact.email.value,
      address: { addressCountry: COUNTRY_CODES[identity.address.country.value] },
    });
  });

  it("gives check-in and check-out times and round-the-clock opening hours from the content", () => {
    expect(hostel.checkinTime).toBe(`${times.checkIn.value}:00`);
    expect(hostel.checkoutTime).toBe(`${times.checkOut.value}:00`);
    expect(hostel.openingHoursSpecification).toMatchObject({
      dayOfWeek: expect.arrayContaining(["https://schema.org/Monday", "https://schema.org/Sunday"]),
      opens: `${staff.hours.value.opens}:00`,
      closes: `${staff.hours.value.closes}:00`,
    });
    expect((hostel.openingHoursSpecification as Node).dayOfWeek).toHaveLength(7);
  });

  it("names the team's languages with their codes", () => {
    for (const language of staff.languages.value) expect(LANGUAGE_CODES[language]).toMatch(/^[a-z]{2,3}$/);
    const spoken = staff.languages.value.map((name) => ({ "@type": "Language", name, alternateName: LANGUAGE_CODES[name] }));
    expect(hostel.knowsLanguage).toEqual(spoken);
    expect(hostel.availableLanguage).toEqual(spoken);
  });

  it("lists only the amenities it may state plainly, and the room types with their beds", () => {
    const names = (hostel.amenityFeature as Node[]).map((feature) => feature.name);
    expect(names).toEqual(amenities.filter(isFirm).map((amenity) => amenity.value.schemaName));
    // Strong air-conditioning is what guests say; it joins the data once the house confirms it.
    expect(names).not.toContain("Air conditioning");
    expect(hostel.containsPlace).toEqual(
      beds.roomTypes.value.map((name) => expect.objectContaining({ "@type": "Room", name, description: beds.style.value })),
    );
    expect(hostel.smokingAllowed).toBe(false);
  });

  it("leaves out the map position until the house gives it", () => {
    expect(location.geo).toBeNull();
    expect(hostel).not.toHaveProperty("geo");
  });
});

describe("what the guides are about", () => {
  it("names the airport, the immigration form, the places nearby and the border bridge", () => {
    const about = (path: string) => nodeOfType(graphOf(path), "WebPage")[0]!;
    expect(about("/guides/from-wattay-airport").about).toContainEqual({ "@type": "Airport", name: "Wattay International Airport" });
    expect(about("/guides/lao-digital-immigration-form").about).toContainEqual(
      expect.objectContaining({ "@type": "GovernmentService", url: "https://immigration.gov.la/en/registration/arrival/arrival-info" }),
    );
    expect(about("/guides/whats-nearby").mentions).toEqual([{ "@type": "Place", name: "Mekong riverside" }]);
    expect(about("/guides/vientiane-to-thailand").about).toContainEqual({ "@type": "Place", name: "First Thai–Lao Friendship Bridge" });
    expect(about("/guides/quiet-hostel-vientiane")).toMatchObject({ lastReviewed: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
  });
});

describe("what an assistant can do for a guest", () => {
  const withOnlineBooking = <T,>(run: () => T): T => {
    const saved = { url: process.env.SHADOW_API_URL, key: process.env.SHADOW_INQUIRY_KEY };
    process.env.SHADOW_API_URL = "https://shadow.example";
    process.env.SHADOW_INQUIRY_KEY = "sck_test";
    try {
      return run();
    } finally {
      if (saved.url === undefined) delete process.env.SHADOW_API_URL;
      else process.env.SHADOW_API_URL = saved.url;
      if (saved.key === undefined) delete process.env.SHADOW_INQUIRY_KEY;
      else process.env.SHADOW_INQUIRY_KEY = saved.key;
    }
  };

  it("offers no booking action while the site takes no bookings", () => {
    const [hostel] = nodeOfType(graphOf("/"), "Hostel");
    expect(hostel!.potentialAction).toBeUndefined();
  });

  it("offers a booking action that opens the booking page with the dates and guests filled in", () => {
    const [hostel] = withOnlineBooking(() => nodeOfType(graphOf("/"), "Hostel"));
    expect(validateJsonLd(withOnlineBooking(() => pageJsonLd(findPage("/"))))).toEqual([]);
    const action = hostel!.potentialAction as Node;
    expect(action["@type"]).toBe("ReserveAction");
    const target = action.target as Node;
    expect(target["@type"]).toBe("EntryPoint");
    expect(target.urlTemplate).toMatch(
      new RegExp(`^${absoluteUrl("/book").replace(/[.?]/g, "\\$&")}\\?check_in=\\{check_in\\}&check_out=\\{check_out\\}&guests=\\{guests\\}`),
    );
  });
});
