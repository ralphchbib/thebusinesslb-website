import "server-only";
import { getCms } from "@/lib/cms/client";

/**
 * Phase 18A — read-side data helpers for the Institution Layer
 * (PHASE18-TECHNICAL-DESIGN.md §F). Every function here scopes to a
 * caller-supplied account id with `overrideAccess: true`, the same
 * "resolve via Local API, scoped by the already-authenticated viewer's
 * own id" shape `lib/network/crm.ts` and `lib/network/messaging.ts`
 * already established.
 *
 * `institution-memberships` is always fetched at `depth: 0`, never `1` —
 * `institution`/`member` reference `network-accounts`, an auth collection
 * carrying `hash`/`salt`/`resetPasswordToken`. A `depth: 1` populate under
 * `overrideAccess: true` would return those fields in the raw doc object
 * (overrideAccess bypasses field-level access too, not just collection-
 * level), the exact class of over-fetch Phase 16's CRM review flagged for
 * a different field set. Counterpart info is instead fetched through
 * `getAccountInfo`, mirroring `lib/network/messaging.ts`'s own
 * `getAccountInfo` precedent exactly — a second, narrow lookup that only
 * ever reads `name`/`accountType` off the result, never anything else.
 */

interface AccountInfo {
  id: string | number;
  name: string;
  accountType: string;
}

async function getAccountInfo(payload: Awaited<ReturnType<typeof getCms>>, id: string | number): Promise<AccountInfo> {
  const doc = await payload.findByID({ collection: "network-accounts", id, depth: 0, overrideAccess: true }).catch(() => null);
  return { id, name: (doc?.name as string) ?? "Unknown", accountType: (doc?.accountType as string) ?? "" };
}

export interface InstitutionMembershipItem {
  id: string | number;
  status: "pending" | "active" | "declined" | "ended";
  role: string | null;
  requestedByViewer: boolean;
  counterpart: AccountInfo;
  joinedAt: string | null;
  createdAt: string;
}

async function getMembershipsFor(accountId: string | number, side: "institution" | "member"): Promise<InstitutionMembershipItem[]> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "institution-memberships",
    where: { [side]: { equals: accountId } },
    depth: 0,
    sort: "-createdAt",
    limit: 200,
    overrideAccess: true,
  });
  return Promise.all(
    result.docs.map(async (doc) => {
      const counterpartId = side === "institution" ? doc.member : doc.institution;
      const counterpart = await getAccountInfo(payload, counterpartId as string | number);
      return {
        id: doc.id as string | number,
        status: doc.status as InstitutionMembershipItem["status"],
        role: (doc.role as string) || null,
        requestedByViewer: String(doc.requestedBy) === String(accountId),
        counterpart,
        joinedAt: (doc.joinedAt as string) || null,
        createdAt: doc.createdAt as string,
      };
    }),
  );
}

/** Everything from the institution's own point of view — active members, pending requests either direction. Institution Member Directory + Institution Dashboard read from this. */
export async function getInstitutionMemberships(institutionId: string | number): Promise<InstitutionMembershipItem[]> {
  return getMembershipsFor(institutionId, "institution");
}

/** Everything from a business/professional's own point of view — institutions it belongs to, pending invites/requests either direction. */
export async function getMemberInstitutionMemberships(memberId: string | number): Promise<InstitutionMembershipItem[]> {
  return getMembershipsFor(memberId, "member");
}

export interface InstitutionAnalytics {
  activeCount: number;
  pendingCount: number;
  endedCount: number;
  byCategory: { label: string; count: number }[];
  membershipsByMonth: { month: string; count: number }[];
}

/**
 * Institution Analytics — PHASE18-TECHNICAL-DESIGN.md §F/§G: a direct,
 * first-party read of the institution's OWN membership rows, not routed
 * through Market Pulse's snapshot pipeline and not k-anonymity-suppressed
 * — this is an institution looking at relationships it is already a
 * first-class party to, the same way `getCrmPipelineStats` was never
 * suppressed either. Deliberately kept as a separate, simpler function
 * from the Market Pulse engine so the two privacy models — "own data,
 * unsuppressed" vs. "cross-account aggregate, suppressed" — never get
 * accidentally merged into one code path.
 */
export async function getInstitutionAnalytics(institutionId: string | number): Promise<InstitutionAnalytics> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "institution-memberships",
    where: { institution: { equals: institutionId } },
    depth: 0,
    limit: 500,
    overrideAccess: true,
  });

  let activeCount = 0;
  let pendingCount = 0;
  let endedCount = 0;
  const categoryCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();

  for (const doc of result.docs) {
    const status = doc.status as string;
    if (status === "active") activeCount += 1;
    else if (status === "pending") pendingCount += 1;
    else if (status === "ended") endedCount += 1;

    if (status !== "active") continue;

    const memberId = doc.member as string | number;
    const [businessProfile, professionalProfile] = await Promise.all([
      payload.find({ collection: "business-profiles", where: { owner: { equals: memberId } }, depth: 0, limit: 1, overrideAccess: true }),
      payload.find({ collection: "professional-profiles", where: { owner: { equals: memberId } }, depth: 0, limit: 1, overrideAccess: true }),
    ]);
    const category = (businessProfile.docs[0]?.industry as string) || (businessProfile.docs[0]?.category as string) || (professionalProfile.docs[0]?.category as string) || null;
    if (category) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);

    if (doc.joinedAt) {
      const month = (doc.joinedAt as string).slice(0, 7);
      monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
    }
  }

  return {
    activeCount,
    pendingCount,
    endedCount,
    byCategory: Array.from(categoryCounts.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    membershipsByMonth: Array.from(monthCounts.entries()).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
  };
}
