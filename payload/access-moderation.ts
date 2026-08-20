import type { Access, Payload } from "payload";
import { isStaff, isNetworkAccount } from "./access-network";

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

export function isAdminRole(user: unknown): boolean {
  const u = user as { collection?: string; role?: string } | null | undefined;
  return Boolean(u && u.collection === "users" && u.role === "admin");
}

export function isModerationStaff(user: unknown): boolean {
  const u = user as { collection?: string; role?: string } | null | undefined;
  return Boolean(u && u.collection === "users" && (u.role === "admin" || u.role === "moderator"));
}

export const moderationStaffOnly: Access = ({ req: { user } }) => isModerationStaff(user);

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
 * Appeals create — the acting network account must be the subject of the
 * case's decision (never trusted from client-supplied `appellant`), the
 * appeal deadline hasn't passed, and — PHASE14-REMEDIATION-PLAN.md §1 —
 * no appeal already exists for this case. This is the actual trust
 * boundary; `submitAppealAction`'s own pre-check is a UX convenience on
 * top of it, not a substitute for it.
 */
export const createAppeal: Access = async ({ req: { user, payload }, data }) => {
  const caseId = (data as { case?: unknown } | undefined)?.case;
  if (caseId === undefined || caseId === null) return false;

  // PHASE14-REMEDIATION-V2-PLAN.md §"Secondary Hardening" — the duplicate-
  // appeal check below now runs for every caller, including moderation
  // staff. It previously sat after an early `if (isModerationStaff(user))
  // return true`, so a staff-initiated create bypassed it entirely and
  // was caught only by the database's unique index — a real, if not
  // currently product-reachable, inconsistency between what this function
  // claims to enforce and what it actually did (PHASE14-RELEASE-REVIEW-V2.md
  // §C.2). Ownership/deadline checks still don't apply to staff — an
  // appeal isn't *their* appeal to own a deadline against — but "does one
  // already exist for this case" is not role-specific and never should
  // have been skippable.
  if (!isModerationStaff(user)) {
    if (!isNetworkAccount(user)) return false;
    const caseDoc = (await payload.findByID({ collection: "moderation-cases", id: caseId as string | number, depth: 0, overrideAccess: true }).catch(() => null)) as
      | { target?: PolymorphicRef; appealDeadline?: string | null }
      | null;
    if (!caseDoc) return false;
    if (!caseDoc.appealDeadline || new Date(caseDoc.appealDeadline).getTime() < Date.now()) return false;
    const ownerId = await resolveContentOwnerId(payload, caseDoc.target);
    if (ownerId === null || ownerId !== String(user.id)) return false;
  }

  const existing = await payload.find({ collection: "appeals", where: { case: { equals: caseId } }, limit: 1, depth: 0, overrideAccess: true });
  return existing.totalDocs === 0;
};

/** Appeals read — the appellant reads their own; moderation staff read all. */
export const readOwnAppealOrModerationStaff: Access = ({ req: { user } }) => {
  if (isModerationStaff(user)) return true;
  if (isNetworkAccount(user)) return { appellant: { equals: user.id } };
  return false;
};

/**
 * Appeals update (the review action) — moderation staff only, and never
 * the same staff account that made the underlying case's decision, even
 * if that account is `admin` (PHASE14-TECHNICAL-DESIGN.md §G — segregation
 * of duties applies to every role, not just moderator).
 */
export const reviewAppeal: Access = async ({ req: { user, payload }, id }) => {
  if (!isModerationStaff(user) || !id) return false;
  const appeal = (await payload.findByID({ collection: "appeals", id, depth: 0, overrideAccess: true }).catch(() => null)) as { case?: unknown } | null;
  if (!appeal?.case) return false;
  const caseId = typeof appeal.case === "object" ? (appeal.case as { id?: unknown }).id : appeal.case;
  if (caseId == null) return false;
  const caseDoc = (await payload.findByID({ collection: "moderation-cases", id: caseId as string | number, depth: 0, overrideAccess: true }).catch(() => null)) as
    | { decisionBy?: unknown }
    | null;
  if (!caseDoc) return false;
  const decisionById = typeof caseDoc.decisionBy === "object" ? (caseDoc.decisionBy as { id?: unknown })?.id : caseDoc.decisionBy;
  // `isModerationStaff(user)` already confirmed true by the guard above —
  // checking that here (previously `isStaff(user)`) would have silently
  // skipped this comparison for a moderator decider once `moderator` was
  // removed from `isStaff()` (PHASE14-REMEDIATION-PLAN.md §2), breaking
  // segregation of duties for exactly the role most likely to need it.
  if (decisionById != null && String(decisionById) === String((user as { id: string }).id)) return false;
  return true;
};
