import { describe, expect, it } from "vitest";
import { identity } from "@/content/identity";
import { times } from "@/content/stay";
import { buildHouseKnowledge } from "./knowledge";
import { buildDateLine, buildSystemPrompt } from "./prompt";

const site = "https://thehouseofjars.com";

describe("house knowledge", () => {
  const knowledge = buildHouseKnowledge(site);

  it("carries the facts guests ask about, from the content layer", () => {
    for (const fact of [
      times.checkIn.value,
      times.checkOut.value,
      identity.contact.phone.value.display,
      identity.contact.email.value,
      identity.links.booking.value,
      "Wattay International Airport",
      "https://immigration.gov.la/en/registration/arrival/arrival-info",
    ]) {
      expect(knowledge).toContain(fact);
    }
  });

  it("lists what is not published, so Shadow says he doesn't know", () => {
    expect(knowledge).toContain("female-only dorm");
    expect(knowledge).toContain("private rooms");
    expect(knowledge).toContain("breakfast serving times");
  });

  it("writes site links as absolute URLs and never leaks placeholders", () => {
    expect(knowledge).toContain(`${site}/book`);
    expect(knowledge).not.toMatch(/undefined|\[object Object\]|NaN/);
  });

  it("is deterministic, so the cached prompt prefix never changes", () => {
    expect(buildHouseKnowledge(site)).toBe(knowledge);
    expect(buildSystemPrompt(site)).toBe(buildSystemPrompt(site));
  });
});

describe("system prompt", () => {
  const prompt = buildSystemPrompt(site);

  it("sets Shadow's rules before the knowledge", () => {
    expect(prompt.indexOf("# How to answer")).toBeLessThan(prompt.indexOf("# House knowledge"));
    expect(prompt).toContain("you are an AI assistant");
    expect(prompt).toContain("Never quote a price");
    expect(prompt).toContain("Never ask for or accept passport numbers");
    expect(prompt).toContain("Call send_inquiry only after they clearly say yes");
    expect(prompt).toContain(buildHouseKnowledge(site));
  });

  it("keeps today's date out of the cached prompt", () => {
    expect(prompt).not.toContain("Today's date");
  });
});

describe("date line", () => {
  it("uses the date in Vientiane (UTC+7)", () => {
    expect(buildDateLine(new Date("2026-09-25T18:30:00Z"))).toBe("Today's date in Vientiane is Saturday, 2026-09-26.");
    expect(buildDateLine(new Date("2026-09-25T16:30:00Z"))).toBe("Today's date in Vientiane is Friday, 2026-09-25.");
  });
});
