import type { CollectionConfig } from "payload";
import { anyone, adminOrEditor, adminOnly } from "../access";

export const FAQs: CollectionConfig = {
  slug: "faqs",
  labels: { singular: "FAQ", plural: "FAQs" },
  admin: {
    useAsTitle: "question",
    defaultColumns: ["question", "scope", "service", "order"],
  },
  access: {
    read: anyone,
    create: adminOrEditor,
    update: adminOrEditor,
    delete: adminOnly,
  },
  fields: [
    { name: "question", type: "text", required: true },
    { name: "answer", type: "textarea", required: true },
    {
      name: "scope",
      type: "select",
      required: true,
      admin: {
        description:
          '"pricing" is shared by both /services/ and /pricing/ — matches current site behavior.',
      },
      options: [
        { label: "Global (homepage)", value: "global" },
        { label: "Service page", value: "service" },
        { label: "Assessment page", value: "assessment" },
        { label: "Contact page", value: "contact" },
        { label: "Pricing / Services hub", value: "pricing" },
      ],
    },
    {
      name: "service",
      type: "relationship",
      relationTo: "services",
      admin: {
        condition: (_, siblingData) => siblingData?.scope === "service",
        description: "Required when scope is Service page.",
      },
    },
    { name: "order", type: "number", defaultValue: 0 },
    { name: "isPublished", type: "checkbox", defaultValue: true },
  ],
};
