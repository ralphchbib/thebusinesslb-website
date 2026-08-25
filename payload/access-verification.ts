import type { Access } from "payload";
import { isAdminRole, isNetworkAccount } from "./access-network";

/**
 * Phase 15 — access control for VerificationRequests/VerificationEvidence
 * (PHASE15-TECHNICAL-DESIGN.md §E). Mirrors access-moderation.ts's shape
 * exactly, and applies its central lesson from the first draft rather than
 * discovering it two remediation passes later: `verification-officer` is
 * never added to the shared `isStaff()` helper (access-network.ts) — its
 * reach is granted narrowly and explicitly, collection by collection,
 * here.
 */

export function isVerificationOfficer(user: unknown): boolean {
  const u = user as { collection?: string; role?: string } | null | undefined;
  return Boolean(u && u.collection === "users" && u.role === "verification-officer");
}

export function isVerificationStaff(user: unknown): boolean {
  const u = user as { collection?: string; role?: string } | null | undefined;
  return Boolean(u && u.collection === "users" && (u.role === "admin" || u.role === "verification-officer"));
}

export const verificationStaffOnly: Access = ({ req: { user } }) => isVerificationStaff(user);

/**
 * VerificationRequests read — the owning network account reads their own;
 * verification staff read all. Deliberately does not extend to `moderator`
 * — a moderator has no legitimate reason to see a business's registration
 * statement or evidence, the exact over-grant PHASE14-REMEDIATION-PLAN.md
 * §2 spent a full remediation pass removing from `moderator`'s reach into
 * unrelated collections.
 */
export const readOwnVerificationRequestOrStaff: Access = ({ req: { user } }) => {
  if (isVerificationStaff(user)) return true;
  if (isNetworkAccount(user)) return { owner: { equals: user.id } };
  return false;
};

/** VerificationRequests create — only the account's own submission, ownership never trusted from client input (enforced again, independently, in the Server Action). */
export const createOwnVerificationRequest: Access = ({ req: { user }, data }) => {
  if (isVerificationStaff(user)) return true;
  if (!isNetworkAccount(user)) return false;
  const ownerId = (data as { owner?: unknown } | undefined)?.owner;
  return ownerId != null && String(ownerId) === String(user.id);
};

/**
 * VerificationRequests update — verification staff, with one carve-out
 * mirroring `updateModerationCase`'s admin-gated first-offense-suspension
 * shape exactly: a lone `verification-officer` cannot finalize
 * `status: "revoked"` — only `admin` can. Revoking a verified badge is the
 * one consequence in this domain severe enough to warrant the same
 * second-pair-of-eyes discipline Phase 14 already proved out for account
 * suspension, reused here rather than re-invented.
 */
export const updateVerificationRequest: Access = ({ req: { user }, data }) => {
  if (isAdminRole(user)) return true;
  if (!isVerificationStaff(user)) return false;
  const nextStatus = (data as { status?: string } | undefined)?.status;
  if (nextStatus === "revoked") return false;
  return true;
};

/**
 * VerificationEvidence — the substantive fix to a real, already-shipped
 * gap: verification documents previously rode on `Media`, whose
 * `access.read = anyone` is correct for public marketing imagery and wrong
 * for a business registration certificate (PHASE15-TECHNICAL-DESIGN.md
 * §D.2/§G, confirmed live by direct inspection of `Media.ts` before this
 * collection existed). Read is restricted to the uploading account and
 * verification staff — never `anyone`, never `moderator`, never another
 * network account.
 */
export const readOwnEvidenceOrVerificationStaff: Access = ({ req: { user } }) => {
  if (isVerificationStaff(user)) return true;
  if (isNetworkAccount(user)) return { uploadedBy: { equals: user.id } };
  return false;
};

export const createOwnEvidence: Access = ({ req: { user }, data }) => {
  if (isVerificationStaff(user)) return true;
  if (!isNetworkAccount(user)) return false;
  const uploaderId = (data as { uploadedBy?: unknown } | undefined)?.uploadedBy;
  return uploaderId != null && String(uploaderId) === String(user.id);
};
