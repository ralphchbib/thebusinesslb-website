import type { CollectionConfig } from "payload";
import { readPublishedOrOwnerOrStaff, createProfessionalProfile, updateOrDeleteByOwnerOrStaff } from "../access-profiles";
import { staffOnlyTrustField } from "../access-trust";
import { LANGUAGE_OPTIONS } from "../language-options";
import { assertSponsoredVisibilityEligibility } from "../entitlements";

/**
 * Phase 9B — a Professional-account's public profile. Same shape and
 * reasoning as BusinessProfiles.ts (one per account, enforced in the
 * Server Action; draft/publish via versions.drafts) — including Phase
 * 19's `sponsored` field and its owner-entitlement hook, see that file's
 * own comment for why.
 */
export const ProfessionalProfiles: CollectionConfig = {
  slug: "professional-profiles",
  labels: { singular: "Professional Profile", plural: "Professional Profiles" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "title", "slug", "_status", "sponsored"],
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
  hooks: {
    beforeValidate: [
      // Phase 19 — see BusinessProfiles.ts's identical hook for the full
      // reasoning; duplicated rather than shared across collections
      // because Payload hooks are collection-scoped, not because the logic
      // itself differs.
      async ({ data, req, originalDoc }) => {
        if (!data) return data;
        const nextSponsored = data.sponsored;
        const prevSponsored = (originalDoc as { sponsored?: boolean } | undefined)?.sponsored ?? false;
        if (nextSponsored === undefined || nextSponsored === prevSponsored) return data;
        if (nextSponsored === false) {
          data.sponsoredAt = null;
          return data;
        }
        const ownerId = data.owner ?? (originalDoc as { owner?: unknown } | undefined)?.owner;
        await assertSponsoredVisibilityEligibility({ req, ownerId });
        data.sponsoredAt = new Date().toISOString();
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
    {
      name: "category",
      type: "text",
      admin: { description: "Optional, finer-grained than title — e.g. \"Corporate Lawyer\" within \"Legal\". Phase 9C directory filter." },
    },
    { name: "location", type: "text" },
    { name: "bio", type: "textarea", required: true },
    {
      name: "languages",
      type: "select",
      hasMany: true,
      options: LANGUAGE_OPTIONS as unknown as { label: string; value: string }[],
      admin: { description: "Phase 9C directory filter." },
    },
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
    {
      name: "sponsored",
      type: "checkbox",
      defaultValue: false,
      access: { update: staffOnlyTrustField },
      admin: {
        description: "Phase 19 — Blueprint §44 \"Visibility Revenue\" / Blueprint §56 \"Sponsored placement must be visibly labeled.\" Staff-set only, and only when the owner's own plan includes the `visibility.sponsoredVisibility` entitlement (re-verified server-side on every change). Rendered with a visible \"Sponsored\" badge wherever this profile appears in a directory listing — never a silent ranking boost.",
      },
    },
    {
      name: "sponsoredAt",
      type: "date",
      access: { update: () => false },
      admin: { description: "Set automatically when `sponsored` is turned on above — never client-writable directly, including by staff. Audit trail." },
    },
  ],
};
