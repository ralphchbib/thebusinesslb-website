import { getCms } from "@/lib/cms/client";

export type ProfileCollection = "business-profiles" | "professional-profiles";

export interface SavedOrFollowedProfileItem {
  id: string | number;
  profileType: ProfileCollection;
  name: string;
  slug: string;
  verified: boolean;
  since: string;
}

function displayName(profileType: ProfileCollection, doc: Record<string, unknown>): string {
  return profileType === "business-profiles" ? ((doc.companyName as string) ?? "") : ((doc.name as string) ?? "");
}

/**
 * Shared by getSavedProfiles/getFollowedProfiles — both query shapes are
 * identical (owner-scoped, populate the polymorphic `profile` relationship,
 * split by relationTo), only the collection slug differs.
 */
async function listOwnedSocialProfiles(
  collection: "saved-profiles" | "follows",
  ownerId: string | number,
): Promise<{ businesses: SavedOrFollowedProfileItem[]; professionals: SavedOrFollowedProfileItem[] }> {
  const payload = await getCms();
  const result = await payload.find({
    collection,
    where: { owner: { equals: ownerId } },
    sort: "-createdAt",
    depth: 1,
    overrideAccess: true,
  });

  const businesses: SavedOrFollowedProfileItem[] = [];
  const professionals: SavedOrFollowedProfileItem[] = [];

  for (const row of result.docs) {
    const profile = row.profile as { relationTo?: ProfileCollection; value?: unknown } | null | undefined;
    if (!profile?.relationTo || typeof profile.value !== "object" || profile.value === null) continue;
    const doc = profile.value as Record<string, unknown>;
    const item: SavedOrFollowedProfileItem = {
      id: doc.id as string | number,
      profileType: profile.relationTo,
      name: displayName(profile.relationTo, doc),
      slug: doc.slug as string,
      verified: Boolean(doc.verified),
      since: row.createdAt as string,
    };
    if (profile.relationTo === "business-profiles") businesses.push(item);
    else professionals.push(item);
  }

  return { businesses, professionals };
}

export async function getSavedProfiles(ownerId: string | number) {
  return listOwnedSocialProfiles("saved-profiles", ownerId);
}

export async function getFollowedProfiles(ownerId: string | number) {
  return listOwnedSocialProfiles("follows", ownerId);
}

export async function isProfileSaved(ownerId: string | number, profileType: ProfileCollection, profileId: string | number): Promise<boolean> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "saved-profiles",
    where: { owner: { equals: ownerId }, profileKey: { equals: `${profileType}:${profileId}` } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return result.totalDocs > 0;
}

export async function isProfileFollowed(ownerId: string | number, profileType: ProfileCollection, profileId: string | number): Promise<boolean> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "follows",
    where: { owner: { equals: ownerId }, profileKey: { equals: `${profileType}:${profileId}` } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return result.totalDocs > 0;
}

/**
 * The one legitimate cross-account read into `follows`
 * (PHASE11-TECHNICAL-DESIGN.md §G): a profile's own owner may see how
 * many people follow them, never the list of who. Deliberately narrow —
 * runs with overrideAccess internally and returns only a number, never a
 * generic query a caller could widen into the underlying records.
 */
export async function getFollowerCount(profileType: ProfileCollection, profileId: string | number): Promise<number> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "follows",
    where: { profileKey: { equals: `${profileType}:${profileId}` } },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  });
  return result.totalDocs;
}

export interface SavedSearchItem {
  id: string | number;
  profileType: "business" | "professional";
  label: string;
  filters: Record<string, string>;
  createdAt: string;
}

export async function getSavedSearches(ownerId: string | number): Promise<SavedSearchItem[]> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "saved-searches",
    where: { owner: { equals: ownerId } },
    sort: "-createdAt",
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.map((doc) => ({
    id: doc.id as string | number,
    profileType: doc.profileType as "business" | "professional",
    label: doc.label as string,
    filters: (doc.filters as Record<string, string>) ?? {},
    createdAt: doc.createdAt as string,
  }));
}

/** Builds the directory URL a saved search replays to — plain query-string construction, no new filter logic. */
export function savedSearchHref(search: Pick<SavedSearchItem, "profileType" | "filters">): string {
  const basePath = search.profileType === "business" ? "/network/businesses" : "/network/professionals";
  const params = new URLSearchParams(search.filters);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
