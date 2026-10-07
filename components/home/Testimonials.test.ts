import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Testimonial } from "@/content/reviews";
import { Testimonials } from "./Testimonials";

const quote = (name: string, topic: string): Testimonial => ({
  quote: `What ${name} liked most.`,
  name,
  from: "Japan",
  platform: "Booking.com",
  month: "2026-08",
  topic,
  agreed: true,
});

describe("guests in their own words", () => {
  it("stays away until there are three quotes", () => {
    expect(renderToStaticMarkup(createElement(Testimonials, { quotes: [quote("Aiko", "sleep"), quote("Ren", "breakfast")] }))).toBe("");
  });

  it("credits each quote with the guest's first name, home, site and month", () => {
    const html = renderToStaticMarkup(
      createElement(Testimonials, { quotes: [quote("Aiko", "sleep"), quote("Ren", "breakfast"), quote("Yui", "the team")] }),
    );
    expect(html).toContain("<blockquote");
    expect(html).toContain("Aiko, Japan");
    expect(html).toContain("August 2026");
    expect(html.match(/<li /g)).toHaveLength(3);
  });
});
