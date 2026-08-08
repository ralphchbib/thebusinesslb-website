import type { Block } from "payload";

/**
 * Phase 6B — trust-building logo strip for cold-traffic landing pages
 * (campaign/industry/location). Deliberately a plain array of uploads
 * rather than a relationship to Testimonials.logo — keeps this block Low
 * complexity for v1 (no getXByIds resolver needed); a "pull from featured
 * Testimonials automatically" variant is a plausible fast-follow, not
 * required for MVP. See PHASE6B-BLOCK-GAP-ANALYSIS.md §2.
 */
export const LogoCloudBlock: Block = {
  slug: "logoCloud",
  labels: { singular: "Logo Cloud", plural: "Logo Cloud Blocks" },
  fields: [
    {
      name: "isVisible",
      type: "checkbox",
      defaultValue: true,
      admin: { description: "Uncheck to hide this section without deleting it." },
    },
    { name: "eyebrow", type: "text" },
    { name: "h2", type: "text" },
    {
      name: "logos",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "Logo", plural: "Logos" },
      fields: [
        { name: "logo", type: "upload", relationTo: "media", required: true },
        { name: "name", type: "text", required: true, admin: { description: "Company name, used as a fallback label." } },
        { name: "href", type: "text", admin: { description: "Optional — client's website URL." } },
      ],
    },
  ],
};
