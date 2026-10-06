import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrivacyPage from "./page";

/** The notice as a reader sees it, for a build with or without online booking. */
function notice(online: boolean): string {
  vi.stubEnv("SHADOW_API_URL", online ? "https://shadow.example" : "");
  vi.stubEnv("SHADOW_INQUIRY_KEY", online ? "key" : "");
  return renderToStaticMarkup(createElement(PrivacyPage))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ ([.,;:])/g, "$1");
}

describe("the privacy notice", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("without online booking, says the dates and trips go by WhatsApp or email, and describes no form", () => {
    const text = notice(false);
    expect(text).toContain("When you send us your dates or a trip");
    expect(text).toContain("open it in WhatsApp or your email app. Nothing passes through this website");
    expect(text).not.toContain("When you send a message from the booking page");
    expect(text).not.toContain("When you request a booking");
    expect(text).not.toMatch(/booking form|the form\b/);
    expect(text).toContain("Nothing you type to Shadow reaches the team until you tick the box");
  });

  it("with online booking, describes both forms, and the trips page's hand-off", () => {
    const text = notice(true);
    expect(text).toContain("When you request a booking");
    expect(text).toContain("When you send a message from the booking page");
    expect(text).toContain("When you send us a trip");
    expect(text).toContain("Nothing you type into the booking forms or to Shadow reaches the team");
  });

  it("names what the browser remembers, and that it stays on the device", () => {
    for (const text of [notice(false), notice(true)]) {
      expect(text).toContain("Day or Evening and Still choices (in local storage)");
      expect(text).toContain("the opening curtain this visit (in session storage); these stay on your device");
    }
  });
});
