import type { CollectionConfig } from "payload";
import {
  readPublishedRecommendation,
  createRecommendation,
  staffOnlyUpdate,
  deleteOwnOrStaff,
  staffOnlyTrustField,
  noUpdateAfterCreate,
} from "../access-trust";

/**
 * Phase 10 — unrated, qualitative endorsements on Business/Professional
 * profiles (Blueprint §13's distinction from star-rated Reviews — e.g. a
 * business recommending a supplier, or a client recommending a
 * professional). Same `profileKey` derivation as Reviews.ts, for the same
 * two reasons (real DB-level uniqueness + queryable-by-profile without an
 * unverified polymorphic-field query) — see that file's comment.
 */
export const Recommendations: CollectionConfig = {
  slug: "recommendations",
  labels: { singular: "Recommendation", plural: "Recommendations" },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["profile", "owner", "status"],
  },
  indexes: [{ fields: ["owner", "profileKey"], unique: true }],
  access: {
    read: readPublishedRecommendation,
    create: createRecommendation,
    update: staffOnlyUpdate,
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
      admin: { description: "The recommender — set once at creation, never client-editable after." },
    },
    {
      name: "profile",
      type: "relationship",
      relationTo: ["business-profiles", "professional-profiles"],
      required: true,
      admin: { description: "The profile being recommended." },
    },
    { name: "profileKey", type: "text", admin: { hidden: true } },
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
  ],
};
