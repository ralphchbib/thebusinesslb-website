import { cache } from "react";
import { getCms } from "./client";
import type { PayloadPageDoc } from "./types";
import { isReservedSlug } from "./reserved-slugs";

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
 * Rejects reserved slugs before ever querying the database. This is a
 * structural backstop, not just belt-and-suspenders on top of
 * Pages.slug's validate function: a branch review proved that a
 * published Page slugged "about" caused Next.js's static build to hand
 * /about to the [slug] catch-all instead of the real
 * app/(app)/about/page.tsx (confirmed via .next/prerender-manifest.json
 * showing srcRoute: "/[slug]"). That happens upstream of this function,
 * in generateStaticParams — but if it ever happened anyway (a bug, a
 * direct DB write, a future integration bypassing Payload's access
 * control), this ensures getPageBySlug itself would still refuse to
 * serve the colliding content rather than compounding the problem.
 *
 * Also deliberately does not pass `draft: true` to payload.find() —
 * Payload's default find/findByID behavior for a drafts-enabled
 * collection already returns only the published version.
 * `_status: { equals: "published" }` is added anyway as an explicit,
 * visible filter matching the convention every other function in this
 * directory follows (isPublished: { equals: true } on Services/Articles),
 * rather than relying solely on an implicit default.
 */
export const getPageBySlug = cache(async (slug: string): Promise<PageData | null> => {
  if (isReservedSlug(slug)) return null;

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

/**
 * Feeds both generateStaticParams (app/(app)/[slug]/page.tsx) and the
 * sitemap (app/(app)/sitemap.ts) — this is the one place that must never
 * hand a reserved slug to either. Rather than silently filtering a
 * collision out and letting the build succeed with no explanation of why
 * a published Page never appears, this throws: a reserved-slug collision
 * only reaches this point if Pages.slug's validate function was somehow
 * bypassed, which is itself a signal something is wrong and needs a
 * human to unpublish or rename the offending Page — not something to
 * quietly paper over. The filter below is a second, independent layer
 * in case this assertion is ever weakened or removed without someone
 * noticing what it was protecting.
 */
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
  const slugs = docs.map((d) => d.slug);

  const collisions = slugs.filter(isReservedSlug);
  if (collisions.length > 0) {
    throw new Error(
      `Reserved slug collision detected: ${collisions.join(", ")}. A published Page exists with a ` +
        `slug that collides with an existing site route. Unpublish or rename it in ` +
        `/admin/collections/pages/, then rebuild.`,
    );
  }

  return slugs.filter((slug) => !isReservedSlug(slug));
});
