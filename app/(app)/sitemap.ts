import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";
import { serviceOrder } from "@/content/services";
import { articles } from "@/content/insights";

export default function sitemap(): MetadataRoute.Sitemap {
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

  const serviceRoutes = serviceOrder.map((slug) => `/services/${slug}/`);
  const articleRoutes = articles.map((a) => `/insights/${a.slug}/`);

  return [...staticRoutes, ...serviceRoutes, ...articleRoutes].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/digital-assessment/" ? 0.9 : 0.6,
  }));
}
