import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysInMonth,
  formatDay,
  formatHouseTime,
  formatMonth,
  houseToday,
  isIsoDate,
  nightsBetween,
  stayNights,
  weekdayIndex,
} from "./dates";

describe("dates at the house", () => {
  it("counts today in Vientiane (UTC+7), whatever the server's or guest's clock", () => {
    expect(houseToday(Date.UTC(2026, 8, 25, 16, 59))).toBe("2026-09-25");
    expect(houseToday(Date.UTC(2026, 8, 25, 17, 0))).toBe("2026-09-26");
    expect(houseToday(Date.UTC(2026, 11, 31, 17, 0))).toBe("2027-01-01");
  });

  it("knows real dates", () => {
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2027-02-29")).toBe(false);
    expect(isIsoDate("2026-9-3")).toBe(false);
    expect(isIsoDate(20261003)).toBe(false);
  });

  it("counts days, nights and months across month and year ends", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(nightsBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(nightsBetween("2026-11-02", "2026-10-30")).toBe(-3);
    expect(stayNights("2026-12-31", "2027-01-02")).toEqual(["2026-12-31", "2027-01-01"]);
    expect(stayNights("2026-10-03", "2026-10-03")).toEqual([]);
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
    expect(addMonths("2026-10", 14)).toBe("2027-12");
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-09")).toBe(30);
  });

  it("starts weeks on Monday", () => {
    expect(weekdayIndex("2026-10-05")).toBe(0);
    expect(weekdayIndex("2026-10-04")).toBe(6);
  });

  it("writes dates the same way in every browser", () => {
    expect(formatDay("2026-10-03")).toBe("Sat 3 Oct");
    expect(formatDay("2026-10-03", "long")).toBe("Saturday 3 October 2026");
    expect(formatMonth("2027-01")).toBe("January 2027");
  });

  it("gives times on the house's clock", () => {
    expect(formatHouseTime("2026-10-04T07:00:00Z")).toBe("Sunday 4 October, 14:00");
    expect(formatHouseTime("2026-10-04T23:30:00+07:00")).toBe("Sunday 4 October, 23:30");
    expect(formatHouseTime("soon")).toBeNull();
  });

  it("stays free of zod, which would add some 90 kB to the booking form's JavaScript", () => {
    const source = readFileSync(join(process.cwd(), "lib/dates.ts"), "utf8");
    expect(source).not.toMatch(/from "zod/);
  });
});
