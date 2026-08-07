import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug, getPublishedPageSlugs } from "@/lib/cms/pages";
import { isReservedSlug } from "@/lib/cms/reserved-slugs";
import { getSiteSettings } from "@/lib/cms/site-settings";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema-org";
import { isPreviewMode, PREVIEW_ROBOTS } from "@/lib/seo/preview";
import { BlockRenderer } from "@/components/blocks/page/block-renderer";

/**
 * Phase 2 foundation route for CMS-managed landing/campaign/seasonal
 * pages.
 *
 * IMPORTANT — do not assume literal routes are automatically safe from
 * this catch-all. A branch review proved otherwise: with a published
 * Page slugged "about", Next's static build registered /about's
 * prerender-manifest entry to THIS route instead of the real
 * app/(app)/about/page.tsx (srcRoute: "/[slug]" instead of "/about"),
 * silently making the real page unreachable. "services" happened not to
 * collide in the same test, for reasons that weren't reliably
 * explainable — so this cannot be relied on as self-protecting per
 * route. getPublishedPageSlugs() is the structural fix (it now refuses
 * to ever return a reserved slug, and hard-fails the build if it finds
 * one among published Pages) — the filter below is a second, explicit
 * layer here specifically, so this route doesn't silently lose that
 * protection if a future refactor changes what feeds it.
 */
export async function generateStaticParams() {
  const slugs = await getPublishedPageSlugs();
  return slugs.filter((slug) => !isReservedSlug(slug)).map((slug) => ({ slug }));
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
  const preview = await isPreviewMode();
  const [page, settings] = await Promise.all([getPageBySlug(slug, preview), getSiteSettings()]);
  if (!page) return {};
  const metadata = buildMetadata({
    title: page.seoTitle,
    description: page.seoDescription,
    path: `/${page.slug}/`,
    ogImage: page.ogImage ?? settings.defaultOgImage,
  });
  // Draft Mode always wins over the page's own noindex field — an
  // unpublished edit must never be indexable, regardless of what it will
  // eventually be set to once published.
  if (preview) {
    metadata.robots = PREVIEW_ROBOTS;
  } else if (page.noindex) {
    metadata.robots = { index: false, follow: true };
  }
  return metadata;
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const preview = await isPreviewMode();
  const page = await getPageBySlug(slug, preview);
  if (!page) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema([{ name: page.title, path: `/${page.slug}/` }])),
        }}
      />
      <BlockRenderer blocks={page.blocks ?? []} />
    </>
  );
}
