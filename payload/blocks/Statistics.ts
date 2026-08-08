import type { Block } from "payload";

/**
 * Phase 6B — "Stats strip." Concrete proof-points (e.g. "40+ businesses
 * launched") shown as a row of number+label pairs. Plain array, no
 * relationships — the same shape as CaseStudies.results (metric/value),
 * already proven in production. See PHASE6B-BLOCK-GAP-ANALYSIS.md §1.
 */
export const StatisticsBlock: Block = {
  slug: "statistics",
  labels: { singular: "Statistics", plural: "Statistics Blocks" },
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
      name: "stats",
      type: "array",
      required: true,
      minRows: 1,
      maxRows: 6,
      labels: { singular: "Stat", plural: "Stats" },
      fields: [
        { name: "value", type: "text", required: true, admin: { description: 'e.g. "40+", "3.2x", "98%".' } },
        { name: "label", type: "text", required: true, admin: { description: 'e.g. "Businesses launched".' } },
      ],
    },
  ],
};
