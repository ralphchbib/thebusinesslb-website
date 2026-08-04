import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";
import { getPublishedServiceSlugs } from "@/lib/cms/services";
import { getPublishedArticleSlugs } from "@/lib/cms/articles";

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
    "/contact/",
    "/privacy-policy/",
    "/terms/",
  ];

  const [serviceSlugs, articleSlugs] = await Promise.all([
    getPublishedServiceSlugs(),
    getPublishedArticleSlugs(),
  ]);
  const serviceRoutes = serviceSlugs.map((slug) => `/services/${slug}/`);
  const articleRoutes = articleSlugs.map((slug) => `/insights/${slug}/`);

  return [...staticRoutes, ...serviceRoutes, ...articleRoutes].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/digital-assessment/" ? 0.9 : 0.6,
  }));
}
