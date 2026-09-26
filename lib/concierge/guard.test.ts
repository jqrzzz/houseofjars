import { describe, expect, it } from "vitest";
import { identity } from "@/content/identity";
import { buildSystemPrompt } from "./prompt";
import { bookingPriceLine, mentionsMoney, priceLine } from "./guard";

describe("price guard", () => {
  it("spots money amounts in the usual forms", () => {
    for (const text of ["$5", "US$ 12", "5 USD a night", "20,000 kip", "LAK 150000", "฿300", "300 baht", "€9", "£7", "10 dollars", "12$"]) {
      expect(mentionsMoney(text), text).toBe(true);
    }
  });

  it("leaves ordinary answers alone", () => {
    for (const text of [
      "Check-in is from 14:00 and check-out is by 12:00.",
      "Skip 3 steps to the left.",
      "WhatsApp +856 20 5555 1234 or email the team.",
      "Prices change with the dates; see Booking.com or Agoda.",
      "Wattay International Airport is about 4 km away.",
    ]) {
      expect(mentionsMoney(text), text).toBe(false);
    }
  });

  it("never fires on the house knowledge, which quotes no prices", () => {
    expect(mentionsMoney(buildSystemPrompt("https://thehouseofjars.com"))).toBe(false);
  });

  it("offers the live-price links instead", () => {
    expect(priceLine).toContain(identity.links.booking.value);
    expect(priceLine).toContain(identity.links.agoda.value);
    expect(mentionsMoney(priceLine)).toBe(false);
  });
});

describe("the price line with online booking", () => {
  it("names the booking page first, and quotes no price itself", () => {
    const line = bookingPriceLine("https://thehouseofjars.com/book");
    expect(line).toContain("https://thehouseofjars.com/book");
    expect(line).toContain(identity.links.agoda.value);
    expect(mentionsMoney(line)).toBe(false);
  });
});
