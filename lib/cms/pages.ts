import { cache } from "react";
import { getCms } from "./client";
import type { PayloadPageDoc } from "./types";

export interface PageData {
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  blocks: PayloadPageDoc["blocks"];
}

function toPageData(doc: PayloadPageDoc): PageData {
  return {
    title: doc.title,
    slug: doc.slug,
    seoTitle: doc.seoTitle,
    seoDescription: doc.seoDescription,
    blocks: doc.blocks ?? [],
  };
}

/**
 * Deliberately does not pass `draft: true` — Payload's default find/findByID
 * behavior for a drafts-enabled collection already returns only the
 * published version. `_status: { equals: "published" }` is added anyway as
 * an explicit, visible filter matching the convention every other function
 * in this directory already follows (isPublished: { equals: true } on
 * Services/Articles), rather than relying solely on an implicit default.
 */
export const getPageBySlug = cache(async (slug: string): Promise<PageData | null> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "pages",
    where: { slug: { equals: slug }, _status: { equals: "published" } },
    depth: 0,
    limit: 1,
  });
  const doc = result.docs[0] as unknown as PayloadPageDoc | undefined;
  return doc ? toPageData(doc) : null;
});

export const getPublishedPageSlugs = cache(async (): Promise<string[]> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "pages",
    where: { _status: { equals: "published" } },
    depth: 0,
    limit: 100,
    select: { slug: true },
  });
  const docs = result.docs as unknown as Pick<PayloadPageDoc, "slug">[];
  return docs.map((d) => d.slug);
});
