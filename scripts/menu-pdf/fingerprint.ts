import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MARK_PATH, MARK_VIEWBOX } from "../../components/brand/mark-shape";
import { houseIcons } from "../../components/ui/house-icons";
import { menu } from "../../content/menu";
import { cardText } from "../../lib/menu/card";
import { readTokens } from "../social/theatre";

/*
 * The fingerprint of everything the printed card is made from, so a PDF in
 * public/menu/ can say which card it is (its Keywords: menu-facts:<sha256>) and
 * the CI test (menu-pdf.test.ts) can tell, with no Chromium, when the card has
 * moved on without it: the words and prices on both sides (cardText), the
 * menu's date, the colours the card prints in, the mark and the two icons, the
 * typeface's version, and the files that draw and finish the card. A price
 * changed in content/menu.ts, or a rule in the card's stylesheets, changes it;
 * a PDF rebuilt by another Chromium from the same card keeps it.
 *
 * The screen-only files (MenuCard.tsx and its stylesheet) are not part of it:
 * nothing in them reaches the paper.
 */

/** The files that draw the card and finish its PDFs, read as text with Windows line ends made plain. */
export const FINGERPRINT_FILES = [
  "components/menu/MenuFaces.tsx",
  "components/menu/MenuFaces.module.css",
  "components/menu/MenuSheet.module.css",
  "lib/menu/card.ts",
  "lib/menu/print-spec.ts",
  "scripts/menu-pdf/page.ts",
  "scripts/menu-pdf/finish.ts",
] as const;

/** The Day tokens the card prints in: its orange, its brand-text, ink, ink-soft and white, and the teak of the board's edge. */
const TOKENS = ["--jar-orange", "--brand-text", "--ink", "--ink-soft", "--white", "--teak-deep"] as const;

/** The sha256, in hex, of the card's sources: what each PDF's Keywords carry after "menu-facts:". */
export function menuFingerprint(root = process.cwd()): string {
  const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
  const day = new Map(readTokens(read("app/globals.css")).day);
  const sources = {
    text: { front: cardText("front"), back: cardText("back") },
    asOf: menu.asOf.value,
    tokens: Object.fromEntries(TOKENS.map((name) => [name, day.get(name) ?? null])),
    mark: { path: MARK_PATH, viewBox: MARK_VIEWBOX },
    icons: { coffee: houseIcons.coffee, glass: houseIcons.glass },
    figtree: (JSON.parse(read("node_modules/@fontsource/figtree/package.json")) as { version: string }).version,
    files: Object.fromEntries(FINGERPRINT_FILES.map((path) => [path, read(path)])),
  };
  return createHash("sha256").update(JSON.stringify(sources)).digest("hex");
}
