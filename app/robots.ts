import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Search and AI assistants are welcome to read the site; crawlers stay out of the APIs.
const CRAWLERS = [
  "Googlebot",
  "Bingbot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
];

// Assistants fetching for a traveller, there and then: they may also use the read-only doors for agents (lib/agents/mcp.ts).
const FETCHERS = ["ChatGPT-User", "Claude-User", "Perplexity-User"];
const AGENT_PATHS = ["/api/mcp", "/api/availability"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: FETCHERS, allow: ["/", ...AGENT_PATHS], disallow: "/api/" },
      { userAgent: CRAWLERS.filter((agent) => !FETCHERS.includes(agent)), allow: "/", disallow: "/api/" },
      { userAgent: "*", allow: "/", disallow: "/api/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
