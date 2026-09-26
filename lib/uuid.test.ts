import { describe, expect, it } from "vitest";
import { uuid } from "./uuid";

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
