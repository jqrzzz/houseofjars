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
  consent: "guest",
});

describe("guests in their own words", () => {
  it("shows no quotes until there are three, and nothing at all with no replies either", () => {
    const two = [quote("Aiko", "sleep"), quote("Ren", "breakfast")];
    expect(renderToStaticMarkup(createElement(Testimonials, { quotes: two, replies: [] }))).toBe("");
    const repliesOnly = renderToStaticMarkup(createElement(Testimonials, { quotes: two }));
    expect(repliesOnly).not.toContain("<blockquote");
    expect(repliesOnly).toContain('id="testimonials-title"');
    expect(repliesOnly).toContain("Our answer: ");
  });

  it("gives each wish the house's answer, after the quotes", () => {
    const html = renderToStaticMarkup(createElement(Testimonials));
    expect(html.indexOf("In guests’ own words")).toBeLessThan(html.indexOf("What a few guests wish were different"));
    expect(html).toContain("extra blanket");
    expect(html).toContain("translated by Agoda");
    expect(html).toContain('src="/brands/agoda.png"');
  });

  it("credits each quote with the guest's first name, home, site and month", () => {
    const html = renderToStaticMarkup(
      createElement(Testimonials, { quotes: [quote("Aiko", "sleep"), quote("Ren", "breakfast"), quote("Yui", "the team")], replies: [] }),
    );
    expect(html).toContain("<blockquote");
    expect(html).toContain("Aiko, Japan");
    expect(html).toContain("August 2026");
    expect(html.match(/<li>/g)).toHaveLength(3);
    expect(html).toContain('src="/brands/booking.svg"');
  });
});
