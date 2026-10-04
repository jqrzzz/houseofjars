import { describe, expect, it } from "vitest";
import { bookingLabel, onlineBookingConfigured } from "./config";

const shadow = { SHADOW_API_URL: "https://shadow.example.com", SHADOW_INQUIRY_KEY: "sck_test" };

describe("online booking switch", () => {
  it("is on only with both Shadow Check-in's address and key", () => {
    expect(onlineBookingConfigured(shadow)).toBe(true);
    expect(onlineBookingConfigured({ SHADOW_API_URL: shadow.SHADOW_API_URL })).toBe(false);
    expect(onlineBookingConfigured({})).toBe(false);
  });

  it("names links to /book after the page they open", () => {
    expect(bookingLabel(shadow)).toBe("Book a bed");
    expect(bookingLabel({})).toBe("Book direct");
  });
});
