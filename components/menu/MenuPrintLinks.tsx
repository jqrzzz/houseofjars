import { statSync } from "node:fs";
import { join } from "node:path";
import buttons from "@/components/ui/button.module.css";
import { EDITIONS, type EditionSpec } from "@/lib/menu/print-spec";
import styles from "./MenuPrintLinks.module.css";

/**
 * A PDF's size as its link gives it: kilobytes of 1024 bytes, rounded, read
 * from public/menu/ when the page is built. A missing file stops the build,
 * so the page never links a PDF that isn't there.
 */
export function pdfKilobytes(edition: EditionSpec, root = process.cwd()): number {
  const path = join(root, "public", "menu", edition.file);
  let bytes: number;
  try {
    bytes = statSync(path).size;
  } catch (cause) {
    throw new Error(`The menu page links ${path}, which is missing: run npm run menu:pdf`, { cause });
  }
  return Math.round(bytes / 1024);
}

/** The two PDFs, office first: what each link says, then how to print it. */
const files = [
  {
    edition: EDITIONS.office,
    label: (kB: number) => `The menu card for any printer (PDF, A4, front and back, ${kB} kB)`,
    note: "Print at actual size (100%), on both sides of the paper. A white border keeps the orange side even on any printer.",
  },
  {
    edition: EDITIONS.shop,
    label: (kB: number) => `The file for a print shop (PDF, A4 with ${EDITIONS.shop.bleedMm} mm bleed, ${kB} kB)`,
    note: `The orange runs ${EDITIONS.shop.bleedMm} mm past the A4 trim, as print shops ask. Ask for a printed proof of the orange before a full run.`,
  },
] as const;

/**
 * "Print the menu card", under the card: the two PDFs the print engine makes
 * from the same faces (npm run menu:pdf, lib/menu/print-spec.ts). Each link
 * names its file, format, pages and size. They are plain links, with no
 * download attribute, so a phone opens its own PDF viewer; they draw the
 * site's thread when pointed at or focused. The panel takes the page's
 * colours in Day and Evening, and is left off the printed page.
 */
export function MenuPrintLinks() {
  return (
    <section className={`container ${styles.panel}`} aria-labelledby="menu-print-title">
      <h2 id="menu-print-title" className={styles.title}>
        Print the menu card
      </h2>
      <ul className={styles.list} role="list">
        {files.map(({ edition, label, note }) => (
          <li key={edition.edition}>
            <a href={edition.url} className={buttons.textLink}>
              <span>{label(pdfKilobytes(edition))}</span>
            </a>
            <p className={styles.note}>{note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
