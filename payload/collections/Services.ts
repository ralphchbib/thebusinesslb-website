import type { CollectionConfig } from "payload";
import { adminOrEditor, adminOnly } from "../access";
import { revalidateAfterChange, revalidateAfterDelete } from "../hooks/revalidate";
import { siteConfig } from "@/lib/config";

const stringArrayField = (name: string, opts: { required?: boolean; minRows?: number } = {}) => ({
  name,
  type: "array" as const,
  required: opts.required,
  minRows: opts.minRows,
  fields: [{ name: "text", type: "text" as const, required: true }],
});

/**
 * Phase 5B — gains native draft/publish versioning, replacing the old
 * isPublished-checkbox-only model. See PHASE5B-DRAFT-WORKFLOW-PLAN.md and
 * PHASE5B-MIGRATION-PLAN.md for the full rationale; summary here:
 *
 * - `versions.drafts` + the `access.read` gate below are the exact same
 *   pattern already proven in production on Pages/CaseStudies (Phase 5A)
 *   and Testimonials — not a new mechanism.
 * - `isPublished` is deliberately KEPT (not removed) — see
 *   PHASE5B-MIGRATION-PLAN.md §2/§5. It's marked admin.readOnly so it
 *   can no longer drift from `_status`, but its existing data is left
 *   untouched in the database as a zero-cost rollback safety net.
 *   Nothing in application code reads it anymore — `_status` is the only
 *   source of truth for publish state going forward.
 */
export const Services: CollectionConfig = {
  slug: "services",
  admin: {
    useAsTitle: "h1",
    defaultColumns: ["h1", "slug", "_status", "order"],
    // Phase 5B — same "Preview" button pattern as Pages.ts/CaseStudies.ts;
    // see those files' comments for the full reasoning.
    preview: (doc) => {
      const secret = process.env.PREVIEW_SECRET;
      if (!secret || typeof doc?.slug !== "string") return null;
      return `${siteConfig.url}/api/draft?secret=${secret}&collection=services&slug=${encodeURIComponent(doc.slug)}`;
    },
  },
  versions: {
    drafts: true,
  },
  access: {
    // Same reasoning as Pages.ts/CaseStudies.ts/Testimonials.ts — see
    // those files. Closes a pre-existing gap: `read: anyone` previously
    // meant Payload's own access layer imposed no restriction at all,
    // relying solely on the app's own `isPublished` query filter to hide
    // unpublished records.
    read: ({ req: { user } }) => {
      if (user) return true;
      return { _status: { equals: "published" } };
    },
    create: adminOrEditor,
    update: adminOrEditor,
    delete: adminOnly,
  },
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  fields: [
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: { description: "URL segment — /services/{slug}/" },
    },
    {
      name: "isPublished",
      type: "checkbox",
      defaultValue: true,
      admin: {
        readOnly: true,
        description:
          "Deprecated — publish state is now controlled by the Save Draft / Publish buttons above. " +
          "Kept read-only for rollback safety; no longer read by the site.",
      },
    },
    { name: "order", type: "number", defaultValue: 0 },
    { name: "eyebrow", type: "text" },
    { name: "h1", type: "text", required: true },
    { name: "priceAnchor", type: "text", required: true, admin: { description: 'e.g. "From $900"' } },
    { name: "timelineSummary", type: "text", required: true },
    { name: "intro", type: "textarea", required: true },

    {
      name: "localProblem",
      type: "group",
      fields: [
        { name: "h2", type: "text" },
        { name: "intro", type: "textarea" },
        {
          name: "items",
          type: "array",
          fields: [
            { name: "title", type: "text", required: true },
            { name: "body", type: "textarea", required: true },
          ],
        },
        { name: "note", type: "textarea" },
      ],
    },

    {
      name: "packages",
      type: "array",
      required: true,
      minRows: 1,
      fields: [
        { name: "name", type: "text", required: true },
        { name: "priceDisplay", type: "text", required: true },
        { name: "summary", type: "textarea", required: true },
        stringArrayField("inclusions", { required: true, minRows: 1 }),
        { name: "isRecommended", type: "checkbox", defaultValue: false },
      ],
    },

    stringArrayField("inclusions"),
    stringArrayField("exclusions", { required: true, minRows: 1 }),
    stringArrayField("clientProvides"),

    {
      name: "timeline",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "body", type: "textarea", required: true },
      ],
    },

    {
      name: "afterLaunch",
      type: "group",
      fields: [
        { name: "h2", type: "text" },
        { name: "body", type: "textarea" },
      ],
    },

    {
      name: "relatedServices",
      type: "relationship",
      relationTo: "services",
      hasMany: true,
      minRows: 3,
      maxRows: 3,
      admin: { description: "Exactly 3 — matches the existing site rule." },
    },

    { name: "metaTitle", type: "text", required: true, maxLength: 60 },
    { name: "metaDescription", type: "textarea", required: true, maxLength: 155 },
    {
      name: "ogImage",
      type: "upload",
      relationTo: "media",
      admin: { description: "Optional. Leave blank to use the site default social-share image." },
    },
  ],
};
