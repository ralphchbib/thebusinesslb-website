import type { CollectionConfig } from "payload";
import {
  readPublishedReview,
  createReview,
  updateReviewAccess,
  deleteOwnOrStaff,
  businessReplyFieldAccess,
  staffOnlyTrustField,
  noUpdateAfterCreate,
} from "../access-trust";

/**
 * Phase 10 — rated, public reviews on Business/Professional profiles.
 *
 * `profileKey` is a derived, hidden text field (`${relationTo}:${value}`,
 * set in `beforeChange` from the polymorphic `profile` relationship) that
 * exists for exactly two reasons, both to avoid querying/indexing the
 * polymorphic `profile` field directly — a pattern this codebase has
 * already deliberately avoided once before (see `payload/access-profiles.ts`'s
 * top comment: portfolio-projects queries by flat `owner` rather than the
 * polymorphic `profile` field, "since nested-field queries into a
 * polymorphic relationship's target document are exactly the kind of
 * unverified mechanism this project's 'verify, don't trust' discipline
 * says to avoid when a simpler, already-proven pattern... does the same
 * job with no new risk"):
 *
 * 1. A real, DB-level compound unique index on (`owner`, `profileKey`) —
 *    Payload's polymorphic relationships are stored in a separate `_rels`
 *    join table, not a plain column, so a compound index naming `profile`
 *    directly would not produce the constraint PHASE10-TECHNICAL-DESIGN.md
 *    §C called for. `profileKey` is a plain text column, so the index
 *    works exactly like `network-accounts.email`'s existing `unique: true`.
 * 2. Querying "all reviews for this profile" (for the trust-summary
 *    average/count) via a plain-field `where: { profileKey: { equals } }`
 *    instead of an unverified polymorphic-field query.
 */
export const Reviews: CollectionConfig = {
  slug: "reviews",
  labels: { singular: "Review", plural: "Reviews" },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["profile", "rating", "owner", "status"],
  },
  indexes: [{ fields: ["owner", "profileKey"], unique: true }],
  access: {
    read: readPublishedReview,
    create: createReview,
    update: updateReviewAccess,
    delete: deleteOwnOrStaff,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data?.profile?.relationTo && data?.profile?.value) {
          data.profileKey = `${data.profile.relationTo}:${data.profile.value}`;
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "owner",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      admin: { description: "The reviewer — set once at creation, never client-editable after." },
    },
    {
      name: "profile",
      type: "relationship",
      relationTo: ["business-profiles", "professional-profiles"],
      required: true,
      admin: { description: "The profile being reviewed." },
    },
    { name: "profileKey", type: "text", admin: { hidden: true } },
    {
      name: "rating",
      type: "number",
      required: true,
      min: 1,
      max: 5,
      access: { update: noUpdateAfterCreate },
    },
    {
      name: "body",
      type: "textarea",
      required: true,
      access: { update: noUpdateAfterCreate },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "published",
      options: [
        { label: "Published", value: "published" },
        { label: "Removed", value: "removed" },
      ],
      access: { update: staffOnlyTrustField },
    },
    {
      name: "businessReply",
      type: "textarea",
      admin: { description: "Settable only by the reviewed profile's owner, once." },
      access: { update: businessReplyFieldAccess },
    },
    { name: "repliedAt", type: "date", access: { update: businessReplyFieldAccess } },
  ],
};
