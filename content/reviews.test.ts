import { describe, expect, it } from "vitest";
import { identity } from "./identity";
import { type Testimonial, agodaScores, honestReplies, ratings, reviewSites, shownTestimonials, testimonials } from "./reviews";

const quote = (over: Partial<Testimonial>): Testimonial => ({
  quote: "Spotless, and the quietest dorm I have slept in.",
  name: "Ana",
  from: "Spain",
  platform: "Booking.com",
  month: "2026-09",
  topic: "sleep",
  consent: "guest",
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

  it("carries each site's recorded score: Booking.com 9.4, Agoda 9.5 from 1,447 reviews (the owner's screenshot), Tripadvisor 5.0", () => {
    for (const site of reviewSites) {
      expect(site.rating, site.platform).toBe(ratings.find((r) => r.value.platform === site.platform)?.value ?? null);
    }
    expect(reviewSites.map((s) => s.rating?.score)).toEqual(["9.4", "9.5", "5.0"]);
    expect(reviewSites[1]!.rating).toMatchObject({ outOf: "10", context: "from 1,447 guest reviews", asOf: "2026-10-07" });
    expect(Object.fromEntries(agodaScores.value)).toEqual({
      Cleanliness: "9.7",
      Service: "9.6",
      "Value for money": "9.6",
      Facilities: "9.4",
      Location: "9.4",
    });
  });
});

describe("guests' own words", () => {
  it("shows the quotes guests agreed to and the public reviews the owner picked, never a pending one, one per guest", () => {
    const list = [
      quote({}),
      quote({ quote: "Again!" }),
      quote({ name: "Ben", consent: "pending" }),
      quote({ name: "Chloé", from: "France", consent: "owner" }),
    ];
    expect(shownTestimonials(list).map((t) => t.name)).toEqual(["Ana", "Chloé"]);
  });

  it("keeps every quote short, credited, and about something different", () => {
    for (const t of testimonials) {
      expect(t.quote.length, t.quote).toBeLessThanOrEqual(240);
      expect(t.quote, t.quote).not.toMatch(/^["“]|["”]$/);
      if (t.month !== null) expect(t.month, t.quote).toMatch(/^20\d\d-(0[1-9]|1[0-2])$/);
      expect(t.name, t.quote).toMatch(/^\S+$/);
      expect(t.from.length, t.quote).toBeGreaterThan(1);
      expect(["Booking.com", "Agoda", "Tripadvisor", "Google", "To the team"], t.quote).toContain(t.platform);
    }
    const shown = shownTestimonials();
    expect(shown.length).toBeGreaterThanOrEqual(3);
    expect(new Set(shown.map((t) => t.topic)).size).toBe(shown.length);
  });
});

describe("what a few guests wish were different", () => {
  it("answers the quiet and the cold air-conditioning kindly, each with what the house offers", () => {
    const [quiet, cold] = honestReplies.map((r) => r.value);
    expect(quiet!.said).toMatch(/quiet/);
    expect(quiet!.reply).toMatch(/sorry/i);
    expect(quiet!.reply).toMatch(/clean, warm and welcoming/);
    expect(quiet!.reply).toMatch(/breakfast/);
    expect(cold!.said).toMatch(/air-conditioning is too cold/);
    expect(cold!.reply).toMatch(/move you to a bed further from the air-conditioning/);
    expect(cold!.reply).toMatch(/extra blanket/);
    for (const r of honestReplies) expect(r.confirmed).toBe(true);
  });
});
