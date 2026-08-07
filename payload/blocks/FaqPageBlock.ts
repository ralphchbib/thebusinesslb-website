import type { Block } from "payload";

// Block slug is deliberately distinct from the FAQs collection's own
// slug ("faqs") — same reasoning as payload/blocks/Testimonials.ts and
// payload/blocks/CaseStudies.ts: a block slug colliding with a
// collection slug caused a real, live GraphQL schema-build failure in
// this project ("Schema must contain uniquely named types"), confirmed
// via a live 500 on /api/graphql, not assumed.
export const FaqPageBlock: Block = {
  slug: "faqBlock",
  labels: { singular: "FAQ", plural: "FAQ Blocks" },
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
      name: "faqs",
      type: "relationship",
      relationTo: "faqs",
      hasMany: true,
      admin: {
        description:
          "Pick specific FAQ entries for this page. Unlike Services/Testimonials, this doesn't fall " +
          "back to a scope — Pages isn't one of the FAQs collection's existing scopes, so nothing shows " +
          "here until entries are explicitly picked.",
      },
    },
    {
      name: "surface",
      type: "select",
      defaultValue: "white",
      options: [
        { label: "White", value: "white" },
        { label: "Mist", value: "mist" },
      ],
    },
  ],
};
