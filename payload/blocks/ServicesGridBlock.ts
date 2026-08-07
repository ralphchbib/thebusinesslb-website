import type { Block } from "payload";

// Block slug is deliberately distinct from the Services collection's own
// slug ("services") — same GraphQL-collision reasoning as
// payload/blocks/Testimonials.ts, payload/blocks/CaseStudies.ts, and
// payload/blocks/FaqPageBlock.ts.
export const ServicesGridBlock: Block = {
  slug: "servicesGridBlock",
  labels: { singular: "Services Grid", plural: "Services Grid Blocks" },
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
      name: "services",
      type: "relationship",
      relationTo: "services",
      hasMany: true,
      admin: { description: "Leave empty to automatically show all published services instead." },
    },
  ],
};
