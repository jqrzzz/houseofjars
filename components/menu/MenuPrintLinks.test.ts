import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EDITION_LIST, EDITIONS } from "@/lib/menu/print-spec";
import nextConfig from "@/next.config";
import { MenuPrintLinks, pdfKilobytes } from "./MenuPrintLinks";

/** A committed PDF's size as the panel gives it: kilobytes of 1024 bytes, rounded. */
const kB = (file: string) => Math.round(statSync(join(process.cwd(), "public/menu", file)).size / 1024);

describe("Print the menu card", () => {
  it("links both PDFs where the site serves them, each named with its format, pages and size", () => {
    const html = renderToStaticMarkup(createElement(MenuPrintLinks));
    expect(html).toMatch(/<section class="container [^"]+" aria-labelledby="menu-print-title"><h2 id="menu-print-title"[^>]*>Print the menu card<\/h2>/);
    expect([...html.matchAll(/<a href="([^"]+)"/g)].map(([, href]) => href)).toEqual(EDITION_LIST.map((edition) => edition.url));
    expect(html).toContain(`<span>The menu card for any printer (PDF, A4, front and back, ${kB(EDITIONS.office.file)} kB)</span>`);
    expect(html).toContain(`<span>The file for a print shop (PDF, A4 with 3 mm bleed, ${kB(EDITIONS.shop.file)} kB)</span>`);
    expect(html).toContain("Print at actual size (100%), on both sides of the paper. A white border keeps the orange side even on any printer.");
    expect(html).toContain("The orange runs 3 mm past the A4 trim, as print shops ask. Ask for a printed proof of the orange before a full run.");
  });

  it("uses plain links a phone opens in its own PDF viewer, drawn with the site's thread", () => {
    const html = renderToStaticMarkup(createElement(MenuPrintLinks));
    expect(html).not.toMatch(/\sdownload|target=/);
    for (const [, className] of html.matchAll(/<a href="[^"]+" class="([^"]+)"/g)) expect(className).toMatch(/textLink/);
  });

  it("reads each size when the page is built, and stops the build when a PDF is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "menu-print-links-"));
    try {
      mkdirSync(join(root, "public/menu"), { recursive: true });
      writeFileSync(join(root, "public/menu", EDITIONS.office.file), Buffer.alloc(1536));
      expect(pdfKilobytes(EDITIONS.office, root)).toBe(2);
      writeFileSync(join(root, "public/menu", EDITIONS.office.file), Buffer.alloc(68_096));
      expect(pdfKilobytes(EDITIONS.office, root)).toBe(67);
      expect(() => pdfKilobytes(EDITIONS.shop, root)).toThrow(`${EDITIONS.shop.file}, which is missing: run npm run menu:pdf`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps both PDFs out of search results, and their security headers on", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    for (const edition of EDITION_LIST) {
      expect(rules.find((rule) => rule.source === edition.url)?.headers).toEqual([{ key: "X-Robots-Tag", value: "noindex" }]);
    }
    expect(rules.find((rule) => rule.source === "/:path*")?.headers.map((header) => header.key)).toContain("Content-Security-Policy");
    expect(rules.filter((rule) => rule.headers.some((header) => header.key === "X-Robots-Tag")).map((rule) => rule.source)).toEqual(EDITION_LIST.map((edition) => edition.url));
  });
});
