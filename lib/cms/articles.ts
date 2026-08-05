import { cache } from "react";
import { getCms } from "./client";
import type { Article, ArticleBlock } from "@/content/insights/types";
import type { PayloadArticleDoc, PayloadArticleBlockType } from "./types";

const blockTypeFromPayload: Record<PayloadArticleBlockType, ArticleBlock["type"]> = {
  paragraph: "p",
  heading: "h2",
  list: "list",
};

function estimateReadingMinutes(body: PayloadArticleDoc["body"]): number {
  const words = (body ?? [])
    .map((b) => (b.blockType === "list" ? (b.items ?? []).map((i) => i.text).join(" ") : b.text || ""))
    .join(" ")
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function toArticle(doc: PayloadArticleDoc): Article {
  const body: ArticleBlock[] = (doc.body ?? []).map((b) => ({
    type: blockTypeFromPayload[b.blockType] ?? "p",
    text: b.text || undefined,
    items: b.blockType === "list" ? (b.items ?? []).map((i) => i.text) : undefined,
  }));

  return {
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt,
    metaTitle: doc.metaTitle,
    metaDescription: doc.metaDescription,
    topic: doc.topic,
    publishedAt: doc.publishedAt,
    readingMinutes: doc.readingMinutes ?? estimateReadingMinutes(doc.body),
    body,
    relatedServices: (doc.relatedServices ?? [])
      .map((r) => (typeof r === "object" ? r.slug : null))
      .filter((slug): slug is string => Boolean(slug)),
  };
}

// Wrapped in React's cache() — see the equivalent note in lib/cms/services.ts.
export const getAllArticles = cache(async (): Promise<Article[]> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "articles",
    where: { isPublished: { equals: true } },
    sort: "-publishedAt",
    depth: 1,
    limit: 100,
  });
  const docs = result.docs as unknown as PayloadArticleDoc[];
  return docs.map(toArticle);
});

export async function getRecentArticles(count: number): Promise<Article[]> {
  const all = await getAllArticles();
  return all.slice(0, count);
}

export const getArticleBySlug = cache(async (slug: string): Promise<Article | null> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "articles",
    where: { slug: { equals: slug }, isPublished: { equals: true } },
    depth: 1,
    limit: 1,
  });
  const doc = result.docs[0] as unknown as PayloadArticleDoc | undefined;
  return doc ? toArticle(doc) : null;
});

export const getPublishedArticleSlugs = cache(async (): Promise<string[]> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "articles",
    where: { isPublished: { equals: true } },
    depth: 0,
    limit: 100,
    select: { slug: true },
  });
  const docs = result.docs as unknown as Pick<PayloadArticleDoc, "slug">[];
  return docs.map((d) => d.slug);
});
