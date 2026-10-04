import { describe, expect, it } from "vitest";
import { directLinks, directRequestSubject, directRequestText, directStayFromLink } from "./direct";

const contact = { whatsapp: "https://wa.me/8562023978946", email: "house@example.com" };

describe("booking direct", () => {
  it("writes the stay out as a message to the team", () => {
    expect(directRequestText({ checkIn: "2026-10-09", nights: 2, guests: 2 })).toBe(
      "Hello House of Jars! I would like to book 2 beds from Friday 9 October 2026 to Sunday 11 October 2026 (2 nights). Do you have space?",
    );
    expect(directRequestText({ checkIn: "2026-12-31", nights: 1, guests: 1 })).toBe(
      "Hello House of Jars! I would like to book a bed from Thursday 31 December 2026 to Friday 1 January 2027 (1 night). Do you have space?",
    );
  });

  it("asks for the nights and beds until the guest chooses a date, and never writes a date that isn't one", () => {
    expect(directRequestText({ checkIn: null, nights: 3, guests: 1 })).toBe(
      "Hello House of Jars! I would like to book a bed for 3 nights. Do you have space?",
    );
    expect(directRequestText({ checkIn: "2026-02-30", nights: 3, guests: 1 })).toContain("for 3 nights");
  });

  it("keeps the nights and guests to sense", () => {
    expect(directRequestText({ checkIn: null, nights: 0, guests: -2 })).toBe(
      "Hello House of Jars! I would like to book a bed for 1 night. Do you have space?",
    );
    expect(directRequestText({ checkIn: null, nights: 45, guests: 40 })).toContain("20 beds for 45 nights");
    expect(directRequestText({ checkIn: null, nights: 4000, guests: 1 })).toContain("for 365 nights");
    expect(directRequestText({ checkIn: null, nights: 2.5, guests: 1 })).toContain("for 1 night");
  });

  it("gives the email a short subject", () => {
    expect(directRequestSubject({ checkIn: "2026-10-09", nights: 2, guests: 2 })).toBe("Booking request: Fri 9 Oct, 2 nights, 2 guests");
    expect(directRequestSubject({ checkIn: null, nights: 1, guests: 1 })).toBe("Booking request: 1 night, 1 guest");
  });

  it("puts the message in a WhatsApp link and an email link, encoded so mail apps read the spaces", () => {
    const links = directLinks({ checkIn: "2026-10-09", nights: 2, guests: 2 }, contact);
    expect(links.whatsapp.startsWith("https://wa.me/8562023978946?text=Hello%20House%20of%20Jars!")).toBe(true);
    expect(decodeURIComponent(new URL(links.whatsapp).searchParams.get("text") ?? "")).toContain("2 beds from Friday 9 October 2026");
    expect(links.email.startsWith("mailto:house@example.com?subject=Booking%20request%3A%20Fri%209%20Oct")).toBe(true);
    expect(links.email).not.toContain("+");
    expect(decodeURIComponent(links.email.split("&body=")[1] ?? "")).toBe(directRequestText({ checkIn: "2026-10-09", nights: 2, guests: 2 }));
  });

  it("takes the stay from a /book link, as the booking card or an assistant writes it", () => {
    const now = Date.parse("2026-10-04T05:00:00Z");
    expect(directStayFromLink("?check_in=2026-10-09&check_out=2026-10-12&guests=2", now)).toEqual({ checkIn: "2026-10-09", nights: 3, guests: 2 });
    expect(directStayFromLink("?check_in=2026-10-09&nights=4&guests=1", now)).toEqual({ checkIn: "2026-10-09", nights: 4, guests: 1 });
    expect(directStayFromLink("", now)).toEqual({ checkIn: null, nights: 2, guests: 1 });
    // A date already past, or not a date, is left out rather than guessed.
    expect(directStayFromLink("?check_in=2026-09-01&check_out=2026-09-03&guests=3", now)).toEqual({ checkIn: null, nights: 2, guests: 3 });
    expect(directStayFromLink("?check_in=soon&guests=many", now)).toEqual({ checkIn: null, nights: 2, guests: 1 });
  });
});
