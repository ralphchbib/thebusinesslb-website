import { cache } from "react";
import { getCms } from "./client";
import { getTestimonialsByIds, type Testimonial } from "./testimonials";
import type { PayloadCaseStudyDoc, PayloadMediaDoc } from "./types";

export interface CaseStudyImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface CaseStudy {
  id: number;
  title: string;
  slug: string;
  clientName: string;
  industry?: string;
  servicesUsed: { slug: string; h1: string }[];
  challenge: string;
  solution: string;
  results: { metric: string; value: string }[];
  testimonial?: Testimonial;
  featuredImage?: CaseStudyImage;
  gallery: CaseStudyImage[];
  seoTitle: string;
  seoDescription: string;
}

function toCaseStudyImage(media: number | PayloadMediaDoc | null | undefined): CaseStudyImage | undefined {
  if (typeof media !== "object" || !media) return undefined;
  return {
    url: media.url,
    alt: media.alt,
    width: media.width ?? undefined,
    height: media.height ?? undefined,
  };
}

async function toCaseStudy(doc: PayloadCaseStudyDoc): Promise<CaseStudy> {
  // `testimonial` is a relationship — at depth 1 Payload returns the
  // populated doc, at depth 0 just the numeric id. Resolve it through
  // getTestimonialsByIds either way so the output shape is always
  // consistent regardless of the query depth the caller used.
  const testimonialId =
    typeof doc.testimonial === "object" && doc.testimonial ? doc.testimonial.id : doc.testimonial;
  const testimonial = testimonialId ? (await getTestimonialsByIds([testimonialId]))[0] : undefined;

  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    clientName: doc.clientName,
    industry: doc.industry || undefined,
    servicesUsed: (doc.servicesUsed ?? [])
      .map((s) => (typeof s === "object" ? { slug: s.slug, h1: s.h1 } : null))
      .filter((s): s is { slug: string; h1: string } => Boolean(s)),
    challenge: doc.challenge,
    solution: doc.solution,
    results: (doc.results ?? []).map((r) => ({ metric: r.metric, value: r.value })),
    testimonial,
    featuredImage: toCaseStudyImage(doc.featuredImage),
    gallery: (doc.gallery ?? [])
      .map((g) => toCaseStudyImage(g.image))
      .filter((img): img is CaseStudyImage => Boolean(img)),
    seoTitle: doc.seoTitle,
    seoDescription: doc.seoDescription,
  };
}

export const getCaseStudies = cache(async (): Promise<CaseStudy[]> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "case-studies",
    where: { _status: { equals: "published" } },
    depth: 1,
    limit: 100,
  });
  const docs = result.docs as unknown as PayloadCaseStudyDoc[];
  return Promise.all(docs.map(toCaseStudy));
});

export const getFeaturedCaseStudies = cache(async (): Promise<CaseStudy[]> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "case-studies",
    where: { _status: { equals: "published" }, featured: { equals: true } },
    depth: 1,
    limit: 100,
  });
  const docs = result.docs as unknown as PayloadCaseStudyDoc[];
  return Promise.all(docs.map(toCaseStudy));
});

export const getCaseStudyBySlug = cache(async (slug: string): Promise<CaseStudy | null> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "case-studies",
    where: { slug: { equals: slug }, _status: { equals: "published" } },
    depth: 1,
    limit: 1,
  });
  const doc = result.docs[0] as unknown as PayloadCaseStudyDoc | undefined;
  return doc ? toCaseStudy(doc) : null;
});

export const getPublishedCaseStudySlugs = cache(async (): Promise<string[]> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "case-studies",
    where: { _status: { equals: "published" } },
    depth: 0,
    limit: 100,
    select: { slug: true },
  });
  const docs = result.docs as unknown as Pick<PayloadCaseStudyDoc, "slug">[];
  return docs.map((d) => d.slug);
});

/**
 * Resolves specific case study IDs, preserving caller order — used by the
 * Case Studies block on Pages when an editor picks specific case studies
 * instead of relying on the Featured default.
 */
export const getCaseStudiesByIds = cache(async (ids: (number | string)[]): Promise<CaseStudy[]> => {
  if (ids.length === 0) return [];
  const payload = await getCms();
  const result = await payload.find({
    collection: "case-studies",
    where: { id: { in: ids }, _status: { equals: "published" } },
    depth: 1,
    limit: ids.length,
  });
  const docs = result.docs as unknown as PayloadCaseStudyDoc[];
  const byId = new Map(docs.map((d) => [String(d.id), d]));
  const ordered = ids.map((id) => byId.get(String(id))).filter((d): d is PayloadCaseStudyDoc => Boolean(d));
  return Promise.all(ordered.map(toCaseStudy));
});

/**
 * Case studies whose servicesUsed includes the given service — powers the
 * "related case studies" section on a service detail page. Queries the
 * relationship field via Payload's dot-notation deep-query support
 * (servicesUsed.slug) rather than resolving the service's numeric id
 * first, since ServiceContent (lib/cms/services.ts) doesn't expose it.
 */
export const getCaseStudiesByServiceSlug = cache(async (serviceSlug: string): Promise<CaseStudy[]> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "case-studies",
    where: {
      _status: { equals: "published" },
      "servicesUsed.slug": { equals: serviceSlug },
    },
    depth: 1,
    limit: 10,
  });
  const docs = result.docs as unknown as PayloadCaseStudyDoc[];
  return Promise.all(docs.map(toCaseStudy));
});
