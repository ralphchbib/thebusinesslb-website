import type { Access, FieldAccess } from "payload";
import { isStaff, isNetworkAccount } from "./access-network";

/**
 * Phase 16 — access control for CRM Lite (Blueprint §39,
 * PHASE16-TECHNICAL-DESIGN.md §J). Deliberately the simplest access model
 * in this codebase: every CRM Lite collection is one-sided — a
 * `CrmContact`/`CrmLead` about a prospect is the owning business's private
 * tool, and the prospect has no legitimate reason to ever read it. There is
 * no "other side" access grant to design here at all, unlike
 * Connections/Appeals/ModerationCases, which is what removes an entire
 * category of bugs this project has repeatedly found elsewhere (Phase 14's
 * segregation-of-duties gap, Phase 15's stale-note bug — both arose from
 * multi-party state that CRM Lite structurally does not have).
 *
 * Read access below follows `access-network.ts`'s existing
 * `ownAccountOrStaff` shape. Write access deliberately does NOT — every
 * create/update/delete function in this file checks ownership only, with
 * no `isStaff()` bypass at all, per PHASE16-TECHNICAL-DESIGN.md §J: staff
 * access to CRM Lite is support-only (read), never write. This is a
 * narrower grant than every other staff-facing collection in this
 * project, a deliberate choice for data that is a business's own private
 * workspace rather than shared/moderated content.
 */

/** crm-contacts / crm-leads / crm-tasks read — owner only, or staff. */
export const readOwnCrmRecord: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) return { owner: { equals: user.id } };
  return false;
};

/**
 * crm-contacts / crm-leads / crm-tasks create — owner (self) only. Per
 * PHASE16-TECHNICAL-DESIGN.md §J, staff access to CRM Lite is deliberately
 * read-only ("staff should never be able to edit a business's own pipeline
 * data") — unlike every staff-facing collection elsewhere in this project,
 * `isStaff()` is intentionally NOT checked here. The submitted `owner`
 * must actually be the acting account, same "don't trust a client-supplied
 * ownership claim" reasoning as `createConnection`/`createPosting`.
 */
export const createOwnCrmRecord: Access = ({ req: { user }, data }) => {
  if (!isNetworkAccount(user)) return false;
  return String(data?.owner) === String(user.id);
};

/** crm-contacts / crm-leads / crm-tasks update — owner only. No staff bypass — see `createOwnCrmRecord`'s comment on §J's deliberate read-only staff scoping. `owner` itself carries its own `noUpdateAfterCreate`-style field guard on each collection, matching `MarketPostings.owner`'s precedent. */
export const updateOwnCrmRecord: Access = ({ req: { user } }) => {
  if (isNetworkAccount(user)) return { owner: { equals: user.id } };
  return false;
};

/** crm-contacts / crm-leads / crm-tasks delete — owner only, hard delete (matches `MarketPostings`' precedent: this is the owner's own private workspace data, not a shared/public record, so an unconditional hard-delete is safe — there is no counterpart relationship to protect, unlike Connections). No staff bypass — see `createOwnCrmRecord`'s comment; support access to CRM Lite is read-only. */
export const deleteOwnCrmRecord: Access = ({ req: { user } }) => {
  if (isNetworkAccount(user)) return { owner: { equals: user.id } };
  return false;
};

/** crm-activity read — owner only, or staff. Same shape as the others; listed separately only so its own file doesn't need to re-derive it. */
export const readOwnCrmActivity: Access = readOwnCrmRecord;

/**
 * crm-activity create — client-facing creation is allowed ONLY for
 * `entryType: "note"` (a business logging a manual note); `stage-change`/
 * `system` entries are written exclusively by `logCrmActivity` via
 * `overrideAccess: true` from CrmLeads' own hook (payload/crm-activity.ts)
 * — mirrors `Conversations`' `denyCreate`-then-hook-only pattern for fields
 * a client must never author directly. Without this split, a direct API
 * call could forge a fake "stage-change" entry that never actually
 * happened, corrupting the one record §F's design relies on to make the
 * Contact Timeline trustworthy.
 */
export const createCrmActivityNote: Access = ({ req: { user }, data }) => {
  if (!isNetworkAccount(user)) return false;
  if (String(data?.owner) !== String(user.id)) return false;
  return data?.entryType === "note";
};

/** crm-activity — append-only, matching `ModerationAuditLog`'s immutability precedent, scoped down to owner-domain rather than staff-domain. No role, including the owning business itself, may edit or delete a timeline entry after the fact — the whole point of an activity log is that it can't be quietly rewritten. */
export const denyCrmActivityMutation: Access = () => false;

/**
 * crm-leads.stage — field-level transition guard (PHASE16-TECHNICAL-
 * DESIGN.md §F). `updateOwnCrmRecord` above only checks "is this my
 * document"; without this, a direct authenticated PATCH could move a
 * `won`/`lost` lead back into the open pipeline, silently defeating §F's
 * "won and lost are terminal" invariant the same way a missing field guard
 * once let `MarketPostings.status` be reopened (PHASE13-RELEASE-REVIEW.md
 * §C, Risk #1) — that exact class of bug is why this guard exists from the
 * first draft here rather than being discovered in a later review cycle.
 *
 * Unlike `MarketPostings`' one-way state machine, CRM Lite's own design
 * (§F) deliberately allows free movement *between* the five open stages
 * (a sales pipeline isn't a governance process — there's no reason to
 * block moving a lead backward, e.g. Negotiating back to Qualified). Only
 * the two terminal states are locked once reached.
 */
export const crmLeadStageFieldAccess: FieldAccess = ({ req: { user }, data, doc }) => {
  if (!isNetworkAccount(user)) return false;
  if (data?.stage === undefined) return true;
  const currentStage = (doc as { stage?: unknown } | undefined)?.stage;
  if (currentStage === "won" || currentStage === "lost") return false;
  return true;
};
