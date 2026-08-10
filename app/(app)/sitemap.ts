import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";
import { getPublishedServiceSlugs } from "@/lib/cms/services";
import { getPublishedArticleSlugs } from "@/lib/cms/articles";
import { getPublishedPagesForSitemap } from "@/lib/cms/pages";
import { getPublishedCaseStudySlugs } from "@/lib/cms/case-studies";
import type { PayloadPageType } from "@/lib/cms/types";

// Phase 6B — differentiates Pages' sitemap weight by pageType instead of
// the old flat 0.6/monthly for every non-home page. Service/industry/
// location landing pages are core, evergreen SEO surface (weighted like
// Services); campaign/seasonal/event pages are short-lived and change
// faster. See PHASE6B-SEO-STRATEGY.md §3.
const PAGE_TYPE_SITEMAP_WEIGHT: Record<PayloadPageType, { priority: number; changeFrequency: "weekly" | "monthly" }> = {
  landing: { priority: 0.6, changeFrequency: "monthly" },
  "service-landing": { priority: 0.7, changeFrequency: "monthly" },
  "industry-landing": { priority: 0.7, changeFrequency: "monthly" },
  "location-landing": { priority: 0.7, changeFrequency: "monthly" },
  campaign: { priority: 0.4, changeFrequency: "weekly" },
  seasonal: { priority: 0.4, changeFrequency: "weekly" },
  event: { priority: 0.4, changeFrequency: "weekly" },
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();

  const staticRoutes = [
    "",
    "/services/",
    "/digital-assessment/",
    "/pricing/",
    "/about/",
    "/about/ralph-chbib/",
    "/about/how-we-work/",
    "/insights/",
    "/case-studies/",
    "/contact/",
    "/quote/",
    "/privacy-policy/",
    "/terms/",
  ];

  const [serviceSlugs, articleSlugs, pages, caseStudySlugs] = await Promise.all([
    getPublishedServiceSlugs(),
    getPublishedArticleSlugs(),
    getPublishedPagesForSitemap(),
    getPublishedCaseStudySlugs(),
  ]);
  const serviceRoutes = serviceSlugs.map((slug) => `/services/${slug}/`);
  const articleRoutes = articleSlugs.map((slug) => `/insights/${slug}/`);
  const caseStudyRoutes = caseStudySlugs.map((slug) => `/case-studies/${slug}/`);

  const staticAndListRoutes = [...staticRoutes, ...serviceRoutes, ...articleRoutes, ...caseStudyRoutes].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: (path === "" ? "weekly" : "monthly") as "weekly" | "monthly",
      priority: path === "" ? 1 : path === "/digital-assessment/" ? 0.9 : 0.6,
    }),
  );

  const pageRoutes = pages.map((page) => {
    const weight = PAGE_TYPE_SITEMAP_WEIGHT[page.pageType] ?? PAGE_TYPE_SITEMAP_WEIGHT.landing;
    return {
      url: `${base}/${page.slug}/`,
      lastModified: now,
      changeFrequency: weight.changeFrequency,
      priority: weight.priority,
    };
  });

  return [...staticAndListRoutes, ...pageRoutes];
}
