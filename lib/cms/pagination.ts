import type { Payload, PayloadRequest } from "payload";

const PAGE_SIZE = 200;

/**
 * Phase 6B — every `getPublishedXSlugs()` in this directory (pages,
 * services, articles, case-studies) previously hardcoded a single
 * `payload.find({ limit: 100 })` call. Payload's `limit` truncates rather
 * than errors, so once a collection passed 100 published documents, the
 * excess would silently vanish from both the sitemap (app/(app)/sitemap.ts)
 * and `generateStaticParams` (each route's own static build) — no warning,
 * no failed build, just fewer pages than actually exist. Since Phase 6B's
 * entire purpose is enabling non-developers to publish landing pages at
 * volume, 100 is a real, reachable ceiling, not a theoretical one.
 *
 * Walks `find()`'s own `page`/`hasNextPage` pagination until exhausted,
 * fetching PAGE_SIZE docs per round trip. Scoped to the 4 slug-only
 * getters that feed sitemap.ts + generateStaticParams — see
 * PHASE6B-LANDING-PAGE-FACTORY-PLAN.md's pre-implementation review. The
 * listing-page fetchers (getAllServices, getAllArticles, getCaseStudies,
 * etc.) have the identical `limit: 100` pattern but were left unchanged as
 * out of scope for this fix — they feed hub pages, not sitemap/static-param
 * generation, and none of those collections are anywhere near 100 documents
 * today, unlike Pages under active editor use.
 */
export async function findAllSlugs<T extends { slug: string }>(
  payload: Payload,
  options: {
    collection: Parameters<Payload["find"]>[0]["collection"];
    where: Parameters<Payload["find"]>[0]["where"];
    sort?: Parameters<Payload["find"]>[0]["sort"];
    select?: Parameters<Payload["find"]>[0]["select"];
    req?: PayloadRequest;
  },
): Promise<T[]> {
  const docs: T[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const result = await payload.find({
      collection: options.collection,
      where: options.where,
      sort: options.sort,
      select: options.select,
      req: options.req,
      depth: 0,
      limit: PAGE_SIZE,
      page,
    });
    docs.push(...(result.docs as unknown as T[]));
    hasNextPage = result.hasNextPage ?? false;
    page += 1;
  }

  return docs;
}
