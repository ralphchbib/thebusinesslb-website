import type { Block } from "payload";

/**
 * Phase 6B — "How it works" step list. Field shape copied verbatim from
 * Homepage.processSteps (payload/globals/Homepage.ts), already proven in
 * production — this is the lowest-risk block in the Phase 6B set, purely
 * reusing an existing, working pattern on a new surface. Covers both
 * "Process" and "Timeline" from the brief's block list — one block, not
 * two, since they're the same shape. See PHASE6B-BLOCK-GAP-ANALYSIS.md §5.
 */
export const ProcessBlock: Block = {
  slug: "process",
  labels: { singular: "Process", plural: "Process Blocks" },
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
      name: "steps",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "Step", plural: "Steps" },
      fields: [
        {
          name: "number",
          type: "text",
          required: true,
          admin: { description: 'e.g. "01" — plain text, not auto-generated.' },
        },
        { name: "name", type: "text", required: true },
        { name: "body", type: "textarea", required: true },
      ],
    },
  ],
};
