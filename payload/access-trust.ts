import type { Access, FieldAccess } from "payload";
import { isStaff, isNetworkAccount } from "./access-network";

/**
 * Phase 10 — access control for verification-requests/reviews/
 * recommendations/content-reports, following the exact ownership-check
 * shape already established in access-network.ts/access-profiles.ts.
 *
 * The one genuinely new shape here: several of these checks need to know
 * a *target profile's* owner, not the acting account's own id — e.g. "is
 * this account creating a verification request for a profile it owns?"
 * or "is this account the reviewed profile's owner, allowed to reply?".
 * `getProfileOwnerId` resolves that via a direct `findByID` lookup, the
 * same trusted-server-side pattern the public profile pages already use
 * (`typeof profile.owner === "object" ? profile.owner.id : profile.owner`),
 * not a query into the polymorphic relationship itself.
 */

type PolymorphicRef = { relationTo?: string; value?: string | number } | null | undefined;

async function getProfileOwnerId(
  payload: { findByID: (args: { collection: "business-profiles" | "professional-profiles"; id: string | number; depth: number; overrideAccess: boolean }) => Promise<unknown> },
  profile: PolymorphicRef,
): Promise<string | null> {
  if (!profile?.relationTo || profile.value === undefined || profile.value === null) return null;
  if (profile.relationTo !== "business-profiles" && profile.relationTo !== "professional-profiles") return null;
  const doc = (await payload.findByID({
    collection: profile.relationTo,
    id: profile.value,
    depth: 0,
    overrideAccess: true,
  })) as { owner?: unknown } | null;
  if (!doc) return null;
  const ownerId = typeof doc.owner === "object" ? (doc.owner as { id?: unknown })?.id : doc.owner;
  return ownerId != null ? String(ownerId) : null;
}

export const staffOnlyUpdate: Access = ({ req: { user } }) => isStaff(user);
export const staffOnlyRead: Access = ({ req: { user } }) => isStaff(user);
export const staffOnlyTrustField: FieldAccess = ({ req: { user } }) => isStaff(user);

/** Rating/body/text content is immutable after create — no self-service edit, so a review's rating history can't be silently manipulated. Staff moderate by removal (`status`), not by editing someone's words. */
export const noUpdateAfterCreate: FieldAccess = () => false;

/** verification-requests — owner reads their own applications; staff read all. */
export const readOwnerOrStaff: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) return { owner: { equals: user.id } };
  return false;
};

/** verification-requests create — only the target profile's own owner may submit for it. */
export const createVerificationRequest: Access = async ({ req: { user, payload }, data }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user)) return false;
  const ownerId = await getProfileOwnerId(payload, data?.profile as PolymorphicRef);
  return ownerId !== null && ownerId === String(user.id);
};

/** reviews/recommendations create — any network account except the target profile's own owner (no self-review/self-recommendation), enforced at this actual access layer, not only the Server Action, per the PR #17 lesson already documented in access-profiles.ts. */
function createNonSelfContribution(): Access {
  return async ({ req: { user, payload }, data }) => {
    if (isStaff(user)) return true;
    if (!isNetworkAccount(user)) return false;
    const ownerId = await getProfileOwnerId(payload, data?.profile as PolymorphicRef);
    if (ownerId === null) return false;
    return ownerId !== String(user.id);
  };
}
export const createReview: Access = createNonSelfContribution();
export const createRecommendation: Access = createNonSelfContribution();

function readPublished(): Access {
  return ({ req: { user } }) => {
    if (isStaff(user)) return true;
    return { status: { equals: "published" } };
  };
}
export const readPublishedReview: Access = readPublished();
export const readPublishedRecommendation: Access = readPublished();

/** reviews update — staff, or the reviewed profile's own owner (reaching only `businessReply`/`repliedAt`, restricted further at the field level). The reviewer themselves has no legitimate field to update post-create (see `noUpdateAfterCreate`) — their only write path is `delete` (retract). */
export const updateReviewAccess: Access = async ({ req: { user, payload }, id }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user) || !id) return false;
  const doc = (await payload.findByID({ collection: "reviews", id, depth: 0, overrideAccess: true })) as { profile?: PolymorphicRef } | null;
  if (!doc) return false;
  const profileOwnerId = await getProfileOwnerId(payload, doc.profile);
  return profileOwnerId !== null && profileOwnerId === String(user.id);
};

/** A reviewer/recommender may delete (retract) their own contribution; staff may remove any. */
export const deleteOwnOrStaff: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) return { owner: { equals: user.id } };
  return false;
};

/** businessReply/repliedAt — settable only by the reviewed profile's own owner. */
export const businessReplyFieldAccess: FieldAccess = async ({ req: { user, payload }, doc }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user) || !doc) return false;
  const profileOwnerId = await getProfileOwnerId(payload, doc.profile as PolymorphicRef);
  return profileOwnerId !== null && profileOwnerId === String(user.id);
};

/** content-reports create — any authenticated account (network or staff); anonymous reporting is deliberately not allowed. */
export const createContentReport: Access = ({ req: { user } }) => isStaff(user) || isNetworkAccount(user);
