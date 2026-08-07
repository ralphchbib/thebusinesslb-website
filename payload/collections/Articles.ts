import type { CollectionConfig } from "payload";
import { adminOrEditor, adminOnly } from "../access";
import { revalidateAfterChange, revalidateAfterDelete } from "../hooks/revalidate";
import { siteConfig } from "@/lib/config";

/**
 * Phase 5B — gains native draft/publish versioning. See the equivalent
 * comment in Services.ts for the full rationale (same pattern, same
 * isPublished-retirement approach); Articles is the simpler of the two
 * since nothing else in the schema references `articles` (confirmed via
 * PHASE5B-ARCHITECTURE-REVIEW.md §4 — zero inbound relationships).
 */
export const Articles: CollectionConfig = {
  slug: "articles",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "topic", "_status", "publishedAt"],
    // Phase 5B — same "Preview" button pattern as Pages.ts/CaseStudies.ts.
    preview: (doc) => {
      const secret = process.env.PREVIEW_SECRET;
      if (!secret || typeof doc?.slug !== "string") return null;
      return `${siteConfig.url}/api/draft?secret=${secret}&collection=articles&slug=${encodeURIComponent(doc.slug)}`;
    },
  },
  versions: {
    drafts: true,
  },
  access: {
    // Same reasoning as Pages.ts/CaseStudies.ts/Testimonials.ts/Services.ts.
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
      admin: { description: "URL segment — /insights/{slug}/" },
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
    { name: "title", type: "text", required: true },
    { name: "excerpt", type: "textarea", required: true },
    {
      name: "topic",
      type: "select",
      required: true,
      options: [
        { label: "E-commerce", value: "ecommerce" },
        { label: "Websites", value: "websites" },
        { label: "Social", value: "social" },
        { label: "AI", value: "ai" },
        { label: "Strategy", value: "strategy" },
        { label: "Lebanon business", value: "lebanon-business" },
      ],
    },
    { name: "publishedAt", type: "date", required: true },
    {
      name: "readingMinutes",
      type: "number",
      admin: { description: "Leave blank to auto-estimate from word count." },
    },
    {
      name: "body",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "Block", plural: "Blocks" },
      fields: [
        {
          name: "blockType",
          type: "select",
          required: true,
          defaultValue: "paragraph",
          options: [
            { label: "Paragraph", value: "paragraph" },
            { label: "Heading", value: "heading" },
            { label: "Bulleted list", value: "list" },
          ],
        },
        {
          name: "text",
          type: "textarea",
          admin: {
            condition: (_, siblingData) => siblingData?.blockType !== "list",
          },
        },
        {
          name: "items",
          type: "array",
          admin: {
            condition: (_, siblingData) => siblingData?.blockType === "list",
          },
          fields: [{ name: "text", type: "text", required: true }],
        },
      ],
    },
    {
      name: "relatedServices",
      type: "relationship",
      relationTo: "services",
      hasMany: true,
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
