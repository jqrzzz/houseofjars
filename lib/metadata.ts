import type { Metadata } from "next";
import { identity } from "@/content/identity";
import { metaTitle } from "./pages";
import type { PageInfo } from "./site";

/**
 * Title, description, canonical URL and social cards for one page. The
 * Open Graph image comes from the page's opengraph-image.tsx.
 */
export function pageMetadata(page: PageInfo): Metadata {
  const socialTitle = page.fullTitle ?? `${page.title} · ${identity.name.value}`;
  return {
    title: { absolute: metaTitle(page) },
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: {
      type: "website",
      siteName: identity.name.value,
      locale: "en_GB",
      url: page.path,
      title: socialTitle,
      description: page.description,
    },
    twitter: { card: "summary_large_image", title: socialTitle, description: page.description },
  };
}
