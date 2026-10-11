import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cardText, menuCard } from "@/lib/menu/card";
import { CONTENT_MARGIN_MM, EDITION_LIST, EDITIONS, FACTS_PREFIX } from "@/lib/menu/print-spec";
import { contrast, hex } from "./checks";
import { menuFingerprint } from "./fingerprint";
import { pdfFingerprint, pdfProblems, staleLine, type PdfProblem } from "./pdf-checks";

/*
 * The printed menu card in CI, with no Chromium: each committed PDF in
 * public/menu/ must still say what the card says, have been made from today's
 * card sources (its Keywords against menuFingerprint()), and be the finished
 * PDF the engine writes. A price changed in content/menu.ts, or a rule in the
 * card's stylesheets, without npm run menu:pdf fails here, naming the file, the
 * page and the line. A rebuild by another Chromium keeps the fingerprint, so
 * it passes. next build never waits on the PDFs.
 */

const RUN_AGAIN = "Run npm run menu:pdf and commit public/menu/.";
const read = (path: string) => readFileSync(join(process.cwd(), path));
const committed = (path: string) => {
  expect(existsSync(join(process.cwd(), path)), `${path} is missing. ${RUN_AGAIN}`).toBe(true);
  return read(path);
};
const where = (path: string, problem: PdfProblem) => `${path}${problem.page ? `, page ${problem.page}` : ""} ${problem.text}`;

describe("the committed menu PDFs", () => {
  const fingerprint = menuFingerprint();
  for (const { edition, file } of EDITION_LIST) {
    const path = `public/menu/${file}`;

    it(`${path} says what the card says, and was made from today's card`, () => {
      const bytes = committed(path);
      const stale = pdfProblems(bytes, edition).filter((problem) => problem.kind === "text");
      expect(stale.map((problem) => `${where(path, problem)}. ${RUN_AGAIN}`)).toEqual([]);
      const theirs = pdfFingerprint(bytes);
      const made = theirs === fingerprint ? [] : [`${path} was built from other card sources (${FACTS_PREFIX}${theirs?.slice(0, 12) ?? "none"} in the file, ${fingerprint.slice(0, 12)} now). ${RUN_AGAIN}`];
      expect(made).toEqual([]);
    });

    it(`${path} is the ${edition} edition, finished: two flat, tagged pages in the static Figtree`, () => {
      const bytes = committed(path);
      expect(pdfProblems(bytes, edition).filter((problem) => problem.kind === "file").map((problem) => where(path, problem))).toEqual([]);
    });
  }
});

describe("a stale page, in words", () => {
  // A PDF made before a price changed: the card's own line, with its first figure as it might have been.
  const before = (line: string) => line.replace(/\d[\d,]*/, "9,999");

  it("quotes the line the PDF still prints and the line the menu prints now", () => {
    const back = cardText("back");
    const latte = back.find((line) => line.startsWith("Latte "))!;
    const was = back.map((line) => (line === latte ? before(line) : line)).join(" ");
    expect(staleLine(was, "back")).toEqual({ says: before(latte), now: latte });
    expect(staleLine(back.join(" "), "back")).toBeNull();
    // As Chromium sets the front's extras ("+" apart from the figure), read the way the card writes them.
    const front = cardText("front");
    const egg = front.find((line) => line.startsWith("Egg "))!;
    const spaced = front.map((line) => (line === egg ? before(line) : line).replace(/\+(?=\d)/g, "+ ")).join(" ");
    expect(staleLine(spaced, "front")).toEqual({ says: before(egg), now: egg });
    // A line the PDF lacks.
    const { title } = menuCard().front.board.add;
    expect(staleLine(front.filter((line) => line !== title).join(" "), "front")).toEqual({ says: "", now: title });
  });
});

describe("the engine's contrast and colours", () => {
  it("measures the card's pairs as the design does, so its 4.5:1 rule means what the design means", () => {
    const ratio = (fg: string, bg: string) => Number(contrast(fg, bg).toFixed(2));
    expect(ratio("#171713", "#e76e43")).toBe(5.74); // ink on jar orange
    expect(ratio("#ffffff", "#e76e43")).toBe(3.13); // the white title on jar orange, large and bold only
    expect(ratio("#171713", "#ffffff")).toBe(17.97);
    expect(ratio("#bf4a1b", "#ffffff")).toBe(4.99); // brand-text on white
    expect(ratio("#6b5645", "#ffffff")).toBe(6.9); // ink-soft on white
    expect(hex("rgb(231, 110, 67)")).toBe("#e76e43");
    expect(hex("color(srgb 0.905882 0.431373 0.262745)")).toBe("#e76e43");
  });
});

describe("the card's paper (MenuSheet.module.css)", () => {
  const css = (path: string) => read(path).toString("utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const sheet = css("components/menu/MenuSheet.module.css");
  const faces = css("components/menu/MenuFaces.module.css");
  const block = (source: string, selector: string) => {
    const start = source.indexOf(`${selector} {`);
    expect(start, `${selector} is in the stylesheet`).toBeGreaterThan(-1);
    return source.slice(source.indexOf("{", start) + 1, source.indexOf("}", start));
  };
  const declarations = (body: string) => Object.fromEntries([...body.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name!, value!.trim()]));

  it("touches only print: every rule sits inside @media print", () => {
    const opened = sheet.indexOf("@media print {");
    expect(opened).toBeGreaterThan(-1);
    let [depth, closed] = [0, -1];
    for (let i = sheet.indexOf("{", opened); i < sheet.length && closed < 0; i++) {
      if (sheet[i] === "{") depth++;
      else if (sheet[i] === "}" && --depth === 0) closed = i;
    }
    expect(sheet.slice(0, opened).trim()).toBe("");
    expect(closed).toBeGreaterThan(opened);
    expect(sheet.slice(closed + 1).trim()).toBe("");
    expect(sheet.match(/@media/g)).toHaveLength(1);
  });

  it("gives every --card-* size the face declares for the screen its print value, and no other", () => {
    const screen = Object.keys(declarations(block(faces, ":where(.face)")));
    const print = Object.keys(declarations(block(sheet, ".sheet"))).filter((name) => name.startsWith("--"));
    expect(screen).toHaveLength(42);
    expect(print.sort()).toEqual(screen.sort());
  });

  it("is each edition's page, keeping the words where print-spec.ts puts them, with the office mat", () => {
    const office = declarations(block(sheet, ".sheet"));
    const shop = declarations(block(sheet, ':global(html[data-menu-output="shop"]) .sheet'));
    const mm = (value: number) => `${value}mm`;
    expect([office.width, office.height]).toEqual([mm(EDITIONS.office.pageMm.width), mm(EDITIONS.office.pageMm.height)]);
    expect([shop.width, shop.height]).toEqual([mm(EDITIONS.shop.pageMm.width), mm(EDITIONS.shop.pageMm.height)]);
    for (const [values, bleed] of [
      [office, EDITIONS.office.bleedMm],
      [shop, EDITIONS.shop.bleedMm],
    ] as const) {
      expect([values["--card-pad-top"], values["--card-pad-x"], values["--card-pad-bottom"]]).toEqual(
        [CONTENT_MARGIN_MM.top, CONTENT_MARGIN_MM.side, CONTENT_MARGIN_MM.bottom].map((margin) => mm(margin + bleed)),
      );
    }
    expect(declarations(block(sheet, '.sheet[data-face="front"]::before')).inset).toBe(mm(EDITIONS.office.matMm));
    expect(declarations(block(sheet, ':global(html[data-menu-output="shop"]) .sheet[data-face="front"]::before')).inset).toBe("-1mm");
  });
});
