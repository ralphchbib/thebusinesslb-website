import type { Block } from "payload";

// Block slug is deliberately distinct from the Testimonials collection's
// own slug ("testimonials") — sharing it caused Payload's GraphQL schema
// build to fail outright ("Schema must contain uniquely named types but
// contains multiple types named 'Testimonials'"), since Payload derives a
// GraphQL type name from both a collection's slug and a block's slug, and
// the two collided. Confirmed via a live 500 on /api/graphql before this
// fix, not assumed.
export const TestimonialsBlock: Block = {
  slug: "testimonialsBlock",
  labels: { singular: "Testimonials", plural: "Testimonials Blocks" },
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
      name: "testimonials",
      type: "relationship",
      relationTo: "testimonials",
      hasMany: true,
      admin: { description: "Leave empty to automatically show Featured testimonials instead." },
    },
  ],
};
