import type { MetadataRoute } from "next";
import { allPages } from "@/lib/pages";
import { absoluteUrl } from "@/lib/site";

/** Every page, with lastmod from the content's own dates (lib/pages.ts). */
export default function sitemap(): MetadataRoute.Sitemap {
  return allPages.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: page.updated,
    changeFrequency: "monthly",
    priority: page.path === "/" ? 1 : page.path === "/privacy" ? 0.3 : 0.7,
  }));
}
