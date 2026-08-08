import type { Block } from "payload";

/**
 * Phase 6B — deliberately fixed at 2 columns ("Us" vs. "Everyone else" by
 * default, both labels editable) rather than a generic N-column table.
 * A generic design would let an editor delete a row without deleting its
 * corresponding per-column values, silently misaligning the table — the
 * fixed 2-column, per-row {label, usValue, otherValue} shape makes that
 * failure mode structurally impossible, since there's nothing to
 * misalign: each row is one self-contained object. See
 * PHASE6B-BLOCK-GAP-ANALYSIS.md §6.
 */
export const ComparisonTableBlock: Block = {
  slug: "comparisonTable",
  labels: { singular: "Comparison Table", plural: "Comparison Table Blocks" },
  fields: [
    {
      name: "isVisible",
      type: "checkbox",
      defaultValue: true,
      admin: { description: "Uncheck to hide this section without deleting it." },
    },
    { name: "eyebrow", type: "text" },
    { name: "h2", type: "text" },
    { name: "leftColumnLabel", type: "text", defaultValue: "Us" },
    { name: "rightColumnLabel", type: "text", defaultValue: "Everyone else" },
    {
      name: "rows",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "Row", plural: "Rows" },
      fields: [
        { name: "label", type: "text", required: true, admin: { description: 'e.g. "Response time".' } },
        { name: "leftValue", type: "text", required: true },
        { name: "rightValue", type: "text", required: true },
      ],
    },
  ],
};
