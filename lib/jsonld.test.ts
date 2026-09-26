import { describe, expect, it } from "vitest";
import { identity } from "@/content/identity";
import { times } from "@/content/stay";
import { siteJsonLd } from "./jsonld";
import { buildLlmsTxt } from "./llms";
import { uuid } from "./uuid";

describe("structured data", () => {
  const data = siteJsonLd();
  const graph = data["@graph"] as Record<string, unknown>[];
  const hostel = graph.find((node) => node["@type"] === "Hostel")!;

  it("describes the hostel from the content layer", () => {
    expect(hostel).toMatchObject({
      name: identity.fullName.value,
      telephone: identity.contact.phone.value.e164,
      email: identity.contact.email.value,
      checkinTime: times.checkIn.value,
      checkoutTime: times.checkOut.value,
    });
    expect(hostel.sameAs).toContain(identity.links.booking.value);
  });

  it("makes no claims it shouldn't: no ratings, reviews, prices or guessed map position", () => {
    const json = JSON.stringify(data);
    for (const key of ["aggregateRating", "review", "priceRange", "geo"]) expect(json).not.toContain(`"${key}"`);
  });
});

describe("llms.txt", () => {
  it("is built from the same content, with absolute links", () => {
    const text = buildLlmsTxt("https://example.org");
    expect(text.startsWith(`# ${identity.fullName.value}`)).toBe(true);
    expect(text).toContain(`Check-in from ${times.checkIn.value}`);
    expect(text).toContain("https://example.org/book");
    expect(text).not.toMatch(/undefined|\[object Object\]/);
  });
});

describe("uuid", () => {
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("makes version 4 UUIDs, with or without crypto.randomUUID", () => {
    expect(uuid()).toMatch(pattern);
    const original = crypto.randomUUID;
    try {
      // Plain-http previews have no randomUUID.
      Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
      const fallback = uuid();
      expect(fallback).toMatch(pattern);
      expect(uuid()).not.toBe(fallback);
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});
