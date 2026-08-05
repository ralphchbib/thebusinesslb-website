import { cache } from "react";
import { getCms } from "./client";
import { getFaqsByScope } from "./faqs";
import type { ServiceContent } from "@/content/services/types";
import type { PayloadServiceDoc } from "./types";

/**
 * Maps a Payload `services` document (+ its related FAQs, fetched
 * separately since FAQs are their own collection) back onto the existing
 * `ServiceContent` shape every service-page component already expects —
 * so the presentational components in components/blocks/* don't need to
 * change, only where the data comes from.
 */
function toServiceContent(
  doc: PayloadServiceDoc,
  faqs: { question: string; answer: string }[],
): ServiceContent {
  return {
    slug: doc.slug,
    metaTitle: doc.metaTitle,
    metaDescription: doc.metaDescription,
    eyebrow: doc.eyebrow || undefined,
    h1: doc.h1,
    priceAnchor: doc.priceAnchor,
    timelineSummary: doc.timelineSummary,
    intro: doc.intro,
    localProblem:
      doc.localProblem?.h2 || doc.localProblem?.items?.length
        ? {
            h2: doc.localProblem.h2 ?? "",
            intro: doc.localProblem.intro || undefined,
            items: (doc.localProblem.items ?? []).map((i) => ({ title: i.title, body: i.body })),
            note: doc.localProblem.note || undefined,
          }
        : undefined,
    packages: (doc.packages ?? []).map((p) => ({
      name: p.name,
      priceDisplay: p.priceDisplay,
      summary: p.summary,
      inclusions: (p.inclusions ?? []).map((i) => i.text),
      isRecommended: p.isRecommended ?? false,
    })),
    inclusions: (doc.inclusions ?? []).map((i) => i.text),
    exclusions: (doc.exclusions ?? []).map((i) => i.text),
    clientProvides: (doc.clientProvides ?? []).map((i) => i.text),
    timeline: (doc.timeline ?? []).map((t) => ({ label: t.label, body: t.body })),
    afterLaunch: doc.afterLaunch?.h2
      ? { h2: doc.afterLaunch.h2, body: doc.afterLaunch.body ?? "" }
      : undefined,
    faqs,
    relatedServices: (doc.relatedServices ?? [])
      .map((r) => (typeof r === "object" ? r.slug : null))
      .filter((slug): slug is string => Boolean(slug)),
  };
}

// Wrapped in React's cache() so a single render pass — e.g. generateMetadata
// and the page component both calling the same fetcher for the same route —
// shares one Payload query instead of issuing it twice. Only functions
// called with primitive (or no) arguments are wrapped; getServicesBySlugs
// below takes an array, which cache() can't key on reliably.
export const getAllServices = cache(async (): Promise<ServiceContent[]> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "services",
    where: { isPublished: { equals: true } },
    sort: "order",
    depth: 1,
    limit: 100,
  });
  const docs = result.docs as unknown as PayloadServiceDoc[];
  const withFaqs = await Promise.all(
    docs.map(async (doc) => toServiceContent(doc, await getFaqsByScope("service", doc.id))),
  );
  return withFaqs;
});

/** Lightweight slug -> priceAnchor map for the client-side sticky action bar. */
export const getServicePriceMap = cache(async (): Promise<Record<string, string>> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "services",
    where: { isPublished: { equals: true } },
    depth: 0,
    limit: 100,
    select: { slug: true, priceAnchor: true },
  });
  const docs = result.docs as unknown as Pick<PayloadServiceDoc, "slug" | "priceAnchor">[];
  return Object.fromEntries(docs.map((d) => [d.slug, d.priceAnchor]));
});

export const getPublishedServiceSlugs = cache(async (): Promise<string[]> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "services",
    where: { isPublished: { equals: true } },
    sort: "order",
    depth: 0,
    limit: 100,
    select: { slug: true },
  });
  const docs = result.docs as unknown as Pick<PayloadServiceDoc, "slug">[];
  return docs.map((d) => d.slug);
});

export const getServiceBySlug = cache(async (slug: string): Promise<ServiceContent | null> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "services",
    where: { slug: { equals: slug }, isPublished: { equals: true } },
    depth: 1,
    limit: 1,
  });
  const doc = result.docs[0] as unknown as PayloadServiceDoc | undefined;
  if (!doc) return null;
  const faqs = await getFaqsByScope("service", doc.id);
  return toServiceContent(doc, faqs);
});

export async function getServicesBySlugs(slugs: string[]): Promise<ServiceContent[]> {
  if (slugs.length === 0) return [];
  const payload = await getCms();
  const result = await payload.find({
    collection: "services",
    where: { slug: { in: slugs }, isPublished: { equals: true } },
    depth: 1,
    limit: slugs.length,
  });
  const docs = result.docs as unknown as PayloadServiceDoc[];
  // Preserve the order the caller asked for, not the DB's natural order.
  const bySlug = new Map(docs.map((d) => [d.slug, d]));
  const ordered = slugs.map((s) => bySlug.get(s)).filter((d): d is PayloadServiceDoc => Boolean(d));
  return Promise.all(ordered.map(async (doc) => toServiceContent(doc, await getFaqsByScope("service", doc.id))));
}
