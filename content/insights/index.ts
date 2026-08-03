import { websiteCostLebanon } from "./website-cost-lebanon";
import { shopifyVsWebsite } from "./shopify-vs-website";
import { instagramNoEnquiries } from "./instagram-no-enquiries";
import type { Article } from "./types";

export const articles: Article[] = [
  instagramNoEnquiries,
  shopifyVsWebsite,
  websiteCostLebanon,
].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

export function getArticle(slug: string) {
  return articles.find((a) => a.slug === slug);
}
