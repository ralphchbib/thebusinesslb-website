import type { Block } from "payload";

/**
 * Phase 6A — "Rich Text Block." A real `richText` field
 * (@payloadcms/richtext-lexical) was spiked and ruled out: it still
 * triggers the exact ERR_REQUIRE_ASYNC_MODULE crash documented in
 * CMS-IMPACT-REPORT.md §6 under the current Payload/Node versions,
 * confirmed live during this phase's research — and since
 * payload.config.ts is imported by every Local API script this project's
 * migration/validation workflow depends on, that crash would break Local
 * API booting project-wide, not just for Pages. See
 * PHASE6A-PAGE-BUILDER-PLAN.md §2.
 *
 * Instead, reuses the exact structured-content pattern already proven
 * and shipping for Article bodies (Articles.ts's `body` array field):
 * a repeatable array of typed paragraph/heading/list entries. Delivers
 * genuine multi-paragraph, multi-heading authoring without the
 * crash-inducing dependency.
 */
export const RichContentBlock: Block = {
  slug: "richContent",
  labels: { singular: "Rich Content", plural: "Rich Content Blocks" },
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
      name: "content",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "Block", plural: "Blocks" },
      fields: [
        {
          name: "blockType",
          type: "select",
          required: true,
          defaultValue: "paragraph",
          options: [
            { label: "Paragraph", value: "paragraph" },
            { label: "Heading", value: "heading" },
            { label: "Bulleted list", value: "list" },
          ],
        },
        {
          name: "text",
          type: "textarea",
          admin: {
            condition: (_, siblingData) => siblingData?.blockType !== "list",
          },
        },
        {
          name: "items",
          type: "array",
          admin: {
            condition: (_, siblingData) => siblingData?.blockType === "list",
          },
          fields: [{ name: "text", type: "text", required: true }],
        },
      ],
    },
  ],
};
