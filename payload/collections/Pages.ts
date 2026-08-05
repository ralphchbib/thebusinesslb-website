import type { CollectionConfig } from "payload";
import { adminOrEditor, adminOnly } from "../access";
import { revalidatePageAfterChange, revalidatePageAfterDelete } from "../hooks/revalidate";
import { HeroBlock } from "../blocks/Hero";
import { TextBlock } from "../blocks/Text";
import { CtaBlock } from "../blocks/Cta";

/**
 * Single-segment paths already served by app/(app)/* (or by the (payload)
 * route group). A page using one of these slugs would save successfully
 * but could never be reached — Next.js always resolves a literal route
 * over the app/(app)/[slug]/page.tsx catch-all — so this is blocked at
 * save time rather than letting an editor discover it by trial and error.
 */
const RESERVED_SLUGS = new Set([
  "services",
  "insights",
  "pricing",
  "about",
  "contact",
  "digital-assessment",
  "privacy-policy",
  "terms",
  "thank-you",
  "admin",
  "api",
]);

/**
 * Phase 2 foundation only — Hero, Text, and Cta are deliberately the only
 * 3 block types. See PHASE2-ARCHITECTURE.md §3 for the full block-library
 * plan and why the richText-based "Rich Content" block specifically is
 * not part of this foundation (§7.1 — gated on a separate compatibility
 * spike, since Phase 1 removed richText after it broke Payload's CLI
 * under Node 24).
 */
export const Pages: CollectionConfig = {
  slug: "pages",
  labels: { singular: "Page", plural: "Pages" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "pageType", "_status"],
    description:
      "Landing, campaign, and seasonal pages — separate from the site's core Services, Articles, FAQs, Navigation, and Site Settings content.",
  },
  // Native draft/publish workflow: editors can save work without it going
  // live, then explicitly Publish when ready. See the access.read note
  // below — this requires care that the other 5 collections don't, since
  // Payload doesn't gate draft reads through a separate access rule.
  versions: {
    drafts: true,
  },
  access: {
    // Payload's draft system does NOT gate `?draft=true` reads through a
    // separate access rule — find.js (node_modules/payload/dist/
    // collections/operations/find.js) uses this exact same `read`
    // function regardless of draft state. Anonymous requests are
    // therefore explicitly scoped to published documents only; logged-in
    // admin/editor users (who need to see draft work in the admin panel)
    // get unrestricted read access. Getting this wrong would make
    // unpublished pages publicly readable before they're meant to be.
    read: ({ req: { user } }) => {
      if (user) return true;
      return { _status: { equals: "published" } };
    },
    create: adminOrEditor,
    update: adminOrEditor,
    delete: adminOnly,
  },
  hooks: {
    afterChange: [revalidatePageAfterChange],
    afterDelete: [revalidatePageAfterDelete],
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: { description: "URL segment — /{slug}/. Cannot be a path already used by the site." },
      validate: (value: string | null | undefined) => {
        if (!value) return "Slug is required.";
        if (RESERVED_SLUGS.has(value.toLowerCase())) {
          return `"${value}" is already used by an existing page on the site and can't be reused here.`;
        }
        return true;
      },
    },
    {
      name: "pageType",
      type: "select",
      required: true,
      defaultValue: "landing",
      options: [
        { label: "Landing page", value: "landing" },
        { label: "Campaign page", value: "campaign" },
        { label: "Seasonal page", value: "seasonal" },
      ],
    },
    { name: "seoTitle", type: "text", required: true, maxLength: 60 },
    { name: "seoDescription", type: "textarea", required: true, maxLength: 155 },
    {
      name: "blocks",
      type: "blocks",
      minRows: 1,
      blocks: [HeroBlock, TextBlock, CtaBlock],
    },
  ],
};
