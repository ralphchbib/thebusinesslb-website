import type { Where } from "payload";
import { getCms } from "./client";
import type { PayloadFaqDoc } from "./types";

export type FaqScope = "global" | "service" | "assessment" | "contact" | "pricing";

export async function getFaqsByScope(
  scope: FaqScope,
  serviceId?: number | string,
): Promise<{ question: string; answer: string }[]> {
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
}
