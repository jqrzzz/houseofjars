import type { Metadata, Viewport } from "next";
import { ViewTransition, type ReactNode } from "react";
import { MarkSymbol } from "@/components/brand/Mark";
import { Splash } from "@/components/brand/Splash";
import { ConciergeLauncher } from "@/components/concierge/ConciergeLauncher";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { identity } from "@/content/identity";
import { pages, siteUrl } from "@/lib/site";
import { bootScript, themeColor } from "@/lib/theme";
import { siteVerification } from "@/lib/verification";
import { brandFont, laoFont } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: pages.home.fullTitle, template: `%s · ${identity.fullName.value}` },
  description: pages.home.description,
  applicationName: identity.name.value,
  formatDetection: { telephone: false, email: false, address: false },
  verification: siteVerification(),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: themeColor.light },
    { media: "(prefers-color-scheme: dark)", color: themeColor.dark },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The boot script may set data-theme and the splash class before React hydrates, so <html> accepts what it finds.
    <html lang="en-GB" className={`${brandFont.variable} ${laoFont.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <MarkSymbol />
        <Splash />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {/* Pages cross-fade into each other; section eyebrows glide into the next page's header (see Eyebrow). */}
          <ViewTransition>{children}</ViewTransition>
        </main>
        <SiteFooter />
        <ConciergeLauncher />
      </body>
    </html>
  );
}
