/** Canonical origin of the site, without a trailing slash. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.houseofjars.la").replace(/\/+$/, "");

export interface PageInfo {
  readonly path: string;
  /**
   * The page's name in search results, before " · House of Jars Hostel,
   * Vientiane" (see lib/pages.ts); also the heading of its link preview.
   * Written for what people search for, and never claiming more than the
   * content does. Facts in titles and descriptions are checked against the
   * content layer by lib/pages.test.ts.
   */
  readonly title: string;
  /** The whole title in search results, when the site's name reads better inside it. */
  readonly fullTitle?: string;
  /** The page's summary in search results and link previews: 70 to 160 characters. */
  readonly description: string;
  /** Short label for navigation and breadcrumbs. */
  readonly nav?: string;
  /** One line for links to the page from elsewhere on the site. */
  readonly teaser?: string;
}

export const pages = {
  home: {
    path: "/",
    title: "Calm, clean pod hostel in central Vientiane",
    fullTitle: "House of Jars · Calm, clean pod hostel in central Vientiane",
    description:
      "A calm, very clean dorm hostel in Ban Anou, central Vientiane: curtained pod beds, breakfast in the café and a team on site 24 hours.",
  },
  house: {
    path: "/the-house",
    nav: "The house",
    title: "Pod beds and breakfast",
    description:
      "Every bed is a pod with a privacy curtain, reading light, power socket and locker. Shared bathrooms with hot showers, and breakfast in the café downstairs.",
    teaser: "Pod beds, shared bathrooms with hot showers, and breakfast in the café.",
  },
  rules: {
    path: "/house-rules",
    nav: "House rules",
    title: "House rules and check-in times",
    description:
      "Check-in from 14:00 and check-out until 11:30, the few rules that keep House of Jars calm, each with its reason, and what to bring to check-in.",
    teaser: "Check-in and check-out times, and the few rules that keep the house calm.",
  },
  vientiane: {
    path: "/vientiane",
    nav: "Vientiane",
    title: "Location and getting here",
    description:
      "House of Jars is in Ban Anou, central Vientiane: about 3 km from Wattay International Airport and 7 minutes’ walk from the Mekong riverside.",
    teaser: "The airport, walking distances and arriving in Laos.",
  },
  faq: {
    path: "/faq",
    nav: "Questions",
    title: "Questions and answers",
    description:
      "Check-in times, pod beds, breakfast, bathrooms, the airport, passports and booking: plain answers about staying at House of Jars in Vientiane.",
    teaser: "Plain answers about beds, breakfast, passports and booking.",
  },
  about: {
    path: "/about",
    nav: "About",
    title: "About the house",
    description:
      "House of Jars is a calm dorm hostel in Ban Anou, Vientiane: what it is made for, why it is called House of Jars, its mark and its team.",
    teaser: "What the house is made for, and why it is called House of Jars.",
  },
  book: {
    path: "/book",
    nav: "Book",
    title: "Book direct",
    description:
      "Book direct with House of Jars, for less than on the booking sites: send your dates on WhatsApp (+856 20 23 978 946) or by email.",
    teaser: "Your dates to the team on WhatsApp or by email, written out for you.",
  },
  trips: {
    path: "/trips",
    nav: "Trips",
    title: "Train, bus and tour tickets",
    description:
      "The House of Jars team in Vientiane books train tickets, buses and tours for guests, usually for less than online. Send your trip on WhatsApp or by email.",
    teaser: "Trains, buses and tours, booked by the team for less than online.",
  },
  guides: {
    path: "/guides",
    nav: "Guides",
    title: "Guides for your stay",
    description:
      "Plain answers for your stay at House of Jars in Vientiane: the airport, the Lao immigration form, train tickets, getting around, a day out and Thailand.",
    teaser: "The airport, the immigration form, train tickets, getting around, a day in the city and crossing to Thailand.",
  },
  privacy: {
    path: "/privacy",
    title: "Privacy notice",
    description:
      "What the House of Jars booking form and Shadow, our AI concierge, collect, why, who processes it, how long we keep it and how to ask us to delete it.",
  },
} as const satisfies Record<string, PageInfo>;

/**
 * /book when the site takes bookings online (Shadow Check-in's address and
 * key set when it is built; lib/pages.ts bookPage). Words that fit both of
 * Shadow's modes: confirmed straight away, or once the team has checked.
 */
export const bookOnlinePage = {
  path: pages.book.path,
  nav: pages.book.nav,
  title: "Book a bed",
  description:
    "See the free beds for your dates and book directly with House of Jars: nothing to pay online, you pay when you arrive. Or book on Booking.com or Agoda.",
  teaser: "The free beds for your dates, booked directly with the house.",
} as const satisfies PageInfo;

export const primaryNav = [pages.house, pages.rules, pages.vientiane, pages.trips, pages.faq, pages.about] as const;

export function absoluteUrl(path: string): string {
  return new URL(path, `${siteUrl}/`).toString();
}

/**
 * Where the team signs in to Shadow Check-in, the house's operations system:
 * SHADOW_APP_URL, read when the site is built. Only an https address (or
 * http on this machine, for development) is used; anything else hides the
 * footer link rather than pointing it somewhere odd.
 */
export function teamSignInUrl(value = process.env.SHADOW_APP_URL): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}
