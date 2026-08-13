import type { Where } from "payload";
import { getCms } from "./client";

export interface ProfessionalProfileListItem {
  id: number;
  name: string;
  slug: string;
  title: string;
  bio: string;
  category?: string;
  location?: string;
  languages: string[];
  photoUrl?: string;
  verified: boolean;
}

export interface ProfessionalProfileListResult {
  docs: ProfessionalProfileListItem[];
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ProfessionalProfileFilters {
  page?: number;
  q?: string;
  category?: string;
  location?: string;
  service?: string;
  skill?: string;
  language?: string;
}

/**
 * Not wrapped in React's cache() — see the matching note in
 * business-profiles.ts for why.
 */
export async function getPublishedProfessionalProfiles(
  filters: ProfessionalProfileFilters,
): Promise<ProfessionalProfileListResult> {
  const payload = await getCms();

  const and: Where[] = [{ _status: { equals: "published" } }];
  if (filters.q) {
    and.push({
      or: [
        { name: { contains: filters.q } },
        { bio: { contains: filters.q } },
        { title: { contains: filters.q } },
        { category: { contains: filters.q } },
      ],
    });
  }
  if (filters.category) and.push({ category: { contains: filters.category } });
  if (filters.location) and.push({ location: { contains: filters.location } });
  if (filters.service) and.push({ "services.name": { contains: filters.service } });
  if (filters.skill) and.push({ "skills.skill": { contains: filters.skill } });
  if (filters.language) and.push({ languages: { equals: filters.language } });

  const result = await payload.find({
    collection: "professional-profiles",
    where: { and },
    page: filters.page ?? 1,
    limit: 12,
    sort: "-createdAt",
  });

  return {
    docs: result.docs.map((doc) => ({
      id: doc.id as number,
      name: doc.name as string,
      slug: doc.slug as string,
      title: doc.title as string,
      bio: doc.bio as string,
      category: (doc.category as string) || undefined,
      location: (doc.location as string) || undefined,
      languages: (doc.languages as string[]) ?? [],
      photoUrl: typeof doc.photo === "object" ? (doc.photo as { url?: string })?.url : undefined,
      verified: Boolean(doc.verified),
    })),
    page: result.page ?? 1,
    totalPages: result.totalPages ?? 1,
    hasNextPage: result.hasNextPage ?? false,
    hasPrevPage: result.hasPrevPage ?? false,
  };
}
