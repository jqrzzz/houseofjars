import type { Metadata } from "next";

/** A verification token as search engines issue them: letters, digits, "-" and "_". */
const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * Reads a verification variable: the token itself, or the whole meta tag
 * pasted from the search engine's instructions. Anything else is ignored.
 */
export function verificationToken(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const token = /content\s*=\s*["']([^"']*)["']/i.exec(raw)?.[1]?.trim() ?? raw;
  return TOKEN.test(token) ? token : null;
}

/**
 * The meta tags that prove to Google Search Console and Bing Webmaster
 * Tools that the owner controls the site, from GOOGLE_SITE_VERIFICATION and
 * BING_SITE_VERIFICATION (read when the site is built). Unset, none are added.
 */
export function siteVerification(env: Readonly<Record<string, string | undefined>> = process.env): Metadata["verification"] {
  const google = verificationToken(env.GOOGLE_SITE_VERIFICATION);
  const bing = verificationToken(env.BING_SITE_VERIFICATION);
  if (!google && !bing) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  };
}
