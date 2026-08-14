import type { CollectionConfig } from "payload";
import { createFollow, readOwnSocialRecord, deleteOwnSocialRecord, denyUpdate } from "../access-social";

/**
 * Phase 11 — following a Business/Professional profile for updates
 * (PHASE11-TECHNICAL-DESIGN.md §I). Structurally identical to
 * SavedProfiles.ts, but a separate collection rather than the same one
 * with a `kind` field: self-targeting is blocked here (unlike saving,
 * following has a real gaming incentive — inflating your own follower
 * count — see the design doc §D for why two simple, non-branching access
 * functions were chosen over one collection with branching access logic).
 */
export const Follows: CollectionConfig = {
  slug: "follows",
  labels: { singular: "Follow", plural: "Follows" },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["owner", "profile", "createdAt"],
  },
  indexes: [{ fields: ["owner", "profileKey"], unique: true }],
  access: {
    read: readOwnSocialRecord,
    create: createFollow,
    update: denyUpdate,
    delete: deleteOwnSocialRecord,
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
      admin: { description: "Who is following — set once at creation, never client-editable after." },
    },
    {
      name: "profile",
      type: "relationship",
      relationTo: ["business-profiles", "professional-profiles"],
      required: true,
      admin: { description: "The profile being followed. Self-following is blocked at the access-control layer." },
    },
    { name: "profileKey", type: "text", admin: { hidden: true } },
  ],
};
