import type { Access, Where } from "payload";
import { isStaff, isNetworkAccount } from "./access-network";

/**
 * Phase 9B — ownership-based access for business-profiles/professional-
 * profiles/portfolio-projects, mirroring access-network.ts's shape. Every
 * one of these collections carries its own flat `owner` relationship to
 * network-accounts (portfolio-projects included, alongside its polymorphic
 * `profile` relationship used for grouping/display) — a direct field
 * comparison here, not a relational traversal through `profile`, since
 * nested-field queries into a polymorphic relationship's target document
 * are exactly the kind of unverified mechanism this project's "verify,
 * don't trust" discipline says to avoid when a simpler, already-proven
 * pattern (a flat `owner` field, identical to every other ownership check
 * in this codebase) does the same job with no new risk.
 */

/** Published is public; a draft is visible only to its owner or staff. */
export const readPublishedOrOwnerOrStaff: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) {
    const where: Where = { or: [{ _status: { equals: "published" } }, { owner: { equals: user.id } }] };
    return where;
  }
  const where: Where = { _status: { equals: "published" } };
  return where;
};

/** Any logged-in network account can create — ownership is set server-side by the Server Action, never trusted from the client. */
export const createByNetworkAccount: Access = ({ req: { user } }) => isNetworkAccount(user) || isStaff(user);

export const updateOrDeleteByOwnerOrStaff: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) {
    return { owner: { equals: user.id } };
  }
  return false;
};

/**
 * portfolio-projects has no publish state of its own, so it can't
 * independently know whether its owning profile is published — rather
 * than risk a portfolio item on an unpublished profile leaking through a
 * direct API call, anonymous read is denied outright here. The public
 * profile pages (app/(app)/network/*\/[slug]/page.tsx) are the only place
 * portfolio items are shown to a visitor, and they only ever reach that
 * code path after already confirming the owning profile itself is
 * visible — at which point they read portfolio items via the Local API
 * with overrideAccess, deliberately bypassing this restriction for that
 * one already-authorized case.
 */
export const readPortfolioItem: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) {
    return { owner: { equals: user.id } };
  }
  return false;
};
