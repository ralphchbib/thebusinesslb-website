import type { Block } from "payload";

export const HeroBlock: Block = {
  slug: "hero",
  labels: { singular: "Hero", plural: "Heroes" },
  fields: [
    {
      name: "isVisible",
      type: "checkbox",
      defaultValue: true,
      admin: { description: "Uncheck to hide this section without deleting it." },
    },
    { name: "eyebrow", type: "text" },
    { name: "h1", type: "text", required: true },
    { name: "sub", type: "textarea" },
    { name: "ctaPrimaryLabel", type: "text" },
    {
      name: "ctaPrimaryHref",
      type: "text",
      admin: { description: "Internal path (e.g. /digital-assessment/) or full URL." },
    },
    { name: "ctaSecondaryLabel", type: "text" },
    { name: "ctaSecondaryHref", type: "text" },
    { name: "reassurance", type: "text" },
  ],
};
