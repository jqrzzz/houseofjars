import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { creditFor, isFirm } from "@/content/certainty";
import { faq } from "@/content/faq";
import { guideList, guidePath } from "@/content/guides";
import { identity } from "@/content/identity";
import { openQuestions } from "@/content/open-questions";
import { rules, times } from "@/content/stay";
import { collectFacts, factsMentionedIn } from "./content-audit";
import { bookingLinkTemplate, buildLlmsFullTxt, buildLlmsTxt, credited, onlineBookingLinkTemplate } from "./llms";
import { allPages } from "./pages";

const site = "https://example.org";
const short = buildLlmsTxt(site);
const full = buildLlmsFullTxt(site);
const softFacts = collectFacts(content, "content").filter((found) => !isFirm(found.fact));

/** Lines that use a fact that isn't firm without saying who says so. */
function uncredited(text: string): string[] {
  return text.split("\n").flatMap((line) =>
    factsMentionedIn(line, softFacts).flatMap(({ fact, path }) => {
      const credit = creditFor(fact)!;
      return line.toLowerCase().includes(credit.toLowerCase()) ? [] : [`${path}: ${line}`];
    }),
  );
}

describe("llms.txt", () => {
  it("follows the llms.txt layout: a title, a summary, then sections of links", () => {
    expect(short.startsWith(`# ${identity.fullName.value}\n\n> `)).toBe(true);
    expect([...short.matchAll(/^## (.+)$/gm)].map((match) => match[1])).toEqual(["Pages", "Guides", "Book", "For AI assistants and booking agents", "Optional"]);
  });

  it("links every page and guide, the full file and the booking link, all absolute", () => {
    for (const page of allPages) expect(short).toContain(`(${new URL(page.path, `${site}/`)})`);
    expect(short).toContain(`${site}/llms-full.txt`);
    expect(short).toContain(bookingLinkTemplate(site));
    expect(short).not.toMatch(/\]\(\//);
    expect(short).not.toMatch(/undefined|\[object Object\]/);
  });
});

describe("llms-full.txt", () => {
  it("carries the facts, every rule, every question and answer, and every guide", () => {
    for (const fact of [times.checkIn.value, times.checkOut.value, identity.contact.phone.value.display, identity.contact.email.value]) {
      expect(full).toContain(fact);
    }
    for (const rule of [...rules.house, ...rules.stay]) expect(full).toContain(rule.value.rule);
    for (const entry of faq.flatMap((group) => group.entries)) expect(full).toContain(`**${entry.question}**`);
    for (const guide of guideList) {
      expect(full).toContain(`### ${guide.question}`);
      expect(full).toContain(`${site}${guidePath(guide)}`);
    }
    for (const question of openQuestions.filter((item) => item.guestTopic)) expect(full).toContain(question.guestTopic!);
  });

  it("explains how to book, and that the site takes no payment", () => {
    expect(full).toContain(bookingLinkTemplate(site));
    expect(full).toContain(identity.links.booking.value);
    expect(full).toContain(identity.links.agoda.value);
    expect(full).toContain("There is no payment on this website.");
  });

  it("publishes no prices", () => {
    expect(full).not.toMatch(/\b(?:LAK|USD|kip)\b|[$₭€£]\s?\d/i);
  });

  it("never leaves a relative link or a placeholder", () => {
    expect(full).not.toMatch(/\(\/[^)]*\)|\]\(\//);
    expect(full).not.toMatch(/undefined|\[object Object\]|NaN/);
  });
});

describe("unconfirmed facts in the text files", () => {
  it("are never stated as certain: each line says who says so", () => {
    expect(uncredited(short)).toEqual([]);
    expect(uncredited(full)).toEqual([]);
  });

  it("are credited automatically, once", () => {
    expect(credited(`Bathrooms: ${content.bathrooms.cleaning.value}`)).toBe(
      "Bathrooms: Cleaned several times a day (from guest reviews)",
    );
    expect(credited("Market: next door. From guest reviews.")).toBe("Market: next door. From guest reviews.");
    expect(credited(`Check-in from ${times.checkIn.value}`)).toBe("Check-in from 14:00");
    // A line built by hand without the helper would be caught.
    expect(uncredited(`- ${identity.nameStory.value}`)).toHaveLength(1);
  });
});

describe("with online booking (W3)", () => {
  const shortOnline = buildLlmsTxt(site, { onlineBooking: true });
  const fullOnline = buildLlmsFullTxt(site, { onlineBooking: true });

  it("tells assistants they can link the free beds for a guest's dates", () => {
    for (const text of [shortOnline, fullOnline]) {
      expect(text).toContain(`[Book online](${site}/book)`);
      expect(text).toContain(onlineBookingLinkTemplate(site));
      expect(text).toContain("the guest pays at the house");
      expect(text).toContain("nothing is booked until the guest sends the booking");
      // Shadow's mode (the team checks first, or not) isn't known when the site is built (F1W-07).
      expect(text).toContain("confirmed straight away or once the team has checked it");
      // The message form and the booking sites stay alternatives.
      expect(text).toContain(bookingLinkTemplate(site));
      expect(text).toContain(identity.links.agoda.value);
    }
    expect(shortOnline).not.toContain("Prices and availability are not published here");
  });

  it("lists /book as the page to book on, and answers the booking questions that way (F1W-07)", () => {
    expect(shortOnline).toContain(`[Book a bed · House of Jars Hostel, Vientiane](${site}/book): See the free beds for your dates`);
    expect(short).toContain(`[Prices, booking and contact · House of Jars Hostel, Vientiane](${site}/book)`);
    expect(fullOnline).toMatch(/\*\*How do I book\?\*\*\nChoose your dates on the booking page/);
    expect(fullOnline).not.toContain("so we don’t list them here");
    expect(full).toContain("so we don’t list them here");
  });

  it("still publishes no prices, and names no fact it can't stand behind", () => {
    expect(fullOnline).not.toMatch(/\b(?:LAK|USD|kip)\b|[$₭€£]\s?\d/i);
    expect(uncredited(fullOnline)).toEqual([]);
  });

  it("is unchanged without online booking", () => {
    expect(short).not.toContain("Book online");
    expect(buildLlmsTxt(site, { onlineBooking: false })).toBe(short);
  });
});

describe("the door for AI assistants", () => {
  const site = "https://thehouseofjars.com";

  it("names the MCP server and the API description, and offers free beds only with online booking", () => {
    const offline = buildLlmsTxt(site);
    const online = buildLlmsTxt(site, { onlineBooking: true });
    expect(offline).toContain(`MCP server (Streamable HTTP, read-only, no sign-in): ${site}/api/mcp`);
    expect(offline).toContain(`${site}/openapi.json`);
    expect(offline).not.toContain("check_availability");
    expect(online).toContain("check_availability (free beds, no prices)");
  });
});
