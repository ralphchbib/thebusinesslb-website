import type { Block } from "payload";

// Block slug is deliberately distinct from the Case Studies collection's
// own slug ("case-studies") — see the identical note in
// payload/blocks/Testimonials.ts for why this matters (a real GraphQL
// schema build failure, confirmed live, not assumed).
export const CaseStudiesBlock: Block = {
  slug: "caseStudiesBlock",
  labels: { singular: "Case Studies", plural: "Case Studies Blocks" },
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
      name: "caseStudies",
      type: "relationship",
      relationTo: "case-studies",
      hasMany: true,
      admin: { description: "Leave empty to automatically show Featured case studies instead." },
    },
  ],
};
