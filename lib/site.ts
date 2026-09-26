/** Canonical origin of the site, without a trailing slash. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://thehouseofjars.com").replace(/\/+$/, "");

export interface PageInfo {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  /** Short label for navigation. */
  readonly nav?: string;
}

export const pages = {
  home: {
    path: "/",
    title: "House of Jars, a calm hostel in the heart of Vientiane",
    description:
      "A calm, very clean dorm hostel in Ban Anou, central Vientiane: curtained pod beds, strong air-conditioning, breakfast in our café and a team on site 24 hours. Owned and run by Nang.",
  },
  house: {
    path: "/the-house",
    nav: "The house",
    title: "The house",
    description:
      "Pod beds with privacy curtains, reading lights, sockets and lockers; shared bathrooms with hot showers; breakfast in the café downstairs. What to expect at House of Jars.",
  },
  rules: {
    path: "/house-rules",
    nav: "House rules",
    title: "House rules",
    description:
      "The few rules that keep House of Jars calm and clean, each with the reason behind it, plus what to bring to check-in.",
  },
  vientiane: {
    path: "/vientiane",
    nav: "Vientiane",
    title: "Getting here and around Vientiane",
    description:
      "From Wattay International Airport to Ban Anou, walking times to the Mekong and the National Museum, and the Lao Digital Immigration Form.",
  },
  faq: {
    path: "/faq",
    nav: "Questions",
    title: "Questions and answers",
    description:
      "Check-in times, beds, breakfast, bathrooms, the airport, passports and booking: plain answers about staying at House of Jars.",
  },
  about: {
    path: "/about",
    nav: "About",
    title: "About the house",
    description:
      "House of Jars is a calm hostel in Vientiane, owned and run by Nang. Why it is called House of Jars, and the team behind it.",
  },
  book: {
    path: "/book",
    nav: "Book",
    title: "Prices and booking",
    description:
      "See live prices and availability on Booking.com and Agoda, or send the House of Jars team a message and they will reply by email or WhatsApp.",
  },
  privacy: {
    path: "/privacy",
    title: "Privacy notice",
    description:
      "What the House of Jars booking form and Shadow, our AI concierge, collect, why, who processes it, how long we keep it and how to ask us to delete it.",
  },
} as const satisfies Record<string, PageInfo>;

export const primaryNav = [pages.house, pages.rules, pages.vientiane, pages.faq, pages.about] as const;

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
