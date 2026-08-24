import { getCms } from "@/lib/cms/client";

/**
 * Phase 14 — narrow, purpose-built reads for the network-user-facing
 * "Account Standing"/"My Reports" panels (PHASE14-TECHNICAL-DESIGN.md §E).
 * These deliberately project only the fields a reported/reporting account
 * is meant to see — never the moderator's internal `decisionNote`, never
 * the identity of other reporters, never the raw `moderation-cases`
 * collection itself (which stays staff-only at the access-control layer;
 * this file uses `overrideAccess: true` the same way `getPostingById` and
 * other trusted server-side reads elsewhere in this codebase already do).
 */

export interface MyReport {
  id: string | number;
  reason: string;
  createdAt: string;
  resolved: boolean;
}

export async function getMyReports(userId: string | number): Promise<MyReport[]> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "content-reports",
    where: { reporter: { equals: userId } },
    sort: "-createdAt",
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.map((r) => ({
    id: r.id as string | number,
    reason: r.reason as string,
    createdAt: r.createdAt as string,
    resolved: Boolean(r.resolved),
  }));
}

export interface StandingCase {
  id: string | number;
  decision: string;
  status: string;
  decidedAt: string | null;
  canAppeal: boolean;
}

/** Content owned/sent by this account, across every reportable collection — used to find cases against content this account is responsible for, not just direct account-level cases. */
async function ownedTargetKeys(userId: string | number): Promise<string[]> {
  const payload = await getCms();
  const [reviews, recommendations, messages, postings] = await Promise.all([
    payload.find({ collection: "reviews", where: { owner: { equals: userId } }, limit: 200, depth: 0, overrideAccess: true }),
    payload.find({ collection: "recommendations", where: { owner: { equals: userId } }, limit: 200, depth: 0, overrideAccess: true }),
    payload.find({ collection: "messages", where: { sender: { equals: userId } }, limit: 200, depth: 0, overrideAccess: true }),
    payload.find({ collection: "market-postings", where: { owner: { equals: userId } }, limit: 200, depth: 0, overrideAccess: true }),
  ]);
  return [
    `network-accounts:${userId}`,
    ...reviews.docs.map((d) => `reviews:${d.id}`),
    ...recommendations.docs.map((d) => `recommendations:${d.id}`),
    ...messages.docs.map((d) => `messages:${d.id}`),
    ...postings.docs.map((d) => `market-postings:${d.id}`),
  ];
}

export async function getAccountStandingCases(userId: string | number): Promise<StandingCase[]> {
  const payload = await getCms();
  const keys = await ownedTargetKeys(userId);
  if (keys.length === 0) return [];

  const result = await payload.find({
    collection: "moderation-cases",
    where: { and: [{ targetKey: { in: keys } }, { decision: { exists: true } }] },
    sort: "-decidedAt",
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });

  const now = Date.now();
  return result.docs.map((c) => ({
    id: c.id as string | number,
    decision: c.decision as string,
    status: c.status as string,
    decidedAt: (c.decidedAt as string) ?? null,
    canAppeal: Boolean(c.appealDeadline) && new Date(c.appealDeadline as string).getTime() > now && !["appealed", "appeal-upheld", "appeal-denied"].includes(c.status as string),
  }));
}
