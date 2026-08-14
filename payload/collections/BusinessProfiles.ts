import type { CollectionConfig } from "payload";
import { readPublishedOrOwnerOrStaff, createBusinessProfile, updateOrDeleteByOwnerOrStaff } from "../access-profiles";
import { staffOnlyTrustField } from "../access-trust";
import { LANGUAGE_OPTIONS } from "../language-options";

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
    create: createBusinessProfile,
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
    {
      name: "category",
      type: "text",
      admin: { description: "Optional, finer-grained than industry — e.g. \"Restaurant\" within \"Food & Beverage\". Phase 9C directory filter." },
    },
    { name: "location", type: "text" },
    {
      name: "languages",
      type: "select",
      hasMany: true,
      options: LANGUAGE_OPTIONS as unknown as { label: string; value: string }[],
      admin: { description: "Phase 9C directory filter." },
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
    {
      name: "socialLinks",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "url", type: "text", required: true },
      ],
    },
    {
      name: "verified",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Phase 10 — set only by an approved verification-requests document. Never client-editable." },
      access: { update: staffOnlyTrustField },
    },
    {
      name: "verifiedAt",
      type: "date",
      access: { update: staffOnlyTrustField },
    },
  ],
};
