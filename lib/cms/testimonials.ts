import { cache } from "react";
import { getCms } from "./client";
import type { PayloadTestimonialDoc } from "./types";

export interface Testimonial {
  id: number;
  clientName: string;
  companyName?: string;
  position?: string;
  industry?: string;
  quote: string;
  rating: number;
  logo?: { url: string; alt: string; width?: number; height?: number };
  website?: string;
}

function toTestimonial(doc: PayloadTestimonialDoc): Testimonial {
  return {
    id: doc.id,
    clientName: doc.clientName,
    companyName: doc.companyName || undefined,
    position: doc.position || undefined,
    industry: doc.industry || undefined,
    quote: doc.quote,
    rating: doc.rating,
    logo:
      typeof doc.logo === "object" && doc.logo
        ? {
            url: doc.logo.url,
            alt: doc.logo.alt,
            width: doc.logo.width ?? undefined,
            height: doc.logo.height ?? undefined,
          }
        : undefined,
    website: doc.website || undefined,
  };
}

// depth: 1 — logo is a Media relationship; populating it here means every
// caller gets a ready-to-render {url, alt} without a separate resolve
// step, the same tradeoff lib/cms/case-studies.ts already makes for
// servicesUsed/testimonial.
export const getTestimonials = cache(async (): Promise<Testimonial[]> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "testimonials",
    where: { _status: { equals: "published" } },
    sort: "displayOrder",
    depth: 1,
    limit: 100,
  });
  const docs = result.docs as unknown as PayloadTestimonialDoc[];
  return docs.map(toTestimonial);
});

export const getFeaturedTestimonials = cache(async (): Promise<Testimonial[]> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "testimonials",
    where: { _status: { equals: "published" }, featured: { equals: true } },
    sort: "displayOrder",
    depth: 1,
    limit: 100,
  });
  const docs = result.docs as unknown as PayloadTestimonialDoc[];
  return docs.map(toTestimonial);
});

/**
 * Resolves specific testimonial IDs — used by the Testimonials block on
 * Pages when an editor picks specific testimonials instead of relying on
 * the Featured default. Preserves the order the caller/relationship field
 * specified, not the database's natural order (same convention as
 * getServicesBySlugs in lib/cms/services.ts).
 */
export const getTestimonialsByIds = cache(async (ids: (number | string)[]): Promise<Testimonial[]> => {
  if (ids.length === 0) return [];
  const payload = await getCms();
  const result = await payload.find({
    collection: "testimonials",
    where: { id: { in: ids }, _status: { equals: "published" } },
    depth: 1,
    limit: ids.length,
  });
  const docs = result.docs as unknown as PayloadTestimonialDoc[];
  const byId = new Map(docs.map((d) => [String(d.id), d]));
  const ordered = ids.map((id) => byId.get(String(id))).filter((d): d is PayloadTestimonialDoc => Boolean(d));
  return ordered.map(toTestimonial);
});
