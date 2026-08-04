import type { CollectionConfig } from "payload";
import { anyone, adminOrEditor, adminOnly } from "../access";
import { revalidateAfterChange, revalidateAfterDelete } from "../hooks/revalidate";

const stringArrayField = (name: string, opts: { required?: boolean; minRows?: number } = {}) => ({
  name,
  type: "array" as const,
  required: opts.required,
  minRows: opts.minRows,
  fields: [{ name: "text", type: "text" as const, required: true }],
});

export const Services: CollectionConfig = {
  slug: "services",
  admin: {
    useAsTitle: "h1",
    defaultColumns: ["h1", "slug", "isPublished", "order"],
  },
  access: {
    read: anyone,
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
    { name: "isPublished", type: "checkbox", defaultValue: true },
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
  ],
};
