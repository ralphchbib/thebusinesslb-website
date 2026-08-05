import type { Block } from "payload";

export const CtaBlock: Block = {
  slug: "cta",
  labels: { singular: "Call to Action", plural: "Calls to Action" },
  fields: [
    {
      name: "isVisible",
      type: "checkbox",
      defaultValue: true,
      admin: { description: "Uncheck to hide this section without deleting it." },
    },
    { name: "h2", type: "text", required: true },
    { name: "body", type: "textarea" },
    { name: "buttonLabel", type: "text", required: true },
    { name: "buttonHref", type: "text", required: true },
    {
      name: "surface",
      type: "select",
      defaultValue: "white",
      options: [
        { label: "White", value: "white" },
        { label: "Mist", value: "mist" },
        { label: "Veil", value: "veil" },
        { label: "Ink", value: "ink" },
      ],
    },
  ],
};
