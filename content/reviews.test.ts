import { describe, expect, it } from "vitest";
import { identity } from "./identity";
import { type Testimonial, ratings, reviewSites, shownTestimonials, testimonials } from "./reviews";

const quote = (over: Partial<Testimonial>): Testimonial => ({
  quote: "Spotless, and the quietest dorm I have slept in.",
  name: "Ana",
  from: "Spain",
  platform: "Booking.com",
  month: "2026-09",
  topic: "sleep",
  agreed: true,
  ...over,
});

describe("the booking and review sites", () => {
  it("lists Booking.com, Agoda and Tripadvisor, each linking to the house's own page there", () => {
    expect(reviewSites.map((s) => [s.platform, s.mark, s.bookable])).toEqual([
      ["Booking.com", "booking", true],
      ["Agoda", "agoda", true],
      ["Tripadvisor", "tripadvisor", false],
    ]);
    expect(reviewSites.map((s) => s.url)).toEqual([
      identity.links.booking.value,
      identity.links.agoda.value,
      identity.links.tripadvisor.value,
    ]);
  });

  it("carries each site's recorded score, and none for a site without one", () => {
    for (const site of reviewSites) {
      expect(site.rating, site.platform).toBe(ratings.find((r) => r.value.platform === site.platform)?.value ?? null);
    }
    expect(reviewSites[0]!.rating?.score).toBe("9.4");
  });
});

describe("guests' own words", () => {
  it("shows only the quotes guests agreed to share, one per guest", () => {
    const list = [quote({}), quote({ quote: "Again!" }), quote({ name: "Ben", agreed: false }), quote({ name: "Chloé", from: "France" })];
    expect(shownTestimonials(list).map((t) => t.name)).toEqual(["Ana", "Chloé"]);
  });

  it("keeps every quote short, dated and credited, and about something different", () => {
    for (const t of testimonials) {
      expect(t.quote.length, t.quote).toBeLessThanOrEqual(240);
      expect(t.quote, t.quote).not.toMatch(/^["“]|["”]$/);
      expect(t.month, t.quote).toMatch(/^20\d\d-(0[1-9]|1[0-2])$/);
      expect(t.name, t.quote).toMatch(/^\S+$/);
      expect(t.from.length, t.quote).toBeGreaterThan(1);
      expect(["Booking.com", "Agoda", "Tripadvisor", "Google", "To the team"], t.quote).toContain(t.platform);
    }
    const topics = shownTestimonials().map((t) => t.topic);
    expect(new Set(topics).size).toBe(topics.length);
  });
});
