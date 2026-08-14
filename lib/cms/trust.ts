import { getCms } from "./client";

export type ProfileCollection = "business-profiles" | "professional-profiles";

export interface ReviewListItem {
  id: string | number;
  rating: number;
  body: string;
  businessReply?: string;
  repliedAt?: string;
  createdAt: string;
  reviewerName: string;
}

export interface RecommendationListItem {
  id: string | number;
  body: string;
  createdAt: string;
  recommenderName: string;
}

function profileKey(collection: ProfileCollection, id: string | number): string {
  return `${collection}:${id}`;
}

/**
 * Both fetchers below are computed live on every read, never stored — the
 * same "no derived value persisted" preference already established by
 * profile-completion.ts. They query by the plain `profileKey` field, not
 * the polymorphic `profile` relationship directly — see Reviews.ts's top
 * comment for why.
 */
export async function getPublishedReviews(collection: ProfileCollection, profileId: string | number): Promise<{ items: ReviewListItem[]; averageRating: number | null; count: number }> {
  const payload = await getCms();
  const key = profileKey(collection, profileId);

  const result = await payload.find({
    collection: "reviews",
    where: { profileKey: { equals: key }, status: { equals: "published" } },
    sort: "-createdAt",
    depth: 1,
    overrideAccess: true,
  });

  const items: ReviewListItem[] = result.docs.map((doc) => ({
    id: doc.id as string | number,
    rating: doc.rating as number,
    body: doc.body as string,
    businessReply: (doc.businessReply as string) || undefined,
    repliedAt: (doc.repliedAt as string) || undefined,
    createdAt: doc.createdAt as string,
    reviewerName: typeof doc.owner === "object" ? ((doc.owner as { name?: string })?.name ?? "A member") : "A member",
  }));

  const averageRating = items.length > 0 ? items.reduce((sum, r) => sum + r.rating, 0) / items.length : null;

  return { items, averageRating, count: result.totalDocs };
}

export async function getPublishedRecommendations(collection: ProfileCollection, profileId: string | number): Promise<{ items: RecommendationListItem[]; count: number }> {
  const payload = await getCms();
  const key = profileKey(collection, profileId);

  const result = await payload.find({
    collection: "recommendations",
    where: { profileKey: { equals: key }, status: { equals: "published" } },
    sort: "-createdAt",
    depth: 1,
    overrideAccess: true,
  });

  const items: RecommendationListItem[] = result.docs.map((doc) => ({
    id: doc.id as string | number,
    body: doc.body as string,
    createdAt: doc.createdAt as string,
    recommenderName: typeof doc.owner === "object" ? ((doc.owner as { name?: string })?.name ?? "A member") : "A member",
  }));

  return { items, count: result.totalDocs };
}
