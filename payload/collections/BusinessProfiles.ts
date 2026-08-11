import type { CollectionConfig } from "payload";
import { readPublishedOrOwnerOrStaff, createByNetworkAccount, updateOrDeleteByOwnerOrStaff } from "../access-profiles";

/**
 * Phase 9B — a Business-account's public profile. Owned by exactly one
 * network-accounts document (accountType: "business"); one profile per
 * account, enforced in the Server Action (lib/network/profile-actions.ts),
 * not the database — see PHASE9B-TECHNICAL-DESIGN.md §D for why.
 *
 * Draft/publish reuses the exact `versions: { drafts: true }` mechanism
 * already proven on Pages/CaseStudies — the `_status` field it adds is
 * what readPublishedOrOwnerOrStaff checks.
 */
export const BusinessProfiles: CollectionConfig = {
  slug: "business-profiles",
  labels: { singular: "Business Profile", plural: "Business Profiles" },
  admin: {
    useAsTitle: "companyName",
    defaultColumns: ["companyName", "slug", "_status"],
  },
  versions: {
    drafts: true,
  },
  access: {
    read: readPublishedOrOwnerOrStaff,
    create: createByNetworkAccount,
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
    { name: "companyName", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: { description: "URL segment — /network/businesses/{slug}." },
      validate: (value: string | null | undefined) => {
        if (!value) return "Slug is required.";
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
          return "Use lowercase letters, numbers, and hyphens only.";
        }
        return true;
      },
    },
    { name: "logo", type: "upload", relationTo: "media" },
    { name: "description", type: "textarea", required: true },
    { name: "industry", type: "text" },
    { name: "location", type: "text" },
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
    {
      name: "socialLinks",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "url", type: "text", required: true },
      ],
    },
  ],
};
