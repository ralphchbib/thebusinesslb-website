import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";
import { getPublishedServiceSlugs } from "@/lib/cms/services";
import { getPublishedArticleSlugs } from "@/lib/cms/articles";
import { getPublishedPageSlugs } from "@/lib/cms/pages";
import { getPublishedCaseStudySlugs } from "@/lib/cms/case-studies";
import { isReservedSlug } from "@/lib/cms/reserved-slugs";

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
    "/privacy-policy/",
    "/terms/",
  ];

  const [serviceSlugs, articleSlugs, pageSlugs, caseStudySlugs] = await Promise.all([
    getPublishedServiceSlugs(),
    getPublishedArticleSlugs(),
    getPublishedPageSlugs(),
    getPublishedCaseStudySlugs(),
  ]);
  const serviceRoutes = serviceSlugs.map((slug) => `/services/${slug}/`);
  const articleRoutes = articleSlugs.map((slug) => `/insights/${slug}/`);
  const caseStudyRoutes = caseStudySlugs.map((slug) => `/case-studies/${slug}/`);
  // Explicit second layer on top of getPublishedPageSlugs()'s own
  // filter/hard-fail — see lib/cms/reserved-slugs.ts for why this isn't
  // considered redundant enough to skip.
  const pageRoutes = pageSlugs.filter((slug) => !isReservedSlug(slug)).map((slug) => `/${slug}/`);

  return [...staticRoutes, ...serviceRoutes, ...articleRoutes, ...pageRoutes, ...caseStudyRoutes].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/digital-assessment/" ? 0.9 : 0.6,
  }));
}
