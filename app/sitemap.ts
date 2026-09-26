import type { MetadataRoute } from "next";
import { CONTENT_UPDATED } from "@/content";
import { absoluteUrl, pages } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.values(pages).map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: CONTENT_UPDATED,
    changeFrequency: "monthly",
    priority: page.path === "/" ? 1 : page.path === "/privacy" ? 0.3 : 0.7,
  }));
}
