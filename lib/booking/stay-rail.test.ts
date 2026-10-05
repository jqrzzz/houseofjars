import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { breakfast, times } from "@/content/stay";
import { breakfastFrom, firstMorningText, railDate, stayRail, stayRailForNights, type RailTimes } from "./stay-rail";

/** The house's own times, as /book passes them. */
const house: RailTimes = { checkIn: times.checkIn.value, checkOut: times.checkOut.value, breakfast: breakfast.hours.value };

describe("the stay rail", () => {
  it("says the stay as the house lives it, in one line", () => {
    expect(stayRail("2026-10-09", "2026-10-11", house)?.text).toBe(
      "Check-in from 14:00 on Friday 9 October · breakfast 08:00–10:30 · check-out by 11:30 on Sunday 11 October",
    );
  });

  it("reads its times from content/stay", () => {
    const rail = stayRail("2026-10-09", "2026-10-11", { checkIn: "15:00", checkOut: "10:00", breakfast: "07:30–09:30" });
    expect(rail?.text).toBe("Check-in from 15:00 on Friday 9 October · breakfast 07:30–09:30 · check-out by 10:00 on Sunday 11 October");
  });

  it("gives each stop its label, time and day", () => {
    const rail = stayRail("2026-10-09", "2026-10-11", house)!;
    expect(rail.nights).toBe(2);
    expect(rail.firstMorning).toBe("2026-10-10");
    expect(rail.stops.map((stop) => [stop.id, stop.label, stop.time, stop.when])).toEqual([
      ["check-in", "Check-in", "from 14:00", "Friday 9 October"],
      ["breakfast", "Breakfast", "08:00–10:30", "each morning"],
      ["check-out", "Check-out", "by 11:30", "Sunday 11 October"],
    ]);
    expect(stayRail("2026-10-09", "2026-10-10", house)!.stops[1].when).toBe("the next morning");
  });

  it("crosses month ends", () => {
    expect(stayRailForNights("2026-10-30", 3, house)?.text).toBe(
      "Check-in from 14:00 on Friday 30 October · breakfast 08:00–10:30 · check-out by 11:30 on Monday 2 November",
    );
    expect(stayRailForNights("2026-10-31", 1, house)?.stops[2].when).toBe("Sunday 1 November");
    expect(stayRail("2026-10-31", "2026-11-01", house)?.firstMorning).toBe("2026-11-01");
    // February, in a leap year and not.
    expect(stayRailForNights("2028-02-28", 2, house)?.stops[2].when).toBe("Wednesday 1 March");
    expect(stayRailForNights("2027-02-28", 2, house)?.stops[2].when).toBe("Tuesday 2 March");
  });

  it("writes the years when the stay crosses a year end", () => {
    expect(stayRailForNights("2026-12-31", 2, house)?.text).toBe(
      "Check-in from 14:00 on Thursday 31 December 2026 · breakfast 08:00–10:30 · check-out by 11:30 on Saturday 2 January 2027",
    );
    expect(stayRail("2026-12-31", "2027-01-01", house)?.firstMorning).toBe("2027-01-01");
  });

  it("writes the years for a stay in another year than today's", () => {
    expect(stayRail("2027-03-05", "2027-03-07", house, { today: "2026-10-05" })?.stops[0].when).toBe("Friday 5 March 2027");
    expect(stayRail("2026-10-09", "2026-10-11", house, { today: "2026-10-05" })?.stops[0].when).toBe("Friday 9 October");
    expect(stayRail("2026-10-09", "2026-10-11", house, { today: "soon" })?.stops[0].when).toBe("Friday 9 October");
  });

  it("waits for two real dates, check-out after check-in", () => {
    expect(stayRail(null, "2026-10-11", house)).toBeNull();
    expect(stayRail("2026-10-09", null, house)).toBeNull();
    expect(stayRail("2026-10-09", "2026-10-09", house)).toBeNull();
    expect(stayRail("2026-10-11", "2026-10-09", house)).toBeNull();
    expect(stayRail("2027-02-29", "2027-03-02", house)).toBeNull();
    expect(stayRail("9 October", "11 October", house)).toBeNull();
    expect(stayRailForNights("2026-10-09", 0, house)).toBeNull();
    expect(stayRailForNights("2026-10-09", 1.5, house)).toBeNull();
    expect(stayRailForNights(null, 2, house)).toBeNull();
  });

  it("writes dates the same way everywhere", () => {
    expect(railDate("2026-10-09")).toBe("Friday 9 October");
    expect(railDate("2026-10-09", true)).toBe("Friday 9 October 2026");
  });

  it("gives the booking card its first morning", () => {
    expect(breakfastFrom("08:00–10:30")).toBe("08:00");
    expect(breakfastFrom("from 07:30")).toBe("07:30");
    expect(breakfastFrom("all morning")).toBe("all morning");
    expect(firstMorningText(breakfast.hours.value)).toBe("Your first morning: breakfast from 08:00.");
  });

  it("stays free of zod and the content files, which would weigh down the booking forms' JavaScript", () => {
    const source = readFileSync(join(process.cwd(), "lib/booking/stay-rail.ts"), "utf8");
    expect(source).not.toMatch(/from "(zod[^"]*|\.\/contract|\.\/shadow|\.\/handler|@\/content[^"]*|\.\.\/\.\.\/content[^"]*)"/);
  });
});
