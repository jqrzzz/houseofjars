import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { reviewSites } from "@/content/reviews";
import { RatingStrip, siteBadge } from "./RatingStrip";

describe("the rating strip", () => {
  const html = renderToStaticMarkup(createElement(RatingStrip));

  it("makes each site's whole badge a link to the house's page there, in a new tab, named first by the site", () => {
    for (const site of reviewSites) expect(html).toMatch(new RegExp(`href="${site.url.replace(/[.?]/g, "\\$&")}"[^>]*>(<img[^>]*>)?<span><span>${site.platform}</span>`));
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(reviewSites.length);
    expect(html.match(/\(opens in a new tab\)/g)).toHaveLength(reviewSites.length);
  });

  it("shows Booking.com's and Tripadvisor's own logos and scores; Agoda by name until its logo and score are added", () => {
    expect(html).toContain('src="/brands/booking.svg"');
    expect(html).toContain('src="/brands/tripadvisor.svg"');
    expect(html).not.toContain("agoda.svg");
    expect(html).toContain("<b>9.4</b>");
    expect(html).toContain("<b>5.0</b>");
    expect(siteBadge(reviewSites[1]!)).toMatchObject({ mark: null, score: null, action: "Book or read reviews" });
    expect(html).toContain("data-named");
  });

  it("offers only the sites that take bookings on the booking page", () => {
    const bookable = renderToStaticMarkup(createElement(RatingStrip, { bookable: true }));
    expect(bookable).toContain("Booking.com");
    expect(bookable).toContain("Agoda");
    expect(bookable).not.toContain("Tripadvisor");
  });
});
