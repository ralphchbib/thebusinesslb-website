import type { Where } from "payload";
import { getCms } from "@/lib/cms/client";

export type DeclarationValue =
  | "seeking-buyers"
  | "seeking-distributors"
  | "export-ready"
  | "seeking-mentors"
  | "open-to-partnerships"
  | "available-remote"
  | "can-mentor"
  | "can-distribute"
  | "can-introduce-buyers"
  | "looking-for-suppliers"
  | "want-hire-lebanese-talent"
  | "want-discover-products";

export interface DeclarationListItem {
  id: number;
  accountId: number;
  accountName: string;
  accountType: string;
  diasporaCountry?: string;
  declarations: DeclarationValue[];
  note?: string;
  updatedAt: string;
}

function toListItem(doc: Record<string, unknown>): DeclarationListItem {
  const account = doc.account as { id?: unknown; name?: unknown; accountType?: unknown; diasporaCountry?: unknown } | number | string | null | undefined;
  return {
    id: doc.id as number,
    accountId: Number(typeof account === "object" && account ? account.id : account),
    accountName: typeof account === "object" && account ? String(account.name ?? "Unknown") : "Unknown",
    accountType: typeof account === "object" && account ? String(account.accountType ?? "") : "",
    diasporaCountry: typeof account === "object" && account && account.diasporaCountry ? String(account.diasporaCountry) : undefined,
    declarations: (doc.declarations as DeclarationValue[]) ?? [],
    note: (doc.note as string) || undefined,
    updatedAt: doc.updatedAt as string,
  };
}

export interface DeclarationDirectoryFilters {
  page?: number;
  declaration?: DeclarationValue;
  side?: "supply" | "diaspora";
}

/**
 * Public browse/discovery (Blueprint §33). `side` filters to the
 * business/professional supply-side declarations or the diaspora-side
 * ones — the Directory shows both by default, same "show everything,
 * filter narrows it" shape `getPublishedPostings` already uses. The side
 * filter resolves eligible account ids first (rather than filtering
 * `result.docs` in memory after the fact) so pagination stays accurate —
 * `totalPages`/`hasNextPage` reflect the actually-filtered query, not the
 * unfiltered one.
 */
export async function getDeclarationDirectory(filters: DeclarationDirectoryFilters): Promise<{
  docs: DeclarationListItem[];
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}> {
  const payload = await getCms();

  const and: Where[] = [];
  if (filters.declaration) and.push({ declarations: { contains: filters.declaration } });

  if (filters.side === "supply" || filters.side === "diaspora") {
    const accountTypes = filters.side === "diaspora" ? ["diaspora"] : ["business", "professional"];
    const eligibleAccounts = await payload.find({
      collection: "network-accounts",
      where: { accountType: { in: accountTypes } },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    });
    and.push({ account: { in: eligibleAccounts.docs.map((d) => d.id) } });
  }

  const result = await payload.find({
    collection: "diaspora-declarations",
    where: and.length > 0 ? { and } : undefined,
    page: filters.page ?? 1,
    limit: 24,
    sort: "-updatedAt",
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

export async function getDeclarationById(id: string | number): Promise<DeclarationListItem | null> {
  const payload = await getCms();
  const doc = await payload.findByID({ collection: "diaspora-declarations", id, depth: 1, overrideAccess: true }).catch(() => null);
  if (!doc) return null;
  return toListItem(doc as Record<string, unknown>);
}

/** Dashboard "My Declaration" — an account's own row, or null if it hasn't declared yet. Enforces the one-row-per-account shape at the read layer too, not just the collection's unique index. */
export async function getOwnDeclaration(accountId: string | number): Promise<DeclarationListItem | null> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "diaspora-declarations",
    where: { account: { equals: accountId } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  const doc = result.docs[0];
  return doc ? toListItem(doc as Record<string, unknown>) : null;
}
