import type { ReactNode } from "react";
import { bodyFont, displayFont, laoFont } from "./fonts";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} ${laoFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
