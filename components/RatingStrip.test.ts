import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { reviewSites } from "@/content/reviews";
import { RatingStrip, scoresAsOf, siteBadge } from "./RatingStrip";

describe("the rating strip", () => {
  const html = renderToStaticMarkup(createElement(RatingStrip));

  it("makes each site's whole badge a link to the house's page there, in a new tab, named first by the site", () => {
    for (const site of reviewSites) expect(html).toMatch(new RegExp(`href="${site.url.replace(/[.?]/g, "\\$&")}"[^>]*>(<img[^>]*>)?<span><span>${site.platform}</span>`));
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(reviewSites.length);
    expect(html.match(/\(opens in a new tab\)/g)).toHaveLength(reviewSites.length);
  });

  it("shows each site's own logo and score; Agoda's wordmark stands for its name", () => {
    expect(html).toContain('src="/brands/booking.svg"');
    expect(html).toContain('src="/brands/agoda.png"');
    expect(html).toContain('src="/brands/tripadvisor.svg"');
    expect(html).toContain("<b>9.4</b>");
    expect(html).toContain("<b>9.5</b>");
    expect(html).toContain("<b>5.0</b>");
    expect(siteBadge(reviewSites[1]!)).toMatchObject({ mark: "agoda", wordmark: true, score: "9.5", action: "Book or read reviews" });
    expect(html).toContain("data-wordmark");
    expect(html).not.toContain("data-named");
  });

  it("dates the scores: one date, or the first and the last read", () => {
    expect(scoresAsOf(reviewSites)).toBe("Scores as shown between 25 September 2026 and 7 October 2026.");
    expect(scoresAsOf([reviewSites[0]!])).toBe("Scores as shown on 25 September 2026.");
  });

  it("offers only the sites that take bookings on the booking page", () => {
    const bookable = renderToStaticMarkup(createElement(RatingStrip, { bookable: true }));
    expect(bookable).toContain("Booking.com");
    expect(bookable).toContain("Agoda");
    expect(bookable).not.toContain("Tripadvisor");
  });
});
