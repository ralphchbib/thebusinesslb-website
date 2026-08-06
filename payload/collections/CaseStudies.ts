import type { CollectionConfig } from "payload";
import { adminOrEditor, adminOnly } from "../access";
import { revalidateAfterChange, revalidateAfterDelete } from "../hooks/revalidate";
import { isReservedSlug } from "@/lib/cms/reserved-slugs";
import { sectorOptions } from "@/lib/validation/schemas";

/**
 * In-depth client success stories. Each gets its own page at
 * /case-studies/{slug}/ (app/(app)/case-studies/[slug]/page.tsx) and a
 * listing at /case-studies/ — both new literal routes, which is why
 * "case-studies" was added to lib/cms/reserved-slugs.ts's RESERVED_SLUGS
 * (the individual [slug] detail pages are nested under that literal
 * segment, so — like /services/[slug]/ and /insights/[slug]/ before them —
 * they can never collide with the Pages catch-all; only the bare
 * "case-studies" hub segment needed to be added).
 *
 * Revalidation reuses the same site-wide hooks as Testimonials/Services —
 * see the comment in Testimonials.ts for why. Case studies are cross-
 * referenced from service pages (via servicesUsed) and can appear in a
 * Pages block, so a narrower page-scoped approach (like Pages.ts itself
 * uses) would risk missing exactly the kind of cross-reference that
 * matters here.
 */
export const CaseStudies: CollectionConfig = {
  slug: "case-studies",
  labels: { singular: "Case Study", plural: "Case Studies" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "clientName", "featured", "_status"],
    description: "In-depth client success stories — each gets its own page at /case-studies/{slug}/.",
  },
  versions: {
    drafts: true,
  },
  access: {
    // Same reasoning as Pages.ts and Testimonials.ts — see those files.
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
    { name: "title", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: { description: "URL segment — /case-studies/{slug}/. Cannot be a path already used by the site." },
      validate: (value: string | null | undefined) => {
        if (!value) return "Slug is required.";
        if (isReservedSlug(value)) {
          return `"${value}" is already used by an existing page on the site and can't be reused here.`;
        }
        return true;
      },
    },
    { name: "clientName", type: "text", required: true },
    { name: "industry", type: "select", options: [...sectorOptions] },
    {
      name: "servicesUsed",
      type: "relationship",
      relationTo: "services",
      hasMany: true,
      admin: { description: "Which of our services this case study is about — powers 'related case studies' on those service pages." },
    },
    { name: "challenge", type: "textarea", required: true, admin: { description: "What problem the client had before working with us." } },
    { name: "solution", type: "textarea", required: true, admin: { description: "What we actually did." } },
    {
      name: "results",
      type: "array",
      admin: {
        description: 'Quantifiable outcomes, e.g. metric "Online orders", value "+40%". Shown as a stat grid — keep it short, 3-4 is plenty.',
      },
      fields: [
        { name: "metric", type: "text", required: true },
        { name: "value", type: "text", required: true },
      ],
    },
    {
      name: "testimonial",
      type: "relationship",
      relationTo: "testimonials",
      admin: { description: "Optional — link the client quote that supports this case study." },
    },
    {
      name: "featuredImage",
      type: "text",
      admin: { description: "Path or URL to the main image for this case study." },
    },
    {
      name: "gallery",
      type: "array",
      admin: { description: "Additional images, optional." },
      fields: [{ name: "image", type: "text", required: true }],
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Featured case studies are the ones shown automatically on the case studies hub and by the " +
          "Case Studies block when none are specifically picked.",
      },
    },
    { name: "seoTitle", type: "text", required: true, maxLength: 60 },
    { name: "seoDescription", type: "textarea", required: true, maxLength: 155 },
  ],
};
