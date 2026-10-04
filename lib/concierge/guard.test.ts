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

  it("spots amounts written in words, with k or a scale, and a currency named around them (F1W-08)", () => {
    for (const text of [
      "A dorm bed is about 10 US dollars a night.",
      "Beds start at 90,000 Lao kip.",
      "Usually around 90k kip per night.",
      "It costs 90K LAK.",
      "Around ten dollars a night.",
      "Roughly 300 thousand kip for two nights.",
      "It is 1.5 million kip for a week.",
      "The price is 250 Thai baht.",
      "about 10 bucks",
      "twenty-five dollars",
      "a hundred dollars",
      "one hundred and fifty thousand kip",
      "10 U.S. dollars",
      "5 euros",
    ]) {
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
      "It is 5 minutes on foot.",
      "It takes ten minutes by tuk-tuk.",
      "Someone at reception can help, 24 hours a day.",
      "One of the team will reply.",
    ]) {
      expect(mentionsMoney(text), text).toBe(false);
    }
  });

  it("lets the house's own fees through, but only in a sentence about them", () => {
    expect(mentionsMoney("Yes: 100,000 kip for your padlock and towel, refunded at check-out.")).toBe(false);
    expect(mentionsMoney("The deposit is LAK 100,000, and a second towel is 15,000 kip.")).toBe(false);
    expect(mentionsMoney("The deposit is 100000 kip.")).toBe(false);
    // The same amount anywhere else is a price Shadow can't see.
    expect(mentionsMoney("A bed costs 100,000 kip a night.")).toBe(true);
    expect(mentionsMoney("The deposit is 100,000 kip. A bed is 15,000 kip.")).toBe(true);
    // And never a different amount dressed up as the deposit.
    expect(mentionsMoney("The deposit is 1,100,000 kip.")).toBe(true);
    expect(mentionsMoney("The deposit is 200,000 kip.")).toBe(true);
  });

  it("lets the laundries' starting price through, but only in a sentence about laundry", () => {
    expect(mentionsMoney("Laundries nearby wash, dry and fold the same day, from about 100,000 kip a load.")).toBe(false);
    expect(mentionsMoney("A bed is 100,000 kip a night.")).toBe(true);
    expect(mentionsMoney("Laundry is next door. A bed is 100,000 kip.")).toBe(true);
    expect(mentionsMoney("A load of washing is 200,000 kip.")).toBe(true);
  });

  it("never fires on the house knowledge, which quotes no prices", () => {
    expect(mentionsMoney(buildSystemPrompt("https://thehouseofjars.com"))).toBe(false);
    expect(mentionsMoney(buildSystemPrompt("https://thehouseofjars.com", { onlineBooking: true }))).toBe(false);
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

  it("no longer says Shadow can't see free beds: he can check them then", () => {
    const line = bookingPriceLine("https://thehouseofjars.com/book");
    expect(line.startsWith("I can’t see prices, so I can’t quote one.")).toBe(true);
    expect(line).not.toContain("availability");
    // Without online booking he still can't.
    expect(priceLine).toContain("I can’t see prices or live availability");
  });
});
