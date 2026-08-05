import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug, getPublishedPageSlugs } from "@/lib/cms/pages";
import { buildMetadata } from "@/lib/seo/metadata";
import { BlockRenderer } from "@/components/blocks/page/block-renderer";

/**
 * Phase 2 foundation route for CMS-managed landing/campaign/seasonal
 * pages. Coexists safely with every literal route under app/(app)/* —
 * Next.js always resolves a literal path segment (e.g. /services/) ahead
 * of this dynamic catch-all, so nothing here can shadow an existing page.
 * The Pages collection's slug field additionally blocks reserved words at
 * save time (see payload/collections/Pages.ts) so an editor never creates
 * a page that could never be reached in the first place.
 */
export async function generateStaticParams() {
  const slugs = await getPublishedPageSlugs();
  return slugs.map((slug) => ({ slug }));
}

// New pages remain reachable immediately after publishing, rendered on
// first request and cached from then on — no rebuild required, matching
// the rest of the site's on-demand-revalidation model. This is the
// default for a dynamic segment with generateStaticParams; set
// explicitly so the behavior is visible in code, not implicit.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) return {};
  return buildMetadata({
    title: page.seoTitle,
    description: page.seoDescription,
    path: `/${page.slug}/`,
  });
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  return <BlockRenderer blocks={page.blocks ?? []} />;
}
