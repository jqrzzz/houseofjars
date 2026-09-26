import { CONTENT_UPDATED } from "@/content";
import { guideList, guidePath, type Guide } from "@/content/guides";
import { identity } from "@/content/identity";
import { PRIVACY_UPDATED } from "@/content/privacy";
import { pages, type PageInfo } from "./site";

/*
 * Every page on the site with what search engines and assistants need to
 * know about it. Server-side only: lib/site.ts stays small because the
 * browser loads it too.
 */

/** schema.org's kind of web page, for the structured data. */
export type WebPageType = "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";

export interface SitePage extends PageInfo {
  readonly type: WebPageType;
  /** When the page's content last changed (YYYY-MM-DD): the sitemap's lastmod and the structured data's dateModified. */
  readonly updated: string;
  /** When the page's facts were last reviewed, for pages that show it (the guides). */
  readonly reviewed?: string;
  /** The guide the page shows, if it is one. */
  readonly guide?: Guide;
}

const latest = (dates: readonly string[]): string => dates.reduce((a, b) => (b > a ? b : a), CONTENT_UPDATED);

const types: Readonly<Record<string, WebPageType>> = {
  [pages.about.path]: "AboutPage",
  [pages.book.path]: "ContactPage",
  [pages.guides.path]: "CollectionPage",
};

/** Pages whose content has its own date; the rest change with the facts (CONTENT_UPDATED). */
const ownDates: Readonly<Record<string, string>> = {
  [pages.privacy.path]: PRIVACY_UPDATED,
  [pages.guides.path]: latest(guideList.map((guide) => guide.reviewed)),
};

export const guidePages: readonly SitePage[] = guideList.map((guide) => ({
  path: guidePath(guide),
  title: guide.title,
  ...(guide.fullTitle ? { fullTitle: guide.fullTitle } : {}),
  description: guide.description,
  nav: guide.name,
  teaser: guide.teaser,
  type: "WebPage",
  updated: latest([guide.reviewed]),
  reviewed: guide.reviewed,
  guide,
}));

/** Every page, in the sitemap's order. */
export const allPages: readonly SitePage[] = [
  ...Object.values(pages).map(
    (page): SitePage => ({
      ...page,
      type: types[page.path] ?? "WebPage",
      updated: latest([ownDates[page.path] ?? CONTENT_UPDATED]),
    }),
  ),
  ...guidePages,
];

export function findPage(path: string): SitePage {
  const page = allPages.find((candidate) => candidate.path === path);
  if (!page) throw new Error(`No page at ${path}`);
  return page;
}

/** The <title>: the page's own name, then the site's full name, unless the page gives its whole title. */
export function metaTitle(page: PageInfo): string {
  return page.fullTitle ?? `${page.title} · ${identity.fullName.value}`;
}

export interface Crumb {
  readonly name: string;
  readonly path: string;
}

/** Home, then each level down to the page. Empty for the home page itself. */
export function breadcrumbTrail(page: Pick<PageInfo, "path">): Crumb[] {
  const segments = page.path.split("/").filter(Boolean);
  if (segments.length === 0) return [];
  return [
    { name: "Home", path: "/" },
    ...segments.map((_, index) => {
      const path = `/${segments.slice(0, index + 1).join("/")}`;
      const found = findPage(path);
      return { name: found.nav ?? found.title, path };
    }),
  ];
}
