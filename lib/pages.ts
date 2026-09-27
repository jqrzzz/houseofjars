import { CONTENT_UPDATED } from "@/content";
import { guideList, guidePath, type Guide } from "@/content/guides";
import { identity } from "@/content/identity";
import { PRIVACY_UPDATED } from "@/content/privacy";
import { onlineBookingConfigured } from "./booking/config";
import { bookOnlinePage, pages, type PageInfo } from "./site";

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

/** When the words of /book with online booking last changed. */
const ONLINE_BOOKING_UPDATED = "2026-09-27";

/**
 * /book as a build shows it: online booking when Shadow Check-in's address
 * and key are set when the site is built, else the message form and the
 * booking sites.
 */
export function bookPage(online = onlineBookingConfigured()): PageInfo {
  return online ? bookOnlinePage : pages.book;
}

/** Every page, in the sitemap's order, as a build with or without online booking has them. */
export function sitePages(online: boolean): readonly SitePage[] {
  return [
    ...Object.values(pages).map((listed): SitePage => {
      const page = listed.path === pages.book.path ? bookPage(online) : listed;
      const own = page === bookOnlinePage ? ONLINE_BOOKING_UPDATED : ownDates[page.path];
      return { ...page, type: types[page.path] ?? "WebPage", updated: latest([own ?? CONTENT_UPDATED]) };
    }),
    ...guidePages,
  ];
}

/** Every page of this build. */
export const allPages: readonly SitePage[] = sitePages(onlineBookingConfigured());

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
