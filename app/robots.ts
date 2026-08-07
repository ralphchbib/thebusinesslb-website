import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";

// Phase 4C — explicit AI-crawler allow rules, rather than relying on the
// wildcard rule below to cover them implicitly. An explicit allow is a
// clearer, auditable signal, and lets any one of these be tuned separately
// later without touching the general-purpose rule. See
// PHASE4C-SEO-PLAN.md §I. Covers the major AI-answer-engine and AI-search
// crawlers as of this writing — worth revisiting periodically as this
// space is still new and evolving, not a one-time checklist.
const AI_CRAWLER_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "Google-Extended",
  "PerplexityBot",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/thank-you/", "/go/"],
      },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/thank-you/", "/go/"],
      })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
