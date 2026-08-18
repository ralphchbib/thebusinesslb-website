import type { Where } from "payload";
import { getCms } from "@/lib/cms/client";
import type { ConnectionType, ConnectionStatus } from "@/lib/network/messaging";

export type PostingType = "offer" | "need";
export type PostingStatus = "active" | "fulfilled" | "expired" | "closed";

export interface MarketPostingListItem {
  id: number;
  postingType: PostingType;
  title: string;
  description: string;
  category?: string;
  location?: string;
  budgetRange?: string;
  status: PostingStatus;
  ownerName: string;
  ownerId: number;
  createdAt: string;
}

export interface MarketPostingListResult {
  docs: MarketPostingListItem[];
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface MarketPostingFilters {
  page?: number;
  q?: string;
  postingType?: PostingType;
  category?: string;
  location?: string;
}

function toListItem(doc: Record<string, unknown>): MarketPostingListItem {
  const owner = doc.owner as { id?: unknown; name?: unknown } | number | string | null | undefined;
  return {
    id: doc.id as number,
    postingType: doc.postingType as PostingType,
    title: doc.title as string,
    description: doc.description as string,
    category: (doc.category as string) || undefined,
    location: (doc.location as string) || undefined,
    budgetRange: (doc.budgetRange as string) || undefined,
    status: doc.status as PostingStatus,
    ownerName: typeof owner === "object" && owner ? String(owner.name ?? "Unknown") : "Unknown",
    ownerId: Number(typeof owner === "object" && owner ? owner.id : owner),
    createdAt: doc.createdAt as string,
  };
}

/**
 * Public browse/discovery (Blueprint §18) — `active` postings only, and
 * additionally excludes any posting whose `expiresAt` has passed even if
 * its stored `status` is still `active` (PHASE13-TECHNICAL-DESIGN.md §I:
 * expiry is a read-time filter, not a cron job). Not wrapped in React's
 * cache() — results depend on searchParams and vary per request, same
 * reasoning as `getPublishedBusinessProfiles`.
 */
export async function getPublishedPostings(filters: MarketPostingFilters): Promise<MarketPostingListResult> {
  const payload = await getCms();

  const and: Where[] = [
    { status: { equals: "active" } },
    { or: [{ expiresAt: { exists: false } }, { expiresAt: { greater_than: new Date().toISOString() } }] },
  ];
  if (filters.q) {
    and.push({ or: [{ title: { contains: filters.q } }, { description: { contains: filters.q } }] });
  }
  if (filters.postingType) and.push({ postingType: { equals: filters.postingType } });
  if (filters.category) and.push({ category: { contains: filters.category } });
  if (filters.location) and.push({ location: { contains: filters.location } });

  const result = await payload.find({
    collection: "market-postings",
    where: { and },
    page: filters.page ?? 1,
    limit: 12,
    sort: "-createdAt",
    depth: 1,
    overrideAccess: true,
  });

  return {
    docs: result.docs.map(toListItem),
    page: result.page ?? 1,
    totalPages: result.totalPages ?? 1,
    hasNextPage: result.hasNextPage ?? false,
    hasPrevPage: result.hasPrevPage ?? false,
  };
}

export interface MarketPostingDetail extends MarketPostingListItem {
  ownerAccountType: string;
}

/** Returns null if the posting doesn't exist. Access (active-vs-owner-only) is enforced by the collection's own `readPostings` — this uses overrideAccess only for the trusted owner-name lookup, matching every other read helper in this codebase. */
export async function getPostingById(id: string | number, viewerId?: string | number): Promise<MarketPostingDetail | null> {
  const payload = await getCms();
  const doc = await payload
    .findByID({ collection: "market-postings", id, depth: 1, overrideAccess: true })
    .catch(() => null);
  if (!doc) return null;

  const isOwnerViewing = viewerId !== undefined && String((doc as { owner?: unknown }).owner) === String(viewerId);
  const ownerObj = (doc as { owner?: unknown }).owner as { id?: unknown } | number | string;
  const isOwnerObjMatch = typeof ownerObj === "object" && ownerObj && viewerId !== undefined && String(ownerObj.id) === String(viewerId);
  if (doc.status !== "active" && !isOwnerViewing && !isOwnerObjMatch) return null;

  const owner = doc.owner as { id?: unknown; name?: unknown; accountType?: unknown } | number | string | null | undefined;
  const item = toListItem(doc as Record<string, unknown>);
  return {
    ...item,
    ownerAccountType: typeof owner === "object" && owner ? String(owner.accountType ?? "") : "",
  };
}

/** Dashboard "My Postings" — owner's postings in every status, newest first. */
export async function getOwnPostings(ownerId: string | number): Promise<MarketPostingListItem[]> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "market-postings",
    where: { owner: { equals: ownerId } },
    sort: "-createdAt",
    depth: 1,
    overrideAccess: true,
  });
  return result.docs.map(toListItem);
}

export interface PostingResponseItem {
  connectionId: string | number;
  responderId: string | number;
  responderName: string;
  connectionType: ConnectionType;
  status: ConnectionStatus;
  reason: string;
  valueOffered: string;
  expectedOutcome: string;
  createdAt: string;
}

/** Responses (Connections with `originPosting` set to this posting) received on one of the owner's own postings — verified against `ownerId` so a posting owner can't be tricked into viewing another account's responses via a guessed posting id. */
export async function getPostingResponses(postingId: string | number, ownerId: string | number): Promise<PostingResponseItem[]> {
  const payload = await getCms();
  const posting = await payload.findByID({ collection: "market-postings", id: postingId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!posting) return [];
  const postingOwnerId = typeof posting.owner === "object" ? (posting.owner as { id?: unknown })?.id : posting.owner;
  if (String(postingOwnerId) !== String(ownerId)) return [];

  const result = await payload.find({
    collection: "connections",
    where: { originPosting: { equals: postingId } },
    sort: "-createdAt",
    depth: 0,
    overrideAccess: true,
  });

  return Promise.all(
    result.docs.map(async (row) => {
      const responderId = String(row.accountA) === String(ownerId) ? row.accountB : row.accountA;
      const responder = await payload
        .findByID({ collection: "network-accounts", id: responderId as string | number, depth: 0, overrideAccess: true })
        .catch(() => null);
      return {
        connectionId: row.id as string | number,
        responderId: responderId as string | number,
        responderName: (responder?.name as string) ?? "Unknown",
        connectionType: row.connectionType as ConnectionType,
        status: row.status as ConnectionStatus,
        reason: row.reason as string,
        valueOffered: row.valueOffered as string,
        expectedOutcome: row.expectedOutcome as string,
        createdAt: row.createdAt as string,
      };
    }),
  );
}
