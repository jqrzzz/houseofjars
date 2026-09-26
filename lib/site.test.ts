import { describe, expect, it } from "vitest";
import { absoluteUrl, teamSignInUrl } from "./site";

describe("teamSignInUrl", () => {
  it("is hidden when SHADOW_APP_URL is unset or blank", () => {
    expect(teamSignInUrl(undefined)).toBeNull();
    expect(teamSignInUrl("  ")).toBeNull();
  });

  it("uses an https address as given", () => {
    expect(teamSignInUrl("https://shadow.example.com/login")).toBe("https://shadow.example.com/login");
    expect(teamSignInUrl(" https://shadow.example.com ")).toBe("https://shadow.example.com/");
  });

  it("allows plain http only on this machine", () => {
    expect(teamSignInUrl("http://localhost:3001")).toBe("http://localhost:3001/");
    expect(teamSignInUrl("http://shadow.example.com")).toBeNull();
  });

  it("refuses anything that is not a web address, or carries credentials", () => {
    expect(teamSignInUrl("javascript:alert(1)")).toBeNull();
    expect(teamSignInUrl("shadow.example.com")).toBeNull();
    expect(teamSignInUrl("https://user:secret@shadow.example.com")).toBeNull();
  });
});

describe("absoluteUrl", () => {
  it("resolves a path on the site", () => {
    expect(absoluteUrl("/book")).toMatch(/\/book$/);
  });
});
