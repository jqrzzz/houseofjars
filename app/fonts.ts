import localFont from "next/font/local";

// Self-hosted from @fontsource so builds never need the network. The
// stand-ins shown while they load are defined in globals.css, sized for each
// platform's own fonts: next/font's automatic one covers Arial only, which
// Android and Linux don't have, so text there reflowed when the fonts arrived.
//
// Figtree is the house's typeface (brand/README.md), the closest free match
// to the lettering on its signs: one variable file for every weight, from the
// headlines' 700 to the running text's 400. Its stand-ins are fitted to it, so
// it swaps in without moving the lines.
export const brandFont = localFont({
  src: "../node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2",
  weight: "300 900",
  style: "normal",
  display: "swap",
  variable: "--font-brand",
  adjustFontFallback: false,
});

// Lao script (the hero's greeting and any Lao text): Noto Sans Lao, which sits
// beside Figtree in every stack. Not preloaded: only a few words use it. Its
// unicode-range keeps browsers from fetching it for pages without Lao text.
export const laoFont = localFont({
  src: "../node_modules/@fontsource-variable/noto-sans-lao/files/noto-sans-lao-lao-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-lao",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0E81-0EDF, U+200C-200D, U+25CC" }],
});
