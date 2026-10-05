import type { Metadata, Viewport } from "next";
import { ViewTransition, type ReactNode } from "react";
import { MarkSymbol } from "@/components/brand/Mark";
import { Splash } from "@/components/brand/Splash";
import { StageLife } from "@/components/motion/StageLife";
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
    <html lang="en-GB" className={`${brandFont.variable} ${laoFont.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
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
          {/*
            Pages cross-fade into each other; links typed nav-forward or nav-back (deeper into the site, or back
            up it) move the page down or up as well. Section eyebrows glide into the next page's header (see Eyebrow).
          */}
          <ViewTransition default={{ "nav-forward": "page-forward", "nav-back": "page-back", default: "auto" }}>{children}</ViewTransition>
        </main>
        <SiteFooter />
        <ConciergeLauncher />
        {/* Wakes stages and phrases as they come into view, and pauses ambient motion off screen (components/motion). */}
        <StageLife />
      </body>
    </html>
  );
}
