import type { Block } from "payload";

/**
 * Phase 6B — structured "what you get" grid (icon + heading + body per
 * item), filling the gap between a plain bulleted list (RichContent's
 * list entries have no per-item heading/icon) and a full custom layout.
 * `icon` is a curated select, not free text — see
 * components/blocks/page/feature-grid-block.tsx for the fixed name->
 * lucide-react component map this constrains against; an arbitrary string
 * would risk silently rendering nothing for a typo'd icon name.
 */
export const FeatureGridBlock: Block = {
  slug: "featureGrid",
  labels: { singular: "Feature Grid", plural: "Feature Grid Blocks" },
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
      name: "features",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "Feature", plural: "Features" },
      fields: [
        {
          name: "icon",
          type: "select",
          defaultValue: "check",
          options: [
            { label: "Check", value: "check" },
            { label: "Star", value: "star" },
            { label: "Zap (speed)", value: "zap" },
            { label: "Shield (trust/security)", value: "shield" },
            { label: "Rocket (growth)", value: "rocket" },
            { label: "Users (team/audience)", value: "users" },
            { label: "Target (goals)", value: "target" },
            { label: "Trending up (results)", value: "trending-up" },
          ],
        },
        { name: "heading", type: "text", required: true },
        { name: "body", type: "textarea", required: true },
      ],
    },
  ],
};
