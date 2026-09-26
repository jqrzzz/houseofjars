import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inquiryPrefill } from "./prefill";

// 2026-09-26, midday in Vientiane.
const now = Date.UTC(2026, 8, 26, 5);

describe("inquiryPrefill", () => {
  it("reads the booking card's check-in, nights and guests", () => {
    expect(inquiryPrefill("?check_in=2026-10-01&nights=3&guests=2", now)).toEqual({
      check_in: "2026-10-01",
      check_out: "2026-10-04",
      guests: 2,
    });
  });

  it("reads an explicit check-out, as an assistant might link it", () => {
    expect(inquiryPrefill("check_in=2026-12-30&check_out=2027-01-02&guests=1", now)).toEqual({
      check_in: "2026-12-30",
      check_out: "2027-01-02",
      guests: 1,
    });
  });

  it("understands the spellings assistants guess from other booking sites", () => {
    expect(inquiryPrefill("?checkin=2026-10-01&checkout=2026-10-03&adults=2", now)).toEqual({
      check_in: "2026-10-01",
      check_out: "2026-10-03",
      guests: 2,
    });
    // The documented names win when both are given.
    expect(inquiryPrefill("?check_in=2026-10-01&checkin=2026-11-01&guests=1&adults=3", now)).toEqual({
      check_in: "2026-10-01",
      guests: 1,
    });
  });

  it("counts nights across months and years", () => {
    expect(inquiryPrefill("?check_in=2027-02-27&nights=2", now).check_out).toBe("2027-03-01");
  });

  it("leaves out what is malformed or impossible, never guessing", () => {
    expect(inquiryPrefill("?check_in=2026-02-30&nights=2&guests=2", now)).toEqual({ guests: 2 });
    expect(inquiryPrefill("?check_in=01/10/2026", now)).toEqual({});
    expect(inquiryPrefill("?check_in=2026-10-01&check_out=2026-09-30", now)).toEqual({ check_in: "2026-10-01" });
    expect(inquiryPrefill("?check_in=2026-10-01&nights=0&guests=0", now)).toEqual({ check_in: "2026-10-01" });
    expect(inquiryPrefill("?check_in=2026-10-01&nights=90&guests=21", now)).toEqual({ check_in: "2026-10-01" });
    expect(inquiryPrefill("?guests=2.5", now)).toEqual({});
  });

  it("keeps to the dates an inquiry may name", () => {
    expect(inquiryPrefill("?check_in=2026-09-01&nights=2", now)).toEqual({});
    expect(inquiryPrefill("?check_in=2029-01-01&nights=2", now)).toEqual({});
    // The window's last day may be a check-in, but not have a check-out after it.
    expect(inquiryPrefill("?check_in=2028-09-25&nights=2", now)).toEqual({ check_in: "2028-09-25" });
  });

  it("stays free of zod, which would add some 90 kB to the booking form's JavaScript", () => {
    for (const file of ["lib/inquiry/prefill.ts", "lib/inquiry/dates.ts"]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/from "(zod[^"]*|\.\/schema)"/);
    }
  });
});
