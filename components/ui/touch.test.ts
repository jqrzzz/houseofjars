import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookingCardView } from "../BookingCardView";

/*
 * The site's small motion details, one slow, soft touch everywhere
 * (docs/DESIGN.md §10.13): text links draw their thread, buttons rise and
 * press, keyboard focus gets what the pointer gets, and scroll-driven
 * reveals run at the scroll's length.
 */
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

/** Every rule's selector and declarations, nested blocks flattened (good enough for these modules). */
const rules = (css: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1]!.trim(),
    body: match[2]!,
  }));

const threads = {
  "components/ui/button.module.css": ".textLink",
  "components/BookingCard.module.css": ".platform",
  "components/RatingStrip.module.css": ".strip a",
  "components/ui/ShareButton.module.css": ".share",
  "components/layout/SiteFooter.module.css": ".list a",
};

describe("text links draw their thread", () => {
  for (const [file, link] of Object.entries(threads)) {
    it(`in ${file}: from the left, slowly, for the pointer and the keyboard alike`, () => {
      const all = rules(read(file));
      const drawn = all.filter((rule) => rule.body.includes("background-size: 100% 1px"));
      expect(drawn.length, file).toBeGreaterThan(0);
      for (const rule of drawn) {
        expect(rule.selector, file).toContain(":is(:hover, :focus-visible)");
        expect(rule.selector.startsWith(link), file).toBe(true);
        expect(rule.body, file).toContain("background-position-x: left");
      }
      // At rest: no thread yet, anchored on the right so it is drawn out that way as the pointer leaves.
      const resting = all.filter((rule) => rule.body.includes("background-size: 0% 1px"));
      expect(resting.length, file).toBeGreaterThan(0);
      for (const rule of resting) {
        expect(rule.body, file).toMatch(/background-position: right /);
        expect(rule.body, file).toContain("transition: background-size var(--dur-ui) var(--ease-out)");
      }
    });
  }

  it("lays the thread on the text's own underline, measured from the font's descent", () => {
    const css = read("components/ui/button.module.css");
    expect(css).toContain("background-position: right calc(100% - (0.25em - var(--underline-offset)));");
    expect(read("app/globals.css")).toContain("descent-override: 25.03%");
  });

  it("gives the booking sites' words a line box of their own, so a wrapped name keeps its thread", () => {
    const html = renderToStaticMarkup(
      createElement(BookingCardView, {
        online: false,
        directPrice: "Book direct.",
        morning: ["Your first morning", "breakfast from 08:00."],
        bookPath: "/book",
        whatsapp: "https://wa.me/0",
        email: "mailto:team@example.com",
        platforms: [{ platform: "Booking.com", url: "https://www.booking.com/", mark: "booking" }],
      }),
    );
    expect(html).toMatch(/<a href="https:\/\/www\.booking\.com\/"[^>]*><img[^>]*><span><span>See prices on Booking\.com<\/span><\/span>/);
  });
});

describe("buttons rise and press", () => {
  const css = read("components/ui/button.module.css");
  const all = rules(css);

  it("answers a press at once and comes back up at the hover's pace", () => {
    const button = all.find((rule) => rule.selector === ".button")!;
    expect(button.body).toContain("translate var(--dur-hover) var(--ease-out)");
    const pressed = all.find((rule) => rule.selector === ".button:active")!;
    expect(pressed.body).toContain("transition-duration: var(--dur-press)");
  });

  it("lifts only for pointers that can hover, so a tap never leaves a button raised", () => {
    const lifts = css.match(/@media \(hover: hover\) \{[\s\S]*?\n}/g) ?? [];
    expect(lifts.join("\n")).toContain("translate: 0 -1px");
    expect(lifts.join("\n")).toContain("box-shadow: 0 3px 0 var(--paper-edge)");
    const outside = css.replace(/@media \(hover: hover\) \{[\s\S]*?\n}/g, "");
    expect(outside).not.toContain("translate: 0 -1px");
  });

  it("moves arrows with translate, so a placed button keeps its own transform", () => {
    expect(css).not.toMatch(/transform:/);
  });
});

describe("keyboard focus", () => {
  it("settles the ring in from further out, and never hides it while it settles", () => {
    const css = read("app/globals.css");
    const settle = css.match(/@keyframes focus-settle \{([\s\S]*?)\n}/)?.[1] ?? "";
    expect(settle).toContain("outline-offset: 7px");
    expect(settle).not.toMatch(/outline-color|opacity|outline-width/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*:focus-visible \{\s*animation: focus-settle var\(--dur-hover\) var\(--ease-out\);/);
  });

  it("draws the header's thread for keyboard focus too", () => {
    const css = read("components/layout/SiteHeader.module.css");
    expect(css).toContain(".link:is(:hover, :focus-visible)::after");
  });
});

describe("scroll-driven reveals run at the scroll's length", () => {
  const files = [
    "app/globals.css",
    "app/vientiane/vientiane.module.css",
    "components/brand/WovenBand.module.css",
    "components/layout/SiteHeader.module.css",
    "components/home/RatingTags.module.css",
    "components/home/RoomNiches.module.css",
    "components/home/Testimonials.module.css",
    "components/guide/Guide.module.css",
    "components/art/StoneJars.module.css",
    "components/ui/Ledger.module.css",
  ];

  for (const file of files) {
    it(`${file}: each sets animation-duration: auto after its shorthand`, () => {
      const timed = rules(read(file)).filter((rule) => /animation-timeline: (?!auto|none)/.test(rule.body) && rule.body.includes("animation:"));
      expect(timed.length, file).toBeGreaterThan(0);
      for (const rule of timed) expect(rule.body.indexOf("animation-duration: auto"), `${file} ${rule.selector}`).toBeGreaterThan(rule.body.indexOf("animation:"));
    });
  }

  it("lets the booking card's band follow the page: nothing round it is a scroll container", () => {
    expect(read("components/BookingCard.module.css")).not.toMatch(/overflow: (hidden|auto|scroll)/);
  });

  it("eases section reveals into place instead of stopping them dead", () => {
    expect(read("app/globals.css")).toContain("animation: settle-in var(--ease-out) both;");
    expect(read("components/home/Testimonials.module.css")).toContain("animation: card-rise var(--ease-out) both;");
  });
});
