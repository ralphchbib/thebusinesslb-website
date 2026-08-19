import type { Access, FieldAccess, Where } from "payload";
import { isStaff, isNetworkAccount } from "./access-network";

/**
 * Phase 13 — access control for market-postings (Blueprint §18 "Offer and
 * Need Exchange," PHASE13-TECHNICAL-DESIGN.md §I). A posting is owned
 * directly by a `network-accounts` record — not a polymorphic profile
 * relationship like Reviews/Follows/SavedProfiles — since a posting
 * belongs to the account the same way a Connection's `requestedBy` does,
 * not to a specific business/professional profile document. That makes
 * ownership checks a plain direct-field comparison, simpler than
 * access-trust.ts's `getProfileOwnerId` polymorphic resolution.
 */

/**
 * market-postings read — anyone (including logged-out visitors) can browse
 * `active` postings, matching the public Business/Professional directories'
 * unauthenticated-read shape. A network account additionally sees their own
 * postings regardless of status, so a closed/fulfilled posting still shows
 * up in their own "My Postings" dashboard list. No staff-only carve-out
 * needed beyond the general `isStaff` bypass — postings aren't sensitive
 * the way a saved/followed list is (access-social.ts's file header).
 */
export const readPostings: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) {
    const where: Where = { or: [{ status: { equals: "active" } }, { owner: { equals: user.id } }] };
    return where;
  }
  return { status: { equals: "active" } };
};

/**
 * market-postings create — any network account, but the submitted `owner`
 * must actually be the acting account (same "don't trust a client-supplied
 * ownership claim" reasoning as `createConnection` in access-messaging.ts)
 * — without this check, a tampered create call could attribute a posting
 * to a different account entirely.
 */
export const createPosting: Access = ({ req: { user }, data }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user)) return false;
  return String(data?.owner) === String(user.id);
};

/** market-postings update (edit/close/mark-fulfilled) — owner only; staff for moderation. Document-scoped only — see `statusTransitionFieldAccess` and `MarketPostings.ts`'s `owner` field for the field-level guards this alone doesn't provide (PHASE13-REVIEW-REMEDIATION-PLAN.md §3). */
export const updateOwnPosting: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) return { owner: { equals: user.id } };
  return false;
};

/**
 * market-postings.status — field-level transition guard. `updateOwnPosting`
 * above only checks "is this my document"; without this, a direct
 * authenticated PATCH could set `status` to anything, including reopening
 * a `closed`/`fulfilled` posting back to `active` — silently contradicting
 * `updatePostingStatusAction`'s own documented "never re-opens" invariant,
 * since that invariant was previously enforced only in the Server Action,
 * not at the access-control layer a direct API call would still have to
 * pass through (PHASE13-RELEASE-REVIEW.md §C, Risk #1).
 *
 * Staff bypass is unconditional (moderation). A non-owner never reaches
 * this at all — `updateOwnPosting`'s Where constraint already excludes
 * them — so this only needs to enforce the *transition*, not ownership
 * again. Doesn't block a create (`doc` is undefined then) and doesn't
 * block an update that isn't touching `status` at all (`data.status`
 * undefined).
 */
export const statusTransitionFieldAccess: FieldAccess = ({ req: { user }, data, doc }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user)) return false;
  if (data?.status === undefined) return true;
  const currentStatus = (doc as { status?: unknown } | undefined)?.status;
  if (currentStatus !== "active") return false;
  return data.status === "closed" || data.status === "fulfilled";
};

/**
 * market-postings delete — staff may always delete (moderation of
 * abusive/illegal content). The owner may delete their own posting only
 * if it has received zero responses yet (no `connections` row references
 * it via `originPosting`) — once someone has responded in good faith,
 * retracting the listing closes it (preserving their response and any
 * conversation it produced) rather than erasing it out from under them.
 * This is the first collection in this codebase where a real user-facing
 * hard-delete exists at all (PHASE13-REVIEW-REMEDIATION-PLAN.md §4) —
 * every other social/relationship collection here denies delete
 * unconditionally; the zero-responses gate is what makes an exception
 * defensible: a posting nobody has acted on yet has no relationship to
 * protect.
 */
export const deleteOwnPosting: Access = async ({ req: { user, payload }, id }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user) || !id) return false;
  const doc = await payload.findByID({ collection: "market-postings", id, depth: 0, overrideAccess: true }).catch(() => null);
  if (!doc) return false;
  const ownerId = typeof doc.owner === "object" ? (doc.owner as { id?: unknown })?.id : doc.owner;
  if (String(ownerId) !== String(user.id)) return false;
  const responses = await payload.find({
    collection: "connections",
    where: { originPosting: { equals: id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return responses.totalDocs === 0;
};
