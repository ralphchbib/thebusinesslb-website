import { getCms } from "@/lib/cms/client";

export interface ActivityItem {
  id: string;
  date: string;
  description: string;
  profileHref: string;
}

const WINDOW_DAYS = 30;
const MAX_ITEMS = 20;

type ProfileCollection = "business-profiles" | "professional-profiles";

function profileHref(relationTo: ProfileCollection, slug: string): string {
  return relationTo === "business-profiles" ? `/network/businesses/${slug}` : `/network/professionals/${slug}`;
}

/**
 * Phase 11 — Option A from PHASE11-TECHNICAL-DESIGN.md §J: a live,
 * request-time composition over data that already exists (follows,
 * verifiedAt/updatedAt on the profile collections, reviews), not a
 * persisted event log. One query for the account's follows (populated,
 * depth 1, so verifiedAt/updatedAt come along for free), then a single
 * batched `profileKey: { in: [...keys] }` query for recent reviews across
 * every followed profile at once — not one query per followed profile.
 * Explicitly deferred: a persisted `activity-events` collection with
 * write-time fan-out, justified only once the follow-graph is large
 * enough that this composition stops being cheap (§J's stated future
 * path, not a silent limitation).
 */
export async function getActivityFeed(ownerId: string | number): Promise<ActivityItem[]> {
  const payload = await getCms();
  const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const follows = await payload.find({
    collection: "follows",
    where: { owner: { equals: ownerId } },
    depth: 1,
    limit: 0,
    overrideAccess: true,
  });

  const items: ActivityItem[] = [];
  const keys: string[] = [];
  const targetByKey = new Map<string, { name: string; href: string }>();

  for (const row of follows.docs) {
    const profile = row.profile as { relationTo?: ProfileCollection; value?: unknown } | null | undefined;
    if (!profile?.relationTo || typeof profile.value !== "object" || profile.value === null) continue;
    const doc = profile.value as Record<string, unknown>;
    const relationTo = profile.relationTo;
    const slug = doc.slug as string | undefined;
    if (!slug) continue;
    const name = relationTo === "business-profiles" ? (doc.companyName as string) : (doc.name as string);
    const href = profileHref(relationTo, slug);
    const key = `${relationTo}:${doc.id}`;
    keys.push(key);
    targetByKey.set(key, { name, href });

    const verifiedAt = doc.verifiedAt as string | undefined;
    if (verifiedAt && verifiedAt >= cutoff) {
      items.push({ id: `verified:${key}`, date: verifiedAt, description: `${name} was verified.`, profileHref: href });
    }

    const updatedAt = doc.updatedAt as string | undefined;
    const createdAt = doc.createdAt as string | undefined;
    if (updatedAt && updatedAt >= cutoff && updatedAt !== createdAt) {
      items.push({ id: `updated:${key}`, date: updatedAt, description: `${name} updated their profile.`, profileHref: href });
    }
  }

  if (keys.length > 0) {
    const reviews = await payload.find({
      collection: "reviews",
      where: { profileKey: { in: keys }, status: { equals: "published" }, createdAt: { greater_than_equal: cutoff } },
      depth: 0,
      limit: MAX_ITEMS,
      sort: "-createdAt",
      overrideAccess: true,
    });
    for (const review of reviews.docs) {
      const target = targetByKey.get(review.profileKey as string);
      if (!target) continue;
      items.push({ id: `review:${review.id}`, date: review.createdAt as string, description: `New review on ${target.name}.`, profileHref: target.href });
    }
  }

  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  return items.slice(0, MAX_ITEMS);
}
