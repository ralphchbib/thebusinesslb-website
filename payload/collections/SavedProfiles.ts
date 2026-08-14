import type { CollectionConfig } from "payload";
import { createSavedProfile, readOwnSocialRecord, deleteOwnSocialRecord, denyUpdate } from "../access-social";

/**
 * Phase 11 — a private bookmark on a Business/Professional profile.
 * Absorbs "Favorites" and "Bookmarks" from the user's requested item list
 * into this one primitive (PHASE11-TECHNICAL-DESIGN.md §B): no Blueprint
 * text distinguishes a "favorite" from a "save", and until a second
 * bookmarkable content type exists, a separate mechanism would just be
 * the same action under a different name.
 *
 * `profileKey` derivation and the compound unique index are the exact
 * pattern Reviews.ts/Recommendations.ts already proved correct in Phase
 * 10 production (real DB-level duplicate rejection, not just an app-level
 * check) — see Reviews.ts's top comment for the full reasoning.
 */
export const SavedProfiles: CollectionConfig = {
  slug: "saved-profiles",
  labels: { singular: "Saved Profile", plural: "Saved Profiles" },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["owner", "profile", "createdAt"],
  },
  indexes: [{ fields: ["owner", "profileKey"], unique: true }],
  access: {
    read: readOwnSocialRecord,
    create: createSavedProfile,
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
      admin: { description: "Who saved this profile — set once at creation, never client-editable after." },
    },
    {
      name: "profile",
      type: "relationship",
      relationTo: ["business-profiles", "professional-profiles"],
      required: true,
      admin: { description: "The profile being saved. Self-saving one's own profile is allowed — see access-social.ts." },
    },
    { name: "profileKey", type: "text", admin: { hidden: true } },
  ],
};
