import type { Access } from "payload";
import { isStaff, isNetworkAccount } from "./access-network";

/**
 * Phase 14 — access control for ModerationCases/ModerationAuditLog/Appeals
 * (PHASE14-TECHNICAL-DESIGN.md §F/§G). Two new checks, deliberately
 * distinct from access-network.ts's `isStaff`:
 *
 * - `isAdminRole` — admin only, for the handful of actions the design
 *   restricts even from moderators (escalation targets).
 * - `isModerationStaff` — admin or moderator, explicitly excluding editor.
 *   `isStaff` (admin/editor/moderator) still gates the *existing*
 *   collections a case needs to read to render reported content
 *   (reviews/recommendations/messages/market-postings) — editor's
 *   pre-existing reach there is unrelated to this phase and left alone.
 *   The three *new* collections this phase introduces use the narrower
 *   check instead, per §F's "editor — no access to any moderation
 *   collection."
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

/** Appeals create — the acting network account must be the subject of the case's decision (never trusted from client-supplied `appellant`). */
export const createAppeal: Access = async ({ req: { user, payload }, data }) => {
  if (isModerationStaff(user)) return true;
  if (!isNetworkAccount(user)) return false;
  const caseId = (data as { case?: unknown } | undefined)?.case;
  if (caseId === undefined || caseId === null) return false;
  const caseDoc = (await payload.findByID({ collection: "moderation-cases", id: caseId as string | number, depth: 0, overrideAccess: true }).catch(() => null)) as
    | { target?: PolymorphicRef; appealDeadline?: string | null }
    | null;
  if (!caseDoc) return false;
  if (!caseDoc.appealDeadline || new Date(caseDoc.appealDeadline).getTime() < Date.now()) return false;
  const ownerId = await resolveContentOwnerId(payload, caseDoc.target);
  return ownerId !== null && ownerId === String(user.id);
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
  if (decisionById != null && isStaff(user) && String(decisionById) === String((user as { id: string }).id)) return false;
  return true;
};
