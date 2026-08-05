import type { Block } from "payload";

export const TextBlock: Block = {
  slug: "text",
  labels: { singular: "Text", plural: "Text Blocks" },
  fields: [
    {
      name: "isVisible",
      type: "checkbox",
      defaultValue: true,
      admin: { description: "Uncheck to hide this section without deleting it." },
    },
    { name: "eyebrow", type: "text" },
    { name: "h2", type: "text" },
    { name: "body", type: "textarea", required: true },
  ],
};
