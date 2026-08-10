import { getCms } from "./client";
import type { AttributionSnapshot } from "./leads";

/**
 * Phase 7 — replaces lib/db/queries.ts's Drizzle-backed
 * saveNewsletterSubscriber/unsubscribeNewsletter. Re-subscribing should
 * still feel like success, not a duplicate-key error — same intent as the
 * old Drizzle onConflictDoUpdate, implemented here as find-then-update-or-
 * create since Payload's Local API has no native upsert.
 */
export async function saveNewsletterSubscriber(email: string, attribution: AttributionSnapshot) {
  const payload = await getCms();
  const existing = await payload.find({
    collection: "newsletter-subscribers",
    where: { email: { equals: email } },
    limit: 1,
  });

  if (existing.docs[0]) {
    return payload.update({
      collection: "newsletter-subscribers",
      id: existing.docs[0].id,
      data: { ...attribution, unsubscribedAt: null },
    });
  }

  return payload.create({
    collection: "newsletter-subscribers",
    data: { email, ...attribution },
  });
}

export async function unsubscribeNewsletter(email: string) {
  const payload = await getCms();
  const existing = await payload.find({
    collection: "newsletter-subscribers",
    where: { email: { equals: email } },
    limit: 1,
  });
  if (!existing.docs[0]) return;

  await payload.update({
    collection: "newsletter-subscribers",
    id: existing.docs[0].id,
    data: { unsubscribedAt: new Date().toISOString() },
  });
}
