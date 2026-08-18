import type { Access, Where } from "payload";
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

/** market-postings update (edit/close/mark-fulfilled) — owner only; staff for moderation. */
export const updateOwnPosting: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) return { owner: { equals: user.id } };
  return false;
};

/** No destructive delete through the API — close via `status`, matching the Connections/Reviews precedent. */
export const denyDelete: Access = () => false;
