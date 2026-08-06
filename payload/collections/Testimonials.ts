import type { CollectionConfig } from "payload";
import { adminOrEditor, adminOnly } from "../access";
import { revalidateAfterChange, revalidateAfterDelete } from "../hooks/revalidate";
import { sectorOptions } from "@/lib/validation/schemas";

/**
 * Client quotes. Consumed by: the FeaturedTestimonials section on service
 * pages (app/(app)/services/[slug]/page.tsx), and the optional Testimonials
 * block on Pages (payload/blocks/Testimonials.ts) for landing pages. The
 * homepage integration mentioned in the Phase 3 brief is explicitly marked
 * "(future)" there and is not wired up here.
 *
 * Revalidation deliberately reuses the same site-wide hooks Services/
 * Articles/FAQs/Navigation use (revalidateAfterChange/revalidateAfterDelete
 * from payload/hooks/revalidate.ts) rather than a narrower page-scoped
 * approach like Pages has. Testimonials don't own a single URL the way a
 * Page does — the same testimonial can appear on many service pages and
 * landing pages simultaneously, so precisely tracking which pages
 * reference a given testimonial isn't practical, for the identical reason
 * Services already uses the broad hook.
 */
export const Testimonials: CollectionConfig = {
  slug: "testimonials",
  labels: { singular: "Testimonial", plural: "Testimonials" },
  admin: {
    useAsTitle: "clientName",
    defaultColumns: ["clientName", "companyName", "rating", "featured", "_status"],
    description:
      "Client quotes shown on service pages and (optionally) landing pages. Mark a testimonial " +
      "Featured to have it appear automatically without needing to pick it on every page.",
  },
  // Native draft/publish workflow, same reasoning as Pages: editors can
  // save a testimonial without it going live, and explicitly Publish when
  // ready — worth having here since testimonials are quoted, attributed
  // client statements, not internal copy.
  versions: {
    drafts: true,
  },
  access: {
    // Same structural requirement as Pages.ts — Payload's draft system
    // does not gate `?draft=true` reads through a separate access rule
    // (confirmed via node_modules/payload/dist/collections/operations/
    // find.js during the Pages foundation work), so anonymous requests
    // must be explicitly scoped to published documents only.
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
    { name: "clientName", type: "text", required: true },
    { name: "companyName", type: "text" },
    {
      name: "position",
      type: "text",
      admin: { description: 'Job title, e.g. "Owner" or "Marketing Manager".' },
    },
    {
      name: "industry",
      type: "select",
      options: [...sectorOptions],
      admin: { description: "Optional — lets a future landing page filter testimonials by industry." },
    },
    { name: "quote", type: "textarea", required: true, maxLength: 500 },
    {
      name: "rating",
      type: "number",
      required: true,
      min: 1,
      max: 5,
      defaultValue: 5,
      admin: { description: "1–5 stars." },
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Featured testimonials are the ones shown automatically on service pages and by the " +
          "Testimonials block when no specific testimonials are picked.",
      },
    },
    {
      name: "logo",
      type: "text",
      admin: { description: "Path or URL to the client's logo image, if available." },
    },
    { name: "website", type: "text", admin: { description: "Client's website URL, optional." } },
    {
      name: "displayOrder",
      type: "number",
      defaultValue: 0,
      admin: { description: "Lower numbers show first." },
    },
  ],
};
