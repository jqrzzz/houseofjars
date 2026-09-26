import localFont from "next/font/local";

// Self-hosted from @fontsource so builds never need the network.
export const displayFont = localFont({
  src: "../node_modules/@fontsource/young-serif/files/young-serif-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-display",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const bodyFont = localFont({
  src: "../node_modules/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-body",
  fallback: ["system-ui", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
});

// Only the Lao-script greeting uses this, so it is not preloaded.
export const laoFont = localFont({
  src: "../node_modules/@fontsource/noto-serif-lao/files/noto-serif-lao-lao-500-normal.woff2",
  weight: "500",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-lao",
  fallback: ["serif"],
});
