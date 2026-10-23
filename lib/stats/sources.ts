/*
 * Where a visit came from, as Shadow Check-in names it (SHADOW-CHECKIN
 * lib/site-counts/insights.ts SOURCES keeps the same names): a search engine,
 * an AI assistant, a booking or travel site, social media, another site by
 * its domain, or "direct" (typed, saved, or from an app that sends no
 * address). Only the name or the domain leaves the server: never the address
 * the visitor came from, nor what they searched for.
 */

type HostRule = readonly [test: (host: string) => boolean, source: string];

const under = (...domains: string[]) => (host: string) => domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
const exactly = (...hosts: string[]) => (host: string) => hosts.includes(host);
/** A brand under any country's domain: google.com, google.co.th, google.com.au, google.la. */
const anyCountry = (brand: string) => {
  const pattern = new RegExp(`(^|\\.)${brand}\\.(com|[a-z]{2})(\\.[a-z]{2})?$`);
  return (host: string) => pattern.test(host);
};
const google = anyCountry("google");
const yahoo = anyCountry("yahoo");
const yandex = anyCountry("yandex");
const pinterest = anyCountry("pinterest");

/** In order: the first that matches names the source (Gemini before Google, Copilot before Bing). */
const HOSTS: readonly HostRule[] = [
  // AI assistants
  [under("chatgpt.com", "chat.openai.com"), "chatgpt"],
  [under("perplexity.ai"), "perplexity"],
  [exactly("gemini.google.com", "bard.google.com"), "gemini"],
  [exactly("copilot.microsoft.com", "copilot.cloud.microsoft", "edgeservices.bing.com"), "copilot"],
  [under("claude.ai"), "claude"],
  [under("deepseek.com"), "deepseek"],
  [under("grok.com", "x.ai"), "grok"],
  [under("meta.ai"), "meta-ai"],
  [exactly("chat.mistral.ai"), "mistral"],
  // Search engines (a mail service on the same domain is not one)
  [(host) => !host.startsWith("mail.") && google(host), "google"],
  [under("bing.com"), "bing"],
  [under("duckduckgo.com"), "duckduckgo"],
  [(host) => !host.startsWith("mail.") && yahoo(host), "yahoo"],
  [(host) => yandex(host) || host === "ya.ru", "yandex"],
  [under("baidu.com"), "baidu"],
  [under("naver.com"), "naver"],
  [under("ecosia.org"), "ecosia"],
  [exactly("search.brave.com"), "brave"],
  // Booking and travel sites
  [under("booking.com"), "booking"],
  [anyCountry("agoda"), "agoda"],
  [under("hostelworld.com"), "hostelworld"],
  [anyCountry("airbnb"), "airbnb"],
  [anyCountry("expedia"), "expedia"],
  [anyCountry("tripadvisor"), "tripadvisor"],
  [under("trip.com"), "trip"],
  [under("traveloka.com"), "traveloka"],
  // Social media and messaging
  [under("facebook.com", "fb.com", "fb.me", "m.me", "messenger.com"), "facebook"],
  [under("instagram.com"), "instagram"],
  [under("tiktok.com"), "tiktok"],
  [under("youtube.com", "youtu.be"), "youtube"],
  [under("t.co", "twitter.com", "x.com"), "x"],
  [under("reddit.com"), "reddit"],
  [under("linkedin.com", "lnkd.in"), "linkedin"],
  [(host) => pinterest(host) || host === "pin.it", "pinterest"],
  [under("threads.net", "threads.com"), "threads"],
  [under("whatsapp.com", "wa.me"), "whatsapp"],
  [under("t.me", "telegram.org", "telegram.me"), "telegram"],
  [under("line.me"), "line"],
];

/** Android apps send "android-app://<package>/" as the address they came from. */
const APPS: readonly (readonly [prefix: string, source: string])[] = [
  ["com.google.android.googlequicksearchbox", "google"],
  ["com.openai.chatgpt", "chatgpt"],
  ["ai.perplexity", "perplexity"],
  ["com.google.android.apps.bard", "gemini"],
  ["com.anthropic.claude", "claude"],
  ["com.facebook", "facebook"],
  ["com.instagram", "instagram"],
  ["com.zhiliaoapp.musically", "tiktok"],
  ["com.ss.android.ugc", "tiktok"],
  ["com.google.android.youtube", "youtube"],
  ["com.twitter.android", "x"],
  ["com.reddit", "reddit"],
  ["com.linkedin", "linkedin"],
  ["com.whatsapp", "whatsapp"],
  ["org.telegram", "telegram"],
  ["jp.naver.line", "line"],
];

/** Every name above, and a few names links use for them (utm_source=fb). */
const NAMES = new Set(HOSTS.map(([, source]) => source));
const ALIASES: Readonly<Record<string, string>> = { openai: "chatgpt", fb: "facebook", ig: "instagram", twitter: "x" };

/** A host's source: a name above, or the host itself without "www." (Shadow's limit: 64 characters, a-z 0-9 . -). */
export function hostSource(host: string): string {
  const bare = host.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  for (const [test, source] of HOSTS) if (test(bare)) return source;
  return /^[a-z0-9][a-z0-9.-]{0,63}$/.test(bare) ? bare : "other";
}

/**
 * A link's own label (utm_source=chatgpt.com, which ChatGPT adds to the links
 * it gives; or a name the house puts on its own links, such as "qr" on a
 * printed menu): a name above, the source of a host, or the label itself in
 * small letters (at most 40 characters of a-z, 0-9 and -). Null when empty.
 */
export function labelSource(label: string | null | undefined): string | null {
  const text = label?.trim().toLowerCase() ?? "";
  if (!text) return null;
  if (NAMES.has(text)) return text;
  if (ALIASES[text]) return ALIASES[text];
  if (text.includes(".")) {
    try {
      return hostSource(new URL(text.includes("://") ? text : `https://${text}`).hostname);
    } catch {
      return null;
    }
  }
  const tidy = text.replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/^-+/, "").slice(0, 40);
  return tidy || null;
}

/**
 * Where the first page of a visit came from: the link's own label when it has
 * one Shadow can name, else the page the browser came from (its host, or an
 * Android app), else "direct". Null when that page is this site's own: a page
 * the visitor opened from another of its pages is not a new visit.
 */
export function visitSource(referrer: string | null | undefined, label: string | null | undefined, ownHosts: readonly string[]): string | null {
  let from: URL | null = null;
  try {
    from = referrer ? new URL(referrer) : null;
  } catch {
    from = null;
  }
  const own = (host: string) => {
    const bare = host.toLowerCase().replace(/^www\./, "");
    return ownHosts.some((ownHost) => ownHost.toLowerCase().replace(/^www\./, "") === bare);
  };
  if (from && (from.protocol === "http:" || from.protocol === "https:") && (own(from.host) || own(from.hostname))) return null;

  const labelled = labelSource(label);
  if (labelled) return labelled;
  if (!from) return "direct";
  if (from.protocol === "android-app:") {
    const app = from.hostname.toLowerCase();
    return APPS.find(([prefix]) => app === prefix || app.startsWith(`${prefix}.`))?.[1] ?? "direct";
  }
  if (from.protocol !== "http:" && from.protocol !== "https:") return "direct";
  return hostSource(from.hostname);
}
