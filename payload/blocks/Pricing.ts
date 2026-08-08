import type { Block } from "payload";

/**
 * Phase 6B — standalone landing-page pricing block. Deliberately NOT a
 * relationship into Services.packages: keeping it a self-contained array
 * (same shape as Services.packages, independently authored) is Low-
 * complexity for v1 and avoids a landing page's pricing silently changing
 * out from under a live campaign if the underlying Service is edited.
 * The relationship-based "always in sync with the real Service" design is
 * a plausible fast-follow once real content-drift pain is observed, not
 * before — see PHASE6B-BLOCK-GAP-ANALYSIS.md §4.
 */
export const PricingBlock: Block = {
  slug: "pricing",
  labels: { singular: "Pricing", plural: "Pricing Blocks" },
  fields: [
    {
      name: "isVisible",
      type: "checkbox",
      defaultValue: true,
      admin: { description: "Uncheck to hide this section without deleting it." },
    },
    { name: "eyebrow", type: "text" },
    { name: "h2", type: "text" },
    { name: "intro", type: "textarea" },
    {
      name: "tiers",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "Tier", plural: "Tiers" },
      fields: [
        { name: "name", type: "text", required: true },
        { name: "priceDisplay", type: "text", required: true, admin: { description: 'e.g. "From $900" or "$1,200/mo".' } },
        {
          name: "priceValueUSD",
          type: "number",
          admin: {
            description:
              "Optional, structured-data only — a plain number (e.g. 900), no currency symbol or text. " +
              "Powers this tier's Offer/Product schema.org markup (see PHASE6B-SEO-STRATEGY.md §4). Leave " +
              "blank for \"From\"/\"Custom quote\"-style tiers with no single clean number — those tiers " +
              "simply won't get Offer schema, which is correct (fabricating a number would be invalid " +
              "structured data).",
          },
        },
        { name: "summary", type: "textarea" },
        {
          name: "features",
          type: "array",
          required: true,
          minRows: 1,
          fields: [{ name: "text", type: "text", required: true }],
        },
        { name: "isRecommended", type: "checkbox", defaultValue: false },
        { name: "ctaLabel", type: "text", defaultValue: "Get started" },
        {
          name: "ctaHref",
          type: "text",
          admin: { description: "Internal path (e.g. /contact/) or full URL. Leave blank to hide the button." },
        },
      ],
    },
  ],
};
