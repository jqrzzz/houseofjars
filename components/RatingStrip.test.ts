import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { reviewSites } from "@/content/reviews";
import { RatingStrip, siteLabel } from "./RatingStrip";

describe("the rating strip", () => {
  const html = renderToStaticMarkup(createElement(RatingStrip));

  it("makes each site's whole badge a link to the house's page there, in a new tab", () => {
    for (const site of reviewSites) {
      expect(html).toContain(`href="${site.url}"`);
      expect(siteLabel(site).startsWith(site.platform)).toBe(true);
    }
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(reviewSites.length);
  });

  it("shows Booking.com's and Tripadvisor's own logos and scores; Agoda by name until its logo and score are added", () => {
    expect(html).toContain('fill="#003A9A"');
    expect(html).toContain('fill="#34E0A1"');
    expect(html).toContain("<b>9.4</b>");
    expect(html).toContain("<b>5.0</b>");
    expect(siteLabel(reviewSites[1]!)).toBe("Agoda. Book or read reviews (opens in a new tab)");
  });

  it("offers only the sites that take bookings on the booking page", () => {
    const bookable = renderToStaticMarkup(createElement(RatingStrip, { bookable: true }));
    expect(bookable).toContain("Booking.com");
    expect(bookable).toContain("Agoda");
    expect(bookable).not.toContain("Tripadvisor");
  });
});
