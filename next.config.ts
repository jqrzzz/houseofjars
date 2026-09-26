import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Next's CSP "without nonces" (node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md), which keeps every page static: nonces would
 * force per-request rendering, so inline scripts stay allowed. Everything
 * else is locked to this site: scripts, styles, fonts, images and fetches come
 * only from here, nothing can frame the site, and there are no plugins,
 * <base> or off-site form targets. React's escaping remains the first
 * defence for Shadow's model-written replies; this is the second.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // React needs eval only in development, for its debugging stacks.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Two years, subdomains included. Add "preload" only if the owner opts in to the browsers' preload list.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // For browsers without CSP frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
