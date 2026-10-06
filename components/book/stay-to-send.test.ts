import { describe, expect, it } from "vitest";
import { directRequestText } from "@/lib/booking/direct";
import { stayToSend } from "./stay-to-send";

describe("stayToSend", () => {
  const today = "2026-10-06";

  it("keeps a check-in from today on", () => {
    for (const checkIn of [today, "2026-10-07", "2027-01-02"]) {
      const stay = { checkIn, nights: 2, guests: 1 };
      expect(stayToSend(stay, today)).toEqual({ stay, warning: null });
    }
  });

  it("leaves a day already gone out of the request, and says which day to choose from", () => {
    const { stay, warning } = stayToSend({ checkIn: "2026-09-01", nights: 2, guests: 1 }, today);
    expect(stay).toEqual({ checkIn: null, nights: 2, guests: 1 });
    expect(warning).toBe("That date has passed: choose one from Tuesday 6 October.");
    expect(directRequestText(stay)).toBe("Hello House of Jars! I would like to book a bed for 2 nights. Do you have space?");
  });

  it("says nothing without a date, or before the browser knows the house's date", () => {
    const none = { checkIn: null, nights: 3, guests: 2 };
    expect(stayToSend(none, today)).toEqual({ stay: none, warning: null });
    const past = { checkIn: "2026-09-01", nights: 2, guests: 1 };
    expect(stayToSend(past, undefined)).toEqual({ stay: past, warning: null });
  });
});
