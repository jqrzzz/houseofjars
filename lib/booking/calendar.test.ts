import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { houseToday } from "../dates";
import {
  NO_DATES,
  calendarRules,
  dayBlock,
  dayLabel,
  dayRole,
  fitRange,
  looseRules,
  monthWeeks,
  moveFocus,
  pickAnnouncement,
  pickDay,
  viewFor,
  type CalendarRules,
} from "./calendar";

// 00:30 on Saturday 26 September 2026 in Vientiane, still Friday the 25th in UTC.
const now = Date.UTC(2026, 8, 25, 17, 30);
const today = houseToday(now);
const limits = { max_guests: 6, min_nights: 2, max_nights: 14, window_days: 60 };
const rules: CalendarRules = calendarRules(today, limits);

describe("the booking calendar", () => {
  it("starts at today in Vientiane, not the guest's or the server's date", () => {
    expect(today).toBe("2026-09-26");
    expect(rules).toEqual({ first: "2026-09-26", last: "2026-11-25", minNights: 2, maxNights: 14 });
    expect(dayBlock("2026-09-25", NO_DATES, rules)).toBe("past");
    expect(dayBlock("2026-09-26", NO_DATES, rules)).toBeNull();
  });

  it("lays each month out Monday first in six weeks", () => {
    const october = monthWeeks("2026-10");
    expect(october).toHaveLength(6);
    expect(october[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(october.flat().filter(Boolean)).toHaveLength(31);
    expect(monthWeeks("2027-02")[0]![0]).toBe("2027-02-01");
  });

  it("chooses a check-in, then a check-out, and starts again from an earlier day", () => {
    let pick = pickDay(NO_DATES, "2026-10-03", rules);
    expect(pick).toEqual({ range: { checkIn: "2026-10-03", checkOut: null }, picked: "check_in" });
    pick = pickDay((pick as { range: typeof NO_DATES }).range, "2026-10-06", rules);
    expect(pick).toEqual({ range: { checkIn: "2026-10-03", checkOut: "2026-10-06" }, picked: "check_out" });
    const done = (pick as { range: typeof NO_DATES }).range;
    expect(pickDay(done, "2026-10-10", rules)).toMatchObject({ range: { checkIn: "2026-10-10", checkOut: null } });
    expect(pickDay({ checkIn: "2026-10-03", checkOut: null }, "2026-10-01", rules)).toMatchObject({
      range: { checkIn: "2026-10-01", checkOut: null },
      picked: "check_in",
    });
  });

  it("keeps stays within the house's minimum and maximum nights", () => {
    const choosing = { checkIn: "2026-10-03", checkOut: null };
    expect(pickDay(choosing, "2026-10-04", rules)).toEqual({ blocked: "too_short" });
    expect(pickDay(choosing, "2026-10-17", rules)).toMatchObject({ picked: "check_out" });
    expect(pickDay(choosing, "2026-10-18", rules)).toEqual({ blocked: "too_long" });
  });

  it("keeps stays inside the booking window, check-out included", () => {
    expect(dayBlock("2026-11-23", NO_DATES, rules)).toBeNull();
    // A two-night stay from the 24th would end after the window.
    expect(dayBlock("2026-11-24", NO_DATES, rules)).toBe("window_end");
    expect(dayBlock("2026-11-26", NO_DATES, rules)).toBe("beyond_window");
    expect(dayBlock("2026-11-25", { checkIn: "2026-11-23", checkOut: null }, rules)).toBeNull();
  });

  it("marks the stay, and previews it while the check-out is being chosen", () => {
    const choosing = { checkIn: "2026-10-03", checkOut: null };
    expect(dayRole("2026-10-03", choosing)).toBe("check_in");
    expect(dayRole("2026-10-04", choosing, "2026-10-06")).toBe("in_stay");
    expect(dayRole("2026-10-06", choosing, "2026-10-06")).toBeNull();
    expect(dayRole("2026-10-04", choosing)).toBeNull();
    const stay = { checkIn: "2026-10-03", checkOut: "2026-10-05" };
    expect(["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06"].map((day) => dayRole(day, stay))).toEqual([
      "check_in",
      "in_stay",
      "check_out",
      null,
    ]);
  });

  it("drops dates from a link that the house's rules don't allow", () => {
    expect(fitRange({ checkIn: "2026-10-03", checkOut: "2026-10-05" }, rules)).toEqual({ checkIn: "2026-10-03", checkOut: "2026-10-05" });
    expect(fitRange({ checkIn: "2026-10-03", checkOut: "2026-10-04" }, rules)).toEqual({ checkIn: "2026-10-03", checkOut: null });
    expect(fitRange({ checkIn: "2026-09-25", checkOut: "2026-09-28" }, rules)).toEqual(NO_DATES);
    expect(fitRange({ checkIn: "2027-01-10", checkOut: "2027-01-12" }, rules)).toEqual(NO_DATES);
  });

  it("moves keyboard focus as the WAI-ARIA date picker does, inside the window", () => {
    const from = "2026-10-07"; // a Wednesday
    const move = (key: string, shift = false) => moveFocus(from, key, shift, rules);
    expect(move("ArrowRight")).toBe("2026-10-08");
    expect(move("ArrowLeft")).toBe("2026-10-06");
    expect(move("ArrowDown")).toBe("2026-10-14");
    expect(move("ArrowUp")).toBe("2026-09-30");
    expect(move("Home")).toBe("2026-10-05");
    expect(move("End")).toBe("2026-10-11");
    expect(move("PageDown")).toBe("2026-11-07");
    expect(move("PageUp")).toBe("2026-09-26"); // 7 September is past: today instead
    expect(move("PageDown", true)).toBe("2026-11-25"); // a year on is past the window: its last day
    expect(move("Enter")).toBeNull();
    expect(moveFocus("2026-10-31", "PageDown", false, looseRules(today))).toBe("2026-11-30");
  });

  it("shows the months around the focused day without leaving the window", () => {
    expect(viewFor("2026-10-20", "2026-10", 1, rules)).toBe("2026-10");
    expect(viewFor("2026-11-02", "2026-10", 1, rules)).toBe("2026-11");
    expect(viewFor("2026-11-02", "2026-10", 2, rules)).toBe("2026-10");
    expect(viewFor("2026-09-28", "2026-10", 2, rules)).toBe("2026-09");
    // Two months on show: November is the last, so the view starts in October at the latest.
    expect(viewFor("2026-11-20", "2026-11", 2, rules)).toBe("2026-10");
  });

  it("names every day for screen readers, and says why it can't be chosen", () => {
    expect(dayLabel("2026-09-26", null, null, rules)).toBe("Saturday 26 September 2026, today");
    expect(dayLabel("2026-10-03", "check_in", null, rules)).toBe("Saturday 3 October 2026, check-in");
    expect(dayLabel("2026-10-04", null, "too_short", rules)).toBe(
      "Sunday 4 October 2026, not available: stays are at least 2 nights",
    );
    expect(pickAnnouncement(pickDay(NO_DATES, "2026-10-03", rules), rules)).toBe(
      "Check-in Saturday 3 October 2026. Now choose your check-out date.",
    );
    expect(pickAnnouncement(pickDay({ checkIn: "2026-10-03", checkOut: null }, "2026-10-05", rules), rules)).toBe(
      "Check-out Monday 5 October 2026: 2 nights.",
    );
    expect(pickAnnouncement({ blocked: "too_long" }, rules)).toBe("That date can’t be chosen: online, stays are at most 14 nights.");
    expect(pickAnnouncement({ blocked: "beyond_window" }, rules)).toBe(
      "That date can’t be chosen: online booking goes up to Wednesday 25 November 2026.",
    );
  });

  it("stays free of zod, which would add some 90 kB to the booking form's JavaScript", () => {
    for (const file of ["lib/booking/calendar.ts", "lib/booking/types.ts", "lib/booking/text.ts"]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source, file).not.toMatch(/from "(zod[^"]*|\.\/contract|\.\/shadow)"/);
    }
  });
});
