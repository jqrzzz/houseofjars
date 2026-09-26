import type { Metadata } from "next";
import { identity } from "@/content/identity";
import type { PageInfo } from "./site";

const siteName = identity.name.value;

/**
 * Title, description, canonical URL and social cards for one page. The
 * Open Graph image comes from the page's opengraph-image.tsx.
 */
export function pageMetadata(page: PageInfo): Metadata {
  const isHome = page.path === "/";
  const socialTitle = isHome ? page.title : `${page.title} · ${siteName}`;
  return {
    title: isHome ? { absolute: page.title } : page.title,
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: {
      type: "website",
      siteName,
      locale: "en_GB",
      url: page.path,
      title: socialTitle,
      description: page.description,
    },
    twitter: { card: "summary_large_image", title: socialTitle, description: page.description },
  };
}
