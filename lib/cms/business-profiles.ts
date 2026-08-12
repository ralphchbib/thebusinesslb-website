import type { Where } from "payload";
import { getCms } from "./client";

export interface BusinessProfileListItem {
  id: number;
  companyName: string;
  slug: string;
  description: string;
  industry?: string;
  category?: string;
  location?: string;
  languages: string[];
  logoUrl?: string;
}

export interface BusinessProfileListResult {
  docs: BusinessProfileListItem[];
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface BusinessProfileFilters {
  page?: number;
  q?: string;
  industry?: string;
  category?: string;
  location?: string;
  service?: string;
  language?: string;
}

/**
 * Not wrapped in React's cache() — results depend on searchParams and vary
 * per request, unlike the sitewide content fetchers in this directory that
 * cache() shares across generateMetadata/the page body for one fixed slug.
 */
export async function getPublishedBusinessProfiles(
  filters: BusinessProfileFilters,
): Promise<BusinessProfileListResult> {
  const payload = await getCms();

  const and: Where[] = [{ _status: { equals: "published" } }];
  if (filters.q) {
    and.push({
      or: [
        { companyName: { contains: filters.q } },
        { description: { contains: filters.q } },
        { industry: { contains: filters.q } },
        { category: { contains: filters.q } },
      ],
    });
  }
  if (filters.industry) and.push({ industry: { contains: filters.industry } });
  if (filters.category) and.push({ category: { contains: filters.category } });
  if (filters.location) and.push({ location: { contains: filters.location } });
  if (filters.service) and.push({ "services.name": { contains: filters.service } });
  if (filters.language) and.push({ languages: { equals: filters.language } });

  const result = await payload.find({
    collection: "business-profiles",
    where: { and },
    page: filters.page ?? 1,
    limit: 12,
    sort: "-createdAt",
  });

  return {
    docs: result.docs.map((doc) => ({
      id: doc.id as number,
      companyName: doc.companyName as string,
      slug: doc.slug as string,
      description: doc.description as string,
      industry: (doc.industry as string) || undefined,
      category: (doc.category as string) || undefined,
      location: (doc.location as string) || undefined,
      languages: (doc.languages as string[]) ?? [],
      logoUrl: typeof doc.logo === "object" ? (doc.logo as { url?: string })?.url : undefined,
    })),
    page: result.page ?? 1,
    totalPages: result.totalPages ?? 1,
    hasNextPage: result.hasNextPage ?? false,
    hasPrevPage: result.hasPrevPage ?? false,
  };
}
