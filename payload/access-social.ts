import type { Access } from "payload";
import { isStaff, isNetworkAccount } from "./access-network";
import { getProfileOwnerId } from "./access-trust";

/**
 * Phase 11 — access control for saved-profiles/follows/saved-searches.
 * Reuses `access-trust.ts`'s exact ownership-resolution shape (self-follow
 * needs the same "who really owns this target profile" check
 * self-review/self-recommendation already established) but is otherwise
 * deliberately stricter on `read`: unlike every Phase 10 collection, none
 * of these three ever hold public or semi-public content, so there is no
 * staff-moderation reason to read someone else's saved/followed list —
 * PHASE11-TECHNICAL-DESIGN.md §K grounds this directly in Blueprint v3
 * §37's own stated privacy principle ("THE BUSINESS should never sell
 * private or individually identifiable personal information"), which
 * applies just as much to who a member follows as to anything else. The
 * one legitimate cross-account question — "how many people follow my
 * profile" — is answered by a narrow, count-only function
 * (lib/network/social.ts's getFollowerCount), never by relaxing this
 * collection's `read` access.
 */

/** saved-profiles create — any network account, including saving one's own profile (PHASE11-TECHNICAL-DESIGN.md §H: a save is a private bookmark with no trust/popularity signal, so there is nothing to game and no self-check is needed). */
export const createSavedProfile: Access = ({ req: { user } }) => isStaff(user) || isNetworkAccount(user);

/** follows create — any network account except the target profile's own owner (self-follow blocked here, not only in the UI, per the same PR #17 lesson access-trust.ts already documents). */
export const createFollow: Access = async ({ req: { user, payload }, data }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user)) return false;
  const ownerId = await getProfileOwnerId(payload, data?.profile as { relationTo?: string; value?: string | number } | null | undefined);
  if (ownerId === null) return false;
  return ownerId !== String(user.id);
};

/** saved-profiles/follows/saved-searches read — owner only. Deliberately no staff carve-out (see file header) and no exception for the profile's own owner on `follows` — they get an aggregate count (lib/network/social.ts), never the underlying records. */
export const readOwnSocialRecord: Access = ({ req: { user } }) => {
  if (isNetworkAccount(user)) return { owner: { equals: user.id } };
  return false;
};

/** saved-searches create — any network account; not attached to a profile, so no self-check applies. */
export const createSavedSearch: Access = ({ req: { user } }) => isStaff(user) || isNetworkAccount(user);

/** saved-profiles/follows/saved-searches delete (unsave/unfollow/remove) — owner only. */
export const deleteOwnSocialRecord: Access = ({ req: { user } }) => {
  if (isNetworkAccount(user)) return { owner: { equals: user.id } };
  return false;
};

/** saved-searches update — owner only (renaming a saved search's label). */
export const updateOwnSavedSearch: Access = ({ req: { user } }) => {
  if (isNetworkAccount(user)) return { owner: { equals: user.id } };
  return false;
};

/**
 * saved-profiles/follows have no update operation at all — a save or a
 * follow is a fact, not an editable record (PHASE11-TECHNICAL-DESIGN.md
 * §G/§H: "change it by delete+recreate"). Payload's default when
 * `access.update` is omitted is to *allow* the operation, not deny it, so
 * this is set explicitly rather than left out — matching every existing
 * collection in this codebase, which always states every operation's
 * access explicitly instead of relying on that default.
 */
export const denyUpdate: Access = () => false;
