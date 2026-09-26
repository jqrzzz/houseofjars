import localFont from "next/font/local";

// Self-hosted from @fontsource so builds never need the network. The
// stand-ins shown while they load are defined in globals.css, sized for each
// platform's own fonts: next/font's automatic one covers Arial only, which
// Android and Linux don't have, so text there reflowed when the fonts arrived.
//
// Headlines swap to Young Serif whenever it arrives: it carries the house's
// character, and headlines are short, so its sized stand-ins keep their lines.
// Running text is "optional": preloaded, it is used from the first paint when
// it arrives in time (and on every later visit); on a slow first visit the
// page stays in its sized stand-in instead of reflowing paragraphs mid-read.
export const displayFont = localFont({
  src: "../node_modules/@fontsource/young-serif/files/young-serif-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-display",
  adjustFontFallback: false,
});

export const bodyFont = localFont({
  src: "../node_modules/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "optional",
  variable: "--font-body",
  adjustFontFallback: false,
});

// Only the Lao-script greeting uses this, so it is not preloaded; its boxes
// are sized so the swap moves nothing (components/home/Hero.module.css).
export const laoFont = localFont({
  src: "../node_modules/@fontsource/noto-serif-lao/files/noto-serif-lao-lao-500-normal.woff2",
  weight: "500",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-lao",
  adjustFontFallback: false,
});
