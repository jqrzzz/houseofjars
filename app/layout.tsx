import type { Metadata, Viewport } from "next";
import { ViewTransition, type ReactNode } from "react";
import { JsonLd } from "@/components/JsonLd";
import { ConciergeLauncher } from "@/components/concierge/ConciergeLauncher";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { identity } from "@/content/identity";
import { siteJsonLd } from "@/lib/jsonld";
import { pages, siteUrl } from "@/lib/site";
import { bodyFont, displayFont, laoFont } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: pages.home.title, template: `%s · ${identity.name.value}` },
  description: pages.home.description,
  applicationName: identity.name.value,
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#140e09" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${displayFont.variable} ${bodyFont.variable} ${laoFont.variable}`}>
      <body>
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
        <JsonLd data={siteJsonLd()} />
      </body>
    </html>
  );
}
