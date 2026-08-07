import { cache } from "react";
import { getCms } from "./client";
import type { PayloadPageDoc, PayloadMediaDoc } from "./types";
import { isReservedSlug } from "./reserved-slugs";

export interface PageData {
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  ogImage?: string;
  noindex: boolean;
  blocks: PayloadPageDoc["blocks"];
}

// Same helper as lib/cms/homepage.ts — resolves a Media relationship to a
// plain URL.
function resolveMediaUrl(media: number | PayloadMediaDoc | null | undefined): string | undefined {
  return typeof media === "object" && media ? media.url : undefined;
}

function toPageData(doc: PayloadPageDoc): PageData {
  return {
    title: doc.title,
    slug: doc.slug,
    seoTitle: doc.seoTitle,
    seoDescription: doc.seoDescription,
    ogImage: resolveMediaUrl(doc.ogImage),
    noindex: doc.noindex ?? false,
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
 * Phase 5A — `draft` opts into Payload's `draft: true` local-API param
 * (returns the latest draft version if one exists, published otherwise)
 * and drops the `_status: "published"` filter, so an unpublished edit
 * becomes visible. Only ever passed `true` from the Draft Mode-gated call
 * sites (app/api/draft/route.ts and the [slug] page's
 * generateMetadata/default export, both behind isPreviewMode()) — every
 * other caller keeps the exact previous published-only behavior by
 * simply omitting the argument, so this is additive, not a behavior
 * change to the existing default path. See PHASE5-LIVE-PREVIEW-PLAN.md
 * §2's explicit rule: the public fetch path must never gain a code path
 * that can return unpublished content by default.
 *
 * A plain boolean, not an options object — so that when
 * generateMetadata() and the page component both call
 * getPageBySlug(slug, true) for the same request, React's cache()
 * recognizes the identical primitive arguments and reuses the one query,
 * exactly like every other 2-arg cached function in this directory
 * (getFaqsByScope). An options object literal would be a fresh reference
 * on every call and defeat that memoization.
 */
export const getPageBySlug = cache(
  async (slug: string, draft: boolean = false): Promise<PageData | null> => {
    if (isReservedSlug(slug)) return null;

    const payload = await getCms();
    const result = await payload.find({
      collection: "pages",
      where: draft ? { slug: { equals: slug } } : { slug: { equals: slug }, _status: { equals: "published" } },
      draft,
      // depth: 1 — populates ogImage (a Media relationship), matching the
      // pattern already established in lib/cms/homepage.ts.
      depth: 1,
      limit: 1,
    });
    const doc = result.docs[0] as unknown as PayloadPageDoc | undefined;
    return doc ? toPageData(doc) : null;
  },
);

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
