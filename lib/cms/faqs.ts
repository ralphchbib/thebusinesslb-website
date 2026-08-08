import { cache } from "react";
import type { Where } from "payload";
import { getCms } from "./client";
import type { PayloadFaqDoc } from "./types";

export type FaqScope = "global" | "service" | "assessment" | "contact" | "pricing";

// Wrapped in React's cache() — see the equivalent note in lib/cms/services.ts.
export const getFaqsByScope = cache(async (
  scope: FaqScope,
  serviceId?: number | string,
): Promise<{ question: string; answer: string }[]> => {
  const payload = await getCms();
  const where: Where =
    scope === "service" && serviceId
      ? { and: [{ scope: { equals: scope } }, { service: { equals: serviceId } }, { isPublished: { equals: true } }] }
      : { and: [{ scope: { equals: scope } }, { isPublished: { equals: true } }] };

  const result = await payload.find({
    collection: "faqs",
    where,
    sort: "order",
    depth: 0,
    limit: 100,
  });
  const docs = result.docs as unknown as PayloadFaqDoc[];
  return docs.map((d) => ({ question: d.question, answer: d.answer }));
});

/**
 * Phase 6A — resolves specific FAQ IDs, order-preserving and
 * isPublished-filtered, matching the exact established pattern of
 * getServicesByIds/getTestimonialsByIds/getCaseStudiesByIds. Needed
 * because Payload's relationship population (depth>=1) does not apply
 * the referenced collection's own access/publish filtering — without
 * this, a Pages FAQ block could still render an FAQ an editor has since
 * unpublished.
 */
export async function getFaqsByIds(ids: (number | string)[]): Promise<{ question: string; answer: string }[]> {
  if (ids.length === 0) return [];
  const payload = await getCms();
  const result = await payload.find({
    collection: "faqs",
    where: { id: { in: ids }, isPublished: { equals: true } },
    depth: 0,
    limit: ids.length,
  });
  const docs = result.docs as unknown as PayloadFaqDoc[];
  const byId = new Map(docs.map((d) => [String(d.id), d]));
  const ordered = ids.map((id) => byId.get(String(id))).filter((d): d is PayloadFaqDoc => Boolean(d));
  return ordered.map((d) => ({ question: d.question, answer: d.answer }));
}
