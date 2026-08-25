import type { Access, Payload } from "payload";
import { isStaff, isNetworkAccount, isAdminRole } from "./access-network";
import { isVerificationStaff } from "./access-verification";

// Re-exported for backward compatibility — every existing import of
// `isAdminRole` from this module (ModerationCases.ts, etc.) keeps working
// unchanged. The function itself now lives in access-network.ts so
// access-verification.ts can depend on it too without either governance
// module importing the other (PHASE15-TECHNICAL-DESIGN.md §E).
export { isAdminRole };

/**
 * Phase 14 — access control for ModerationCases/ModerationAuditLog/Appeals
 * (PHASE14-TECHNICAL-DESIGN.md §F/§G). Two checks, deliberately distinct
 * from access-network.ts's `isStaff`:
 *
 * - `isAdminRole` — admin only, for the handful of actions the design
 *   restricts even from moderators (escalation targets, first-offense
 *   suspensions — see `updateModerationCase` below).
 * - `isModerationStaff` — admin or moderator, explicitly excluding editor.
 *
 * PHASE14-REMEDIATION-PLAN.md §2 — `moderator` was briefly added to the
 * shared `isStaff()` helper (used for ownership-bypass across every
 * private-content collection in the app: messages, reviews,
 * recommendations, profiles, market postings), which silently gave
 * moderator the same network-wide staff bypass `editor` already had —
 * far beyond the design's own §F access table, which scopes moderator to
 * exactly four collections: ModerationCases, Appeals, ModerationAuditLog,
 * and ContentReports. `isStaff()` has been reverted to its pre-Phase-14
 * shape (admin/editor only); moderator's access is now granted narrowly,
 * collection by collection, via `isModerationStaff` (the three new
 * collections) and `contentReportsAccess` below (the one pre-existing
 * collection moderator legitimately needs).
 */

export function isModerationStaff(user: unknown): boolean {
  const u = user as { collection?: string; role?: string } | null | undefined;
  return Boolean(u && u.collection === "users" && (u.role === "admin" || u.role === "moderator"));
}

export const moderationStaffOnly: Access = ({ req: { user } }) => isModerationStaff(user);

/**
 * PHASE15-REMEDIATION-PLAN.md §2 — `ModerationAuditLog` read access.
 * Moderation staff (admin/moderator) keep unrestricted read, unchanged from
 * Phase 14 — narrowing that existing reach was not part of this fix and
 * risks its own regression. Verification staff (admin/verification-officer)
 * gain read access, but scoped to verification-domain entries only, not the
 * full log — "do not broaden access unnecessarily." Admin satisfies
 * `isModerationStaff` first and always gets unrestricted read either way.
 */
export const moderationOrVerificationAuditRead: Access = ({ req: { user } }) => {
  if (isModerationStaff(user)) return true;
  if (isVerificationStaff(user)) return { "case.relationTo": { equals: "verification-requests" } };
  return false;
};

/**
 * PHASE14-REMEDIATION-PLAN.md §2 — ContentReports predates this phase and
 * is otherwise gated by `access-trust.ts`'s `staffOnlyRead`/
 * `staffOnlyUpdate` (i.e. `isStaff`, admin/editor). Moderator needs the
 * same reach — reports are the raw material a case is built from — but
 * granting it via `isStaff()` is exactly the over-broad grant this
 * remediation removes. This function reproduces admin/editor's existing,
 * unchanged access to ContentReports and adds moderator explicitly,
 * without touching `isStaff()` itself or any other collection that
 * consumes it.
 */
export const contentReportsAccess: Access = ({ req: { user } }) => isStaff(user) || isModerationStaff(user);

/** ModerationAuditLog — append-only. No update/delete for any role, including admin (PHASE14-TECHNICAL-DESIGN.md §G). */
export const denyMutation: Access = () => false;

type PolymorphicRef = { relationTo?: string; value?: string | number } | null | undefined;

/**
 * The field that names "who owns this content" differs per collection —
 * `owner` on reviews/recommendations/market-postings, `sender` on
 * messages, and for an account-level case the target *is* the account.
 * Used both by the suspension-enforcement hook (ModerationCases) and by
 * Appeals' create/segregation-of-duties checks below.
 */
const OWNER_FIELD: Record<string, string> = {
  reviews: "owner",
  recommendations: "owner",
  "market-postings": "owner",
  messages: "sender",
};

export async function resolveContentOwnerId(
  payload: { findByID: (args: { collection: string; id: string | number; depth: number; overrideAccess: boolean }) => Promise<unknown> },
  target: PolymorphicRef,
): Promise<string | null> {
  if (!target?.relationTo || target.value === undefined || target.value === null) return null;

  // `target.value` may already be a *populated* related doc (Payload
  // resolves relationship values when a hook's afterChange fires with the
  // operation's own default depth), not a bare id — normalize both shapes
  // the same way this codebase's other owner-ref resolution already does
  // (e.g. `typeof doc.owner === "object" ? doc.owner.id : doc.owner`).
  const targetId = typeof target.value === "object" && target.value !== null ? (target.value as { id?: unknown }).id : target.value;
  if (targetId == null) return null;

  if (target.relationTo === "network-accounts") return String(targetId);

  const ownerField = OWNER_FIELD[target.relationTo];
  if (!ownerField) return null;

  const doc = (await payload.findByID({
    collection: target.relationTo,
    id: targetId as string | number,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown> | null;
  if (!doc) return null;
  const ownerRef = doc[ownerField];
  const ownerId = typeof ownerRef === "object" && ownerRef !== null ? (ownerRef as { id?: unknown }).id : ownerRef;
  return ownerId != null ? String(ownerId) : null;
}

/**
 * PHASE14-REMEDIATION-PLAN.md §1 — every reportable collection this
 * account could own or have sent, resolved to `${relationTo}:${value}`
 * `targetKey`s, the same derived shape `ModerationCases.targetKey` uses.
 * Shared by the escalation history check below and by
 * `lib/network/moderation.ts`'s "Account Standing" page (kept as two
 * independent implementations rather than one cross-imported helper —
 * `payload/` must not depend on `lib/network/`, which itself depends on
 * `getCms()` → `payload.config.ts` → this file, a circular import).
 */
async function ownedTargetKeys(payload: Payload, ownerId: string): Promise<string[]> {
  const [reviews, recommendations, messages, postings] = await Promise.all([
    payload.find({ collection: "reviews", where: { owner: { equals: ownerId } }, limit: 200, depth: 0, overrideAccess: true }),
    payload.find({ collection: "recommendations", where: { owner: { equals: ownerId } }, limit: 200, depth: 0, overrideAccess: true }),
    payload.find({ collection: "messages", where: { sender: { equals: ownerId } }, limit: 200, depth: 0, overrideAccess: true }),
    payload.find({ collection: "market-postings", where: { owner: { equals: ownerId } }, limit: 200, depth: 0, overrideAccess: true }),
  ]);
  return [
    `network-accounts:${ownerId}`,
    ...reviews.docs.map((d) => `reviews:${d.id}`),
    ...recommendations.docs.map((d) => `recommendations:${d.id}`),
    ...messages.docs.map((d) => `messages:${d.id}`),
    ...postings.docs.map((d) => `market-postings:${d.id}`),
  ];
}

/**
 * PHASE14-REMEDIATION-V2-PLAN.md §3 — a decision counts as "case
 * history" for escalation purposes only if it was a sanction, not merely
 * a completed review. `no-action` means the account was investigated and
 * cleared — the design's own §E frames case history for this purpose as
 * "count of prior **action-taken** decisions," and treating a cleared
 * report as offense history would invert what the mandatory-escalation
 * rule (§H) exists to protect against.
 */
const SANCTION_DECISIONS = ["content-removed", "warning-issued", "account-suspended"];

/**
 * PHASE14-REMEDIATION-PLAN.md §3 — true if any *other*, already-decided
 * case exists against anything this account owns or sent, where that
 * decision was a sanction (see `SANCTION_DECISIONS` above) — a cleared
 * (`no-action`) case never counts, however many of them exist. Used to
 * gate first-offense suspensions: per the design (§H), a lone moderator
 * may not finalize an `account-suspended` decision on an account with no
 * prior sanction history — only an admin may.
 */
export async function hasDecidedCaseHistory(payload: Payload, ownerId: string, excludeCaseId: string | number): Promise<boolean> {
  const keys = await ownedTargetKeys(payload, ownerId);
  const result = await payload.find({
    collection: "moderation-cases",
    where: { and: [{ targetKey: { in: keys } }, { decision: { in: SANCTION_DECISIONS } }, { id: { not_equals: excludeCaseId } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return result.totalDocs > 0;
}

/**
 * ModerationCases update — moderation staff, with one carve-out
 * (PHASE14-REMEDIATION-PLAN.md §3): a non-admin cannot finalize an
 * `account-suspended` decision on a first-offense account. This is
 * enforced here, at the access layer, not only as a hook-level check —
 * a rejected write here never reaches the beforeChange hook at all.
 */
export const updateModerationCase: Access = async ({ req: { user, payload }, id, data }) => {
  if (isAdminRole(user)) return true;
  if (!isModerationStaff(user)) return false;
  if (!id || (data as { decision?: string } | undefined)?.decision !== "account-suspended") return true;

  const caseDoc = (await payload.findByID({ collection: "moderation-cases", id, depth: 0, overrideAccess: true }).catch(() => null)) as
    | { decision?: string; target?: PolymorphicRef }
    | null;
  if (!caseDoc) return false;
  if (caseDoc.decision === "account-suspended") return true; // already decided — editing notes on an existing decision isn't a new suspension

  const ownerId = await resolveContentOwnerId(payload, caseDoc.target);
  if (!ownerId) return false;
  return hasDecidedCaseHistory(payload, ownerId, id);
};

/**
 * Phase 15 — `Appeals.case` is now polymorphic
 * (`["moderation-cases", "verification-requests"]`, PHASE15-TECHNICAL-
 * DESIGN.md §D.3), so every function below that used to assume "the case
 * is always a moderation-cases row" now resolves a uniform context first:
 * which collection the case belongs to, who owns it (for the appellant
 * check), when its appeal window closes, and who decided it (for
 * segregation of duties). Two independent shapes are unified into one
 * return type here rather than duplicated across `createAppeal` and
 * `reviewAppeal` separately.
 */
interface AppealCaseContext {
  collectionType: "moderation-cases" | "verification-requests";
  ownerId: string | null;
  appealDeadline: string | null;
  decisionById: string | null;
}

async function resolveAppealCaseContext(payload: Payload, caseRef: PolymorphicRef): Promise<AppealCaseContext | null> {
  if (!caseRef?.relationTo || caseRef.value === undefined || caseRef.value === null) return null;
  const caseId = typeof caseRef.value === "object" && caseRef.value !== null ? (caseRef.value as { id?: unknown }).id : caseRef.value;
  if (caseId == null) return null;

  if (caseRef.relationTo === "moderation-cases") {
    const doc = (await payload.findByID({ collection: "moderation-cases", id: caseId as string | number, depth: 0, overrideAccess: true }).catch(() => null)) as
      | { target?: PolymorphicRef; appealDeadline?: string | null; decisionBy?: unknown }
      | null;
    if (!doc) return null;
    const ownerId = await resolveContentOwnerId(payload, doc.target);
    const decisionById = typeof doc.decisionBy === "object" && doc.decisionBy !== null ? (doc.decisionBy as { id?: unknown }).id : doc.decisionBy;
    return { collectionType: "moderation-cases", ownerId, appealDeadline: doc.appealDeadline ?? null, decisionById: decisionById != null ? String(decisionById) : null };
  }

  if (caseRef.relationTo === "verification-requests") {
    const doc = (await payload.findByID({ collection: "verification-requests", id: caseId as string | number, depth: 0, overrideAccess: true }).catch(() => null)) as
      | { owner?: unknown; appealDeadline?: string | null; status?: string; reviewedBy?: unknown; revokedBy?: unknown }
      | null;
    if (!doc) return null;
    const ownerId = typeof doc.owner === "object" && doc.owner !== null ? (doc.owner as { id?: unknown }).id : doc.owner;
    // A rejection's decider is `reviewedBy`; a revocation's decider is
    // `revokedBy` — VerificationRequests.ts's own beforeChange hook only
    // sets `reviewedBy` on the approve/reject transition (`DECIDED_STATUSES`),
    // never on revocation, so reading `reviewedBy` alone silently resolved
    // to nobody for a revoked request and let its own revoker review the
    // appeal against it — live-caught during this phase's own validation,
    // fixed here rather than left for a future review cycle to find.
    const decisionRef = doc.status === "revoked" ? doc.revokedBy : doc.reviewedBy;
    const decisionById = typeof decisionRef === "object" && decisionRef !== null ? (decisionRef as { id?: unknown }).id : decisionRef;
    return {
      collectionType: "verification-requests",
      ownerId: ownerId != null ? String(ownerId) : null,
      appealDeadline: doc.appealDeadline ?? null,
      decisionById: decisionById != null ? String(decisionById) : null,
    };
  }

  return null;
}

function isMatchingGovernanceStaff(user: unknown, collectionType: AppealCaseContext["collectionType"]): boolean {
  if (isAdminRole(user)) return true;
  return collectionType === "moderation-cases" ? isModerationStaff(user) : isVerificationStaff(user);
}

/**
 * Appeals create — the acting network account must be the subject of the
 * case's decision (never trusted from client-supplied `appellant`), the
 * appeal deadline hasn't passed, and — PHASE14-REMEDIATION-PLAN.md §1 —
 * no appeal already exists for this case. This is the actual trust
 * boundary; `submitAppealAction`'s own pre-check is a UX convenience on
 * top of it, not a substitute for it.
 *
 * Duplicate check queries `caseKey` (a derived `${relationTo}:${value}`
 * text field, same shape and reason as `ModerationCases.targetKey`) rather
 * than `case` directly — Payload's polymorphic-relationship fields aren't
 * filterable by exact (relationTo, value) the way a plain field is.
 */
export const createAppeal: Access = async ({ req: { user, payload }, data }) => {
  const caseRef = (data as { case?: PolymorphicRef } | undefined)?.case;
  if (!caseRef?.relationTo || caseRef.value === undefined || caseRef.value === null) return false;
  const domain = caseRef.relationTo === "moderation-cases" || caseRef.relationTo === "verification-requests" ? caseRef.relationTo : null;
  if (!domain) return false;

  // PHASE14-REMEDIATION-V2-PLAN.md §"Secondary Hardening" — the duplicate-
  // appeal check below runs for every caller, including governance staff.
  // Ownership/deadline checks don't apply to staff — an appeal isn't
  // *their* appeal to own a deadline against — but "does one already
  // exist for this case" is not role-specific and never should be
  // skippable.
  //
  // PHASE15-REMEDIATION-PLAN.md §1 — the staff bypass below must be
  // domain-matched, the same way `reviewAppeal` already matches domains via
  // `isMatchingGovernanceStaff`: a moderator may only skip the ownership/
  // deadline checks for a moderation-cases appeal, a verification-officer
  // only for a verification-requests one. Reusing `isMatchingGovernanceStaff`
  // here (rather than the previous `isModerationStaff(user) ||
  // isVerificationStaff(user)` OR-across-domains check) closes the gap
  // where either role could fabricate an appeal — bypassing ownership and
  // deadline entirely — against a case in a domain it has no standing in.
  const isStaffCreator = isMatchingGovernanceStaff(user, domain);
  if (!isStaffCreator) {
    if (!isNetworkAccount(user)) return false;
    const ctx = await resolveAppealCaseContext(payload, caseRef);
    if (!ctx) return false;
    if (!ctx.appealDeadline || new Date(ctx.appealDeadline).getTime() < Date.now()) return false;
    if (ctx.ownerId === null || ctx.ownerId !== String(user.id)) return false;
  }

  const caseKey = `${caseRef.relationTo}:${typeof caseRef.value === "object" ? (caseRef.value as { id?: unknown }).id : caseRef.value}`;
  const existing = await payload.find({ collection: "appeals", where: { caseKey: { equals: caseKey } }, limit: 1, depth: 0, overrideAccess: true });
  return existing.totalDocs === 0;
};

/** Appeals read — the appellant reads their own; governance staff (moderation or verification) read all. */
export const readOwnAppealOrGovernanceStaff: Access = ({ req: { user } }) => {
  if (isModerationStaff(user) || isVerificationStaff(user)) return true;
  if (isNetworkAccount(user)) return { appellant: { equals: user.id } };
  return false;
};

/**
 * Appeals update (the review action) — staff from the *matching* domain
 * only (a moderator cannot review a verification appeal and a verification
 * officer cannot review a moderation appeal, per PHASE15-TECHNICAL-
 * DESIGN.md §E — each role has no standing to judge the other's domain),
 * admin exempt from the domain check but never from segregation of
 * duties: never the same staff account that made the underlying decision,
 * even if that account is admin (PHASE14-TECHNICAL-DESIGN.md §G).
 */
export const reviewAppeal: Access = async ({ req: { user, payload }, id }) => {
  if (!id || (!isModerationStaff(user) && !isVerificationStaff(user))) return false;
  const appeal = (await payload.findByID({ collection: "appeals", id, depth: 0, overrideAccess: true }).catch(() => null)) as { case?: PolymorphicRef } | null;
  if (!appeal?.case) return false;
  const ctx = await resolveAppealCaseContext(payload, appeal.case);
  if (!ctx) return false;
  if (!isMatchingGovernanceStaff(user, ctx.collectionType)) return false;
  if (ctx.decisionById != null && ctx.decisionById === String((user as { id: string }).id)) return false;
  return true;
};
