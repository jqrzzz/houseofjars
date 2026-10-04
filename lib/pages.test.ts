import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { CONTENT_UPDATED, content } from "@/content";
import { location } from "@/content/area";
import { creditCues, isFirm, standingOf } from "@/content/certainty";
import { identity } from "@/content/identity";
import { times } from "@/content/stay";
import { collectFacts, factsMentionedIn } from "./content-audit";
import { allPages, bookPage, breadcrumbTrail, findPage, metaTitle, sitePages } from "./pages";
import { absoluteUrl } from "./site";

const softFacts = collectFacts(content, "content").filter((found) => !isFirm(found.fact));
const today = new Date().toISOString().slice(0, 10);

describe.each([
  ["without online booking", false],
  ["with online booking", true],
])("titles and descriptions, %s", (_, online) => {
  const allPages = sitePages(online);
  const titles = allPages.map(metaTitle);
  const descriptions = allPages.map((page) => page.description);

  it("fit in search results and say something different on every page", () => {
    for (const title of titles) expect(title.length, title).toBeLessThanOrEqual(70);
    for (const description of descriptions) {
      expect(description.length, description).toBeGreaterThanOrEqual(70);
      expect(description.length, description).toBeLessThanOrEqual(160);
    }
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect([...titles, ...descriptions].join(" ")).not.toMatch(/undefined|\[object Object\]/);
  });

  it("carry the house's name and place", () => {
    for (const title of titles) expect(title).toContain(identity.name.value);
    expect(titles.filter((title) => title.includes("Vientiane")).length).toBeGreaterThan(titles.length - 2);
  });

  it("quote times, distances and the phone number exactly as the content has them", () => {
    const text = [...titles, ...descriptions].join("\n");
    for (const time of text.match(/\b\d{2}:\d{2}\b/g) ?? []) expect([times.checkIn.value, times.checkOut.value]).toContain(time);
    const walks = Object.values(location.nearby).map((nearby) => nearby.value.distance.toLowerCase());
    for (const walk of text.match(/\d+ minutes’ walk/g) ?? []) expect(walks).toContain(walk);
    for (const km of text.match(/about \d+ km/gi) ?? []) {
      expect(location.nearby.airport.value.distance.toLowerCase().startsWith(km.toLowerCase())).toBe(true);
    }
    for (const phone of text.match(/\+\d[\d ]{7,}\d/g) ?? []) expect(phone).toBe(identity.contact.phone.value.display);
  });

  it("say who says so when they use what only guests say", () => {
    for (const page of allPages) {
      for (const { fact } of factsMentionedIn(`${metaTitle(page)} ${page.description}`, softFacts)) {
        const standing = standingOf(fact);
        if (standing in creditCues) expect(page.description).toMatch(creditCues[standing as keyof typeof creditCues]);
      }
    }
  });
});

describe("/book, with and without online booking (F1W-07)", () => {
  it("is named for what it does in each build", () => {
    expect(metaTitle(bookPage(true))).toBe("Book a bed · House of Jars Hostel, Vientiane");
    expect(bookPage(true).description).not.toMatch(/Live prices and free beds on Booking\.com/);
    expect(metaTitle(bookPage(false))).toBe("Book direct · House of Jars Hostel, Vientiane");
    const online = sitePages(true).find((page) => page.path === "/book")!;
    expect(online.title).toBe("Book a bed");
    expect(online.updated > CONTENT_UPDATED).toBe(true);
    expect(sitePages(false).find((page) => page.path === "/book")!.updated).toBe(CONTENT_UPDATED);
  });
});

describe("pages", () => {
  it("are all listed once, guides included", () => {
    const paths = allPages.map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toEqual(expect.arrayContaining(["/", "/guides", "/guides/from-wattay-airport", "/guides/quiet-hostel-vientiane"]));
    expect(() => findPage("/nowhere")).toThrow();
  });

  it("carry dates from the content, never before the facts were read or after today", () => {
    for (const page of allPages) {
      expect(page.updated >= CONTENT_UPDATED && page.updated <= today, `${page.path} ${page.updated}`).toBe(true);
      if (page.reviewed) expect(page.updated).toBe(page.reviewed);
    }
    expect(findPage("/guides").updated).toBe(
      allPages.filter((page) => page.guide).reduce((a, page) => (page.updated > a ? page.updated : a), CONTENT_UPDATED),
    );
  });

  it("give breadcrumbs from Home, named as in the navigation", () => {
    expect(breadcrumbTrail(findPage("/"))).toEqual([]);
    expect(breadcrumbTrail(findPage("/the-house"))).toEqual([
      { name: "Home", path: "/" },
      { name: "The house", path: "/the-house" },
    ]);
    expect(breadcrumbTrail(findPage("/guides/lao-digital-immigration-form")).map((crumb) => crumb.name)).toEqual([
      "Home",
      "Guides",
      "The immigration form",
    ]);
  });
});

describe("sitemap", () => {
  it("lists every page with the date its content last changed", () => {
    expect(sitemap()).toEqual(
      allPages.map((page) =>
        expect.objectContaining({ url: absoluteUrl(page.path), lastModified: page.updated }),
      ),
    );
  });
});
