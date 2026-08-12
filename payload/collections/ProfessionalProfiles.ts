import type { CollectionConfig } from "payload";
import { readPublishedOrOwnerOrStaff, createProfessionalProfile, updateOrDeleteByOwnerOrStaff } from "../access-profiles";

/**
 * Phase 9B — a Professional-account's public profile. Same shape and
 * reasoning as BusinessProfiles.ts (one per account, enforced in the
 * Server Action; draft/publish via versions.drafts).
 */
export const ProfessionalProfiles: CollectionConfig = {
  slug: "professional-profiles",
  labels: { singular: "Professional Profile", plural: "Professional Profiles" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "title", "slug", "_status"],
  },
  versions: {
    drafts: true,
  },
  access: {
    read: readPublishedOrOwnerOrStaff,
    create: createProfessionalProfile,
    update: updateOrDeleteByOwnerOrStaff,
    delete: updateOrDeleteByOwnerOrStaff,
  },
  fields: [
    {
      name: "owner",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      admin: { description: "Set once at creation from the logged-in account. Never client-editable after." },
    },
    { name: "name", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: { description: "URL segment — /network/professionals/{slug}." },
      validate: (value: string | null | undefined) => {
        if (!value) return "Slug is required.";
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
          return "Use lowercase letters, numbers, and hyphens only.";
        }
        return true;
      },
    },
    { name: "photo", type: "upload", relationTo: "media" },
    { name: "title", type: "text", required: true },
    { name: "bio", type: "textarea", required: true },
    {
      name: "skills",
      type: "array",
      fields: [{ name: "skill", type: "text", required: true }],
    },
    {
      name: "experience",
      type: "array",
      fields: [
        { name: "role", type: "text", required: true },
        { name: "company", type: "text" },
        { name: "description", type: "textarea" },
      ],
    },
    {
      name: "services",
      type: "array",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "description", type: "textarea" },
      ],
    },
    { name: "contactEmail", type: "text" },
    { name: "contactPhone", type: "text" },
  ],
};
