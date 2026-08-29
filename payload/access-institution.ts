import type { Access, FieldAccess, Where } from "payload";
import { isStaff, isNetworkAccount } from "./access-network";

/**
 * Phase 18A — access control for institution-memberships
 * (PHASE18-TECHNICAL-DESIGN.md §C/§I). Modeled directly on
 * `access-messaging.ts`'s `Connections` shape — a two-party relationship
 * requiring approval from whichever side did NOT request it — but kept as
 * its own file/functions rather than reused verbatim, since the two
 * relationships mean different things: `Connections` is symmetric peer
 * commercial networking (`accountA`/`accountB`, either could be "A"),
 * `InstitutionMemberships` is asymmetric (`institution`/`member` are
 * different roles, never interchangeable, so there is no normalization
 * hook here the way `Connections.beforeChange` needs one).
 *
 * PHASE18-TECHNICAL-DESIGN.md §I's hard boundary — "institution membership
 * grants zero data access into a member's business" — is enforced by what
 * this file does NOT do: nothing here, or anywhere else in this phase's
 * diff, adds an `isInstitutionAccount` bypass into `access-crm.ts`,
 * `access-messaging.ts`, or any other collection's access functions. The
 * isolation holds by construction (an institution account never owns a
 * `CrmContacts`/`CrmLeads` row and is never a `Connections`/`Conversations`
 * participant merely by having members), not by an added check.
 */

function eitherParty(userId: string): Where {
  return { or: [{ institution: { equals: userId } }, { member: { equals: userId } }] };
}

/** institution-memberships read — either party, or staff (support/QA, matching every other collection's staff-read carve-out). */
export const readInstitutionMembership: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) return eitherParty(user.id);
  return false;
};

/**
 * institution-memberships create — the acting account must be one of the
 * two named parties *and* the declared requester, matching
 * `createConnection`'s exact "don't trust a client-supplied claim that
 * doesn't involve the caller" reasoning. Which party is `institution` vs
 * `member` isn't checked for account-type correctness here — that's
 * `payload/institution-eligibility.ts`'s `assertAccountType`, called from
 * the collection's own `beforeValidate` hook, the same "hook validates the
 * referenced document's properties, access function validates who's
 * calling" split `assertOwnedReference`/`createOwnCrmRecord` already
 * establish for CRM Lite.
 */
export const createInstitutionMembership: Access = ({ req: { user }, data }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user)) return false;
  if (!data?.institution || !data?.member) return false;
  if (String(data.institution) === String(data.member)) return false;
  if (String(data?.requestedBy) !== String(user.id)) return false;
  // PHASE18A-REMEDIATION-PLAN.md §1/§2, Fix #1 — a client-supplied `status`
  // other than the safe starting value is rejected outright. Before this
  // check, nothing here (or anywhere else in this collection's access
  // stack) ever inspected `data.status` on create — `status`'s own field-
  // level guard (`institutionMembershipStatusFieldAccess`) only governs the
  // *update* operation, so a direct create call with `status: "active"`
  // sailed straight through, instantly fabricating a membership neither
  // party had actually agreed to (live-reproduced in both directions in
  // PHASE18A-RELEASE-REVIEW.md §C.1). `undefined` is fine — the field's
  // own `defaultValue: "pending"` fills it in.
  if (data?.status !== undefined && data.status !== "pending") return false;
  const isInstitutionParty = String(data.institution) === String(user.id);
  const isMemberParty = String(data.member) === String(user.id);
  return isInstitutionParty || isMemberParty;
};

/** institution-memberships update — either party may update their own membership (the actual transition legality is enforced by `institutionMembershipStatusFieldAccess` below, and `role` by `institutionRoleFieldAccess`) — document-scoped only, same split `updateOwnPosting`/`statusTransitionFieldAccess` already establish for `MarketPostings`. */
export const updateInstitutionMembership: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) return eitherParty(user.id);
  return false;
};

/**
 * institution-memberships.status field guard — `pending` may only be
 * resolved (`active`/`declined`) by the party who did NOT request it,
 * matching `respondToConnection`'s "requires approval from both sides."
 * `active` may be ended by either party (leaving or removing a member are
 * both legitimate, unlike the request/approve asymmetry). `declined`/
 * `ended` are terminal — no further transition is ever legal, the same
 * "won/lost are terminal" invariant `crmLeadStageFieldAccess` already
 * enforces for a different collection.
 */
export const institutionMembershipStatusFieldAccess: FieldAccess = ({ req: { user }, data, doc }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user)) return false;
  if (data?.status === undefined) return true;
  const current = (doc as { status?: unknown } | undefined)?.status;
  const requestedBy = (doc as { requestedBy?: unknown } | undefined)?.requestedBy;
  const institution = (doc as { institution?: unknown } | undefined)?.institution;
  const member = (doc as { member?: unknown } | undefined)?.member;
  const isParty = String(institution) === String(user.id) || String(member) === String(user.id);
  if (!isParty) return false;
  if (current === "pending") {
    if (String(requestedBy) === String(user.id)) return false;
    return data.status === "active" || data.status === "declined";
  }
  if (current === "active") {
    return data.status === "ended";
  }
  return false;
};

/** institution-memberships.role — settable only by the institution party, never the member itself (§C: "institution-set, not self-declared by the member"). */
export const institutionRoleFieldAccess: FieldAccess = ({ req: { user }, doc }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user) || !doc) return false;
  return String((doc as { institution?: unknown }).institution) === String(user.id);
};

/** institution-memberships delete — denied unconditionally, matching `Connections`' `denyDelete` precedent: membership history is preserved via `status: "ended"`, never erased. */
export const denyInstitutionMembershipDelete: Access = () => false;
